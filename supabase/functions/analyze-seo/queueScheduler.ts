import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

export interface QueueItem {
  id: string;
  jobId: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export class QueueScheduler {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Fetches the next pending URL from the queue.
   */
  async nextPending(jobId: string): Promise<QueueItem | null> {
    // Verify crawl job is not cancelled or paused
    const { data: job } = await this.supabase
      .from("crawl_jobs")
      .select("status")
      .eq("id", jobId)
      .single();

    if (!job || job.status === "cancelled" || job.status === "paused") {
      return null;
    }

    const { data, error } = await this.supabase
      .from("queued_urls")
      .select("id, job_id, url, status")
      .eq("job_id", jobId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      jobId: data.job_id,
      url: data.url,
      status: data.status,
    };
  }

  /**
   * Mark a URL task as active/processing.
   */
  async startProcessing(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("queued_urls")
      .update({ status: "processing" })
      .eq("id", id);
    return !error;
  }

  /**
   * Mark a URL task as completed.
   */
  async completeTask(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("queued_urls")
      .update({ status: "completed" })
      .eq("id", id);
    return !error;
  }

  /**
   * Push broken/exhausted tasks to the Dead Letter Queue state.
   */
  async failTask(id: string, reason: string): Promise<boolean> {
    console.warn(`[QueueScheduler] Task ${id} failed. Reason: ${reason}`);
    const { error } = await this.supabase
      .from("queued_urls")
      .update({ status: "failed" })
      .eq("id", id);
    return !error;
  }

  /**
   * Add a batch of discovered URLs to the queue, ignoring duplicates.
   */
  async enqueueUrls(jobId: string, urls: string[]): Promise<void> {
    if (urls.length === 0) return;
    const payload = urls.map(u => ({ job_id: jobId, url: u, status: "pending" }));
    await this.supabase
      .from("queued_urls")
      .upsert(
        payload,
        { onConflict: "job_id,url", ignoreDuplicates: true }
      );
  }
}
