import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { SerperDevProvider, NormalizedSERPItem } from "./serpProvider.ts";

export class KeywordAnalyzer {
  private supabase;
  private serpProvider;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.serpProvider = new SerperDevProvider();
  }

  // Normalize hostnames for clean matching
  private normalizeHostname(host: string): string {
    let normalized = host.toLowerCase().trim();
    // Strip protocol
    normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, "");
    // Strip trailing slashes/paths
    normalized = normalized.split("/")[0];
    return normalized;
  }

  async runAnalysis(jobId: string) {
    // 1. Fetch job and context details
    const { data: job, error: jobErr } = await this.supabase
      .from("keyword_analysis_jobs")
      .select("*, keyword_targets(*, projects(*))")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      console.error(`[KeywordAnalyzer] Failed to retrieve job ${jobId}:`, jobErr);
      return;
    }

    const target = job.keyword_targets;
    const project = target?.projects;

    if (!target || !project) {
      console.error(`[KeywordAnalyzer] Job ${jobId} missing target or project configuration.`);
      await this.supabase
        .from("keyword_analysis_jobs")
        .update({ status: "failed", error: "Missing configuration target metadata." })
        .eq("id", jobId);
      return;
    }

    // 2. Concurrency Duplicate protection check
    // Query duplicate active jobs within the last 15 minutes
    const { data: activeJobs, error: activeErr } = await this.supabase
      .from("keyword_analysis_jobs")
      .select("id, status")
      .eq("keyword_target_id", target.id)
      .in("status", ["pending", "processing"])
      .neq("id", jobId)
      .gt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

    if (activeErr) {
      console.error(`[KeywordAnalyzer] Error checking active jobs:`, activeErr);
    }

    if (activeJobs && activeJobs.length > 0) {
      console.log(`[KeywordAnalyzer] Duplicate active job found for target ${target.id}. Aborting current execution to prevent API credit exhaustion.`);
      await this.supabase
        .from("keyword_analysis_jobs")
        .update({ status: "failed", error: "DUPLICATE_RUN: A concurrent keyword check is already in progress." })
        .eq("id", jobId);
      return;
    }

    // 3. Mark job status as processing
    await this.supabase
      .from("keyword_analysis_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    try {
      console.log(`[KeywordAnalyzer] Fetching SERP for keyword "${target.keyword}" (${target.country}/${target.device})...`);

      // 4. Fetch real provider result data
      const serpItems: NormalizedSERPItem[] = await this.serpProvider.fetchSERP(
        target.keyword,
        target.country,
        target.location,
        target.language,
        target.device
      );

      // 5. Store SERP snapshot
      const { data: snapshot, error: snapshotErr } = await this.supabase
        .from("serp_snapshots")
        .insert({
          job_id: jobId,
          provider: this.serpProvider.id,
          search_engine: "google",
          result_depth: 100,
          raw_serp_payload: { items: serpItems },
        })
        .select()
        .single();

      if (snapshotErr || !snapshot) {
        throw new Error(`Failed to save SERP snapshot: ${snapshotErr?.message || "unknown insert error"}`);
      }

      // 6. Insert normalized results list
      if (serpItems.length > 0) {
        const resultsPayload = serpItems.map(item => ({
          snapshot_id: snapshot.id,
          position: item.position,
          url: item.url,
          domain: item.domain,
          title: item.title,
          snippet: item.snippet,
          result_type: item.resultType,
        }));

        const { error: resultsErr } = await this.supabase
          .from("serp_results")
          .insert(resultsPayload);

        if (resultsErr) {
          throw new Error(`Failed to save normalized SERP results: ${resultsErr.message}`);
        }
      }

      // 7. Perform deterministic domain matching
      const targetDomainClean = this.normalizeHostname(project.domain);
      let observedPosition: number | null = null;
      let relevantPageUrl: string | null = null;

      for (const item of serpItems) {
        const itemDomainClean = this.normalizeHostname(item.domain);
        if (itemDomainClean === targetDomainClean) {
          observedPosition = item.position;
          relevantPageUrl = item.url;
          break; // Found first matching occurrence in search ranking
        }
      }

      // 8. Store Ranking Observations details
      const rankingOpportunity = observedPosition !== null && observedPosition <= 10
        ? "Strong Opportunity"
        : observedPosition !== null && observedPosition <= 50
        ? "Moderate Opportunity"
        : observedPosition !== null
        ? "Limited Opportunity"
        : "Insufficient Data";

      const { error: obsErr } = await this.supabase
        .from("ranking_observations")
        .insert({
          job_id: jobId,
          observed_position: observedPosition,
          relevant_page_url: relevantPageUrl,
          search_intent: "Commercial", // Default classification in Milestone 2
          ranking_opportunity: rankingOpportunity,
          content_gaps: { note: "Content gap analysis not implemented in Milestone 2." },
          recommendations: { note: "AI recommendations not implemented in Milestone 2." },
        });

      if (obsErr) {
        throw new Error(`Failed to save ranking observation: ${obsErr.message}`);
      }

      // 9. Mark job completed
      await this.supabase
        .from("keyword_analysis_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      console.log(`[KeywordAnalyzer] Job ${jobId} completed successfully. Observed position: ${observedPosition}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[KeywordAnalyzer] Job ${jobId} failed:`, errorMsg);

      await this.supabase
        .from("keyword_analysis_jobs")
        .update({
          status: "failed",
          error: errorMsg,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }
  }
}
