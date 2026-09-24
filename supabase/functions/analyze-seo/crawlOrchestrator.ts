import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { DOMParserWrapper } from "./parser.ts";
import { RenderingManager } from "./renderingManager.ts";
import { FeatureExtractionEngine, ExtractionContext } from "./featureExtraction.ts";
import { PerformanceManager } from "./performanceManager.ts";
import { QueueScheduler } from "./queueScheduler.ts";
import { validateUrlSafe, getRandomUserAgent } from "./securityGateway.ts";
import { CrawlDecisionEngine } from "./crawlDecision.ts";
import { computeQualityScores } from "../../../src/lib/normalization.ts";

export class CrawlOrchestrator {
  private supabase;
  private renderer;
  private featureExtractor;
  private perfManager;
  private queueScheduler;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.renderer = new RenderingManager();
    this.featureExtractor = new FeatureExtractionEngine();
    this.perfManager = new PerformanceManager();
    this.queueScheduler = new QueueScheduler(supabaseUrl, supabaseKey);
  }

  private mapFeaturesToParsedPage(features: any, context: any, isClientRendered: boolean, renderNote: string | null, rawHtmlLength: number): any {
    return {
      url: features.url,
      finalUrl: features.finalUrl,
      title: features.metadata.title,
      metaDescription: features.metadata.metaDescription,
      metaKeywords: features.metadata.metaKeywords,
      canonical: features.metadata.canonical,
      ogTags: features.metadata.ogTags,
      twitterTags: features.metadata.twitterTags,
      robots: features.metadata.robots,
      viewport: features.metadata.viewport,
      charset: features.metadata.charset,
      lang: features.metadata.lang,
      headings: features.headings.list,
      paragraphs: features.paragraphs.list,
      images: features.images.list,
      links: features.links.counts,
      bodyText: features.paragraphs.bodyText,
      visibleText: features.paragraphs.visibleText,
      wordCount: features.paragraphs.wordCount,
      rawHtmlLength,
      statusCode: context.statusCode,
      contentType: context.contentType,
      error: null,
      isClientRendered,
      renderNote,
      responseTimeMs: context.responseTimeMs,
      loadTimeMs: context.loadTimeMs,
      robotsTxtExists: context.robotsTxtExists,
      robotsTxtContent: context.robotsTxtContent,
      sitemapExists: context.sitemapExists,
      sitemapUrl: context.sitemapUrl,
      redirectChain: context.redirectChain,
      securityHeaders: features.security,
      performance: features.performance,
      schemaMarkup: features.schemaMarkup,
    };
  }

  /**
   * Helper: checks robots.txt and extracts sitemap details.
   */
  async checkRobotsAndSitemap(baseUrl: string): Promise<{
    robotsTxtExists: boolean;
    robotsTxtContent: string | null;
    sitemapExists: boolean;
    sitemapUrl: string | null;
  }> {
    try {
      const domainUrl = new URL("/", baseUrl);
      const robotsUrl = new URL("/robots.txt", domainUrl.href).href;
      const sitemapUrl = new URL("/sitemap.xml", domainUrl.href).href;

      let robotsTxtExists = false;
      let robotsTxtContent: string | null = null;
      let sitemapExists = false;
      let detectedSitemapUrl: string | null = null;

      // 1. Fetch robots.txt
      const safeRobots = await validateUrlSafe(robotsUrl);
      if (safeRobots.safe) {
        try {
          const res = await fetch(robotsUrl, {
            headers: { "User-Agent": getRandomUserAgent() },
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            robotsTxtExists = true;
            robotsTxtContent = await res.text();

            const sitemapMatch = robotsTxtContent.match(/^sitemap:\s*(https?:\/\/[^\s]+)/mi);
            if (sitemapMatch) {
              detectedSitemapUrl = sitemapMatch[1].trim();
            }
          }
        } catch (e) {
          console.warn("[CrawlOrchestrator] Failed to check robots.txt:", e);
        }
      }

      // 2. Fetch sitemap.xml
      const targetSitemap = detectedSitemapUrl || sitemapUrl;
      const safeSitemap = await validateUrlSafe(targetSitemap);
      if (safeSitemap.safe) {
        try {
          const res = await fetch(targetSitemap, {
            headers: { "User-Agent": getRandomUserAgent() },
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            sitemapExists = true;
            detectedSitemapUrl = targetSitemap;
          }
        } catch (e) {
          console.warn("[CrawlOrchestrator] Failed to check sitemap:", e);
        }
      }

      return {
        robotsTxtExists,
        robotsTxtContent,
        sitemapExists,
        sitemapUrl: sitemapExists ? targetSitemap : (robotsTxtExists ? detectedSitemapUrl : null),
      };
    } catch {
      return {
        robotsTxtExists: false,
        robotsTxtContent: null,
        sitemapExists: false,
        sitemapUrl: null,
      };
    }
  }

  async checkSecurityTxt(baseUrl: string): Promise<boolean> {
    try {
      const domainUrl = new URL("/", baseUrl).href;
      const wellKnownUrl = new URL(".well-known/security.txt", domainUrl).href;
      const rootUrl = new URL("security.txt", domainUrl).href;

      const safeWellKnown = await validateUrlSafe(wellKnownUrl);
      if (safeWellKnown.safe) {
        const res = await fetch(wellKnownUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) }).catch(() => null);
        if (res && res.ok) return true;
      }

      const safeRoot = await validateUrlSafe(rootUrl);
      if (safeRoot.safe) {
        const res = await fetch(rootUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) }).catch(() => null);
        if (res && res.ok) return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  async traceRedirects(url: string, maxRedirects = 5): Promise<string[]> {
    const chain: string[] = [url];
    let currentUrl = url;

    for (let i = 0; i < maxRedirects; i++) {
      try {
        const safe = await validateUrlSafe(currentUrl);
        if (!safe.safe) break;

        const res = await fetch(currentUrl, {
          method: "HEAD",
          redirect: "manual",
          headers: { "User-Agent": getRandomUserAgent() },
          signal: AbortSignal.timeout(3000),
        });

        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location");
          if (loc) {
            const resolved = new URL(loc, currentUrl).href;
            if (!chain.includes(resolved)) {
              chain.push(resolved);
              currentUrl = resolved;
              continue;
            }
          }
        }
      } catch {
        // ignore
      }
      break;
    }
    return chain;
  }

  /**
   * Main multi-page background crawler loop (chunked batch execution)
   */
  async runSiteWideCrawl(jobId: string, startUrl: string) {
    const parsedStart = new URL(startUrl);
    const baseDomain = parsedStart.hostname.replace(/^www\./, "");

    // Fetch current job details to support seamless resumption / continuation
    const { data: currentJob } = await this.supabase
      .from("crawl_jobs")
      .select("crawled_pages, total_word_count, status")
      .eq("id", jobId)
      .single();

    if (currentJob?.status === "cancelled" || currentJob?.status === "paused") {
      console.log(`[CrawlOrchestrator ${jobId}] Job status is '${currentJob.status}'. Stopping crawler.`);
      return;
    }

    // Mark job status as 'crawling'
    await this.supabase
      .from("crawl_jobs")
      .update({ status: "crawling" })
      .eq("id", jobId);

    // Initialize queue with starting URL
    await this.supabase
      .from("queued_urls")
      .upsert(
        { job_id: jobId, url: startUrl, status: "pending" },
        { onConflict: "job_id,url", ignoreDuplicates: true }
      );

    // Reset any stale tasks left in 'processing' state from previous edge function terminations
    await this.queueScheduler.resetStuckTasks(jobId);

    // Cache domain-wide metadata once per site crawl instead of fetching 5 times per page
    const [domainRobotsSitemap, domainSecurityTxt] = await Promise.all([
      this.checkRobotsAndSitemap(startUrl),
      this.checkSecurityTxt(startUrl),
    ]);

    let crawledCount = currentJob?.crawled_pages || 0;
    let totalWords = currentJob?.total_word_count || 0;
    const MAX_SITE_PAGES = 250;

    // Time-bounded batch budget: max 110s execution per function call to allow 50+ pages per invocation
    const startTime = Date.now();
    const maxDurationMs = 110000;

    while (crawledCount < MAX_SITE_PAGES && (Date.now() - startTime) < maxDurationMs) {
      const task = await this.queueScheduler.nextPending(jobId);
      if (!task) break;

      const claimed = await this.queueScheduler.startProcessing(task.id);
      if (!claimed) continue;

      try {
        console.log(`[CrawlOrchestrator ${jobId}] Processing URL (${crawledCount + 1}): ${task.url}`);

        // 1. Try fast static HTTP rendering first
        let renderRes = await this.renderer.render(task.url, { usePlaywright: false });

        // 2. Evaluate client rendering & initial extraction
        let decision = CrawlDecisionEngine.evaluate(renderRes.html);
        let document = DOMParserWrapper.parse(renderRes.html);

        // Trace redirects
        const redirectChain = await this.traceRedirects(task.url);

        // Compile initial context using cached domain metadata
        let context: ExtractionContext = {
          url: task.url,
          finalUrl: renderRes.finalUrl,
          statusCode: renderRes.statusCode,
          contentType: renderRes.contentType,
          headers: renderRes.headers,
          responseTimeMs: renderRes.responseTimeMs,
          loadTimeMs: renderRes.loadTimeMs,
          certificateValid: renderRes.certificateValid,
          certificateError: renderRes.certificateError,
          setCookieHeader: renderRes.setCookieHeader,
          hasSecurityTxt: domainSecurityTxt,
          robotsTxtExists: domainRobotsSitemap.robotsTxtExists,
          robotsTxtContent: domainRobotsSitemap.robotsTxtContent,
          sitemapExists: domainRobotsSitemap.sitemapExists,
          sitemapUrl: domainRobotsSitemap.sitemapUrl,
          redirectChain,
          psiMetrics: null,
        };

        // Extract initial features
        let features = this.featureExtractor.extract(document, context);

        // 3. Fallback to browser rendering if page is client-rendered OR static HTML produced fewer than 2 internal links
        if ((decision.isClientRendered || features.links.list.length < 2) && renderRes.certificateValid !== false) {
          try {
            console.log(`[CrawlOrchestrator ${jobId}] JS rendering required/few links found (${features.links.list.length}) for ${task.url}. Triggering browser rendering...`);
            const browserRes = await this.renderer.render(task.url, { usePlaywright: true });
            if (browserRes.html && browserRes.html.length > 50) {
              renderRes = browserRes;
              decision = CrawlDecisionEngine.evaluate(renderRes.html);
              context.finalUrl = renderRes.finalUrl;
              context.statusCode = renderRes.statusCode;
              context.responseTimeMs = renderRes.responseTimeMs;
              context.loadTimeMs = renderRes.loadTimeMs;
              document = DOMParserWrapper.parse(renderRes.html);
              features = this.featureExtractor.extract(document, context);
            }
          } catch (e) {
            console.warn(`[CrawlOrchestrator ${jobId}] Browser fallback failed for ${task.url}, using static HTML features:`, e);
          }
        }

        // Performance Provider
        const resolvedPerf = await this.perfManager.resolveMetrics(task.url, {
          responseTimeMs: renderRes.responseTimeMs,
          loadTimeMs: renderRes.loadTimeMs,
        });
        features.performance = resolvedPerf;

        const parsedPage = this.mapFeaturesToParsedPage(
          features,
          context,
          decision.isClientRendered,
          decision.note,
          renderRes.html.length
        );

        // Quality scores
        const scores = computeQualityScores(parsedPage);

        // 4. Discover new internal links with comprehensive URL normalization
        const newUrls: string[] = [];
        const ignoredExtensions = /\.(png|jpe?g|gif|svg|ico|webp|pdf|zip|rar|tar|gz|mp4|mp3|avi|css|js|woff2?|ttf|eot)$/i;

        for (const link of features.links.list) {
          try {
            if (!link.href || link.href.startsWith("#") || link.href.startsWith("javascript:") || link.href.startsWith("mailto:") || link.href.startsWith("tel:")) {
              continue;
            }
            const resolved = new URL(link.href, renderRes.finalUrl);
            if (resolved.hostname.replace(/^www\./, "") === baseDomain) {
              resolved.hash = "";

              // Clean tracking query params while preserving functional query parameters (e.g. ?page=2, ?cat=shoes)
              let search = resolved.search || "";
              if (search) {
                const searchParams = new URLSearchParams(search);
                searchParams.delete("utm_source");
                searchParams.delete("utm_medium");
                searchParams.delete("utm_campaign");
                searchParams.delete("utm_term");
                searchParams.delete("utm_content");
                searchParams.delete("fbclid");
                searchParams.delete("gclid");
                const str = searchParams.toString();
                search = str ? `?${str}` : "";
              }

              // Strip trailing slash except for root path '/'
              let pathname = resolved.pathname;
              if (pathname.length > 1 && pathname.endsWith("/")) {
                pathname = pathname.slice(0, -1);
              }

              const cleanedUrl = `${parsedStart.origin}${pathname}${search}`;
              if (!ignoredExtensions.test(pathname)) {
                newUrls.push(cleanedUrl);
              }
            }
          } catch {
            // ignore
          }
        }

        // Deduplicate URLs before enqueuing to prevent Postgres ON CONFLICT cardinality error
        const uniqueUrls = Array.from(new Set(newUrls));
        if (uniqueUrls.length > 0) {
          await this.queueScheduler.enqueueUrls(jobId, uniqueUrls);
        }

        // 5. Save crawl result
        await this.supabase
          .from("crawl_results")
          .insert({
            job_id: jobId,
            url: task.url,
            word_count: features.paragraphs.wordCount,
            seo_score: scores.seo_score,
            performance_score: scores.performance_score,
            accessibility_score: scores.accessibility_score,
            security_score: scores.security_score,
            content_score: scores.content_score,
            audit_data: parsedPage,
          });

        await this.queueScheduler.completeTask(task.id);
        crawledCount++;
        totalWords += features.paragraphs.wordCount;

        // Update stats in crawl_jobs
        const { count: totalFound } = await this.supabase
          .from("queued_urls")
          .select("*", { count: "exact", head: true })
          .eq("job_id", jobId);

        await this.supabase
          .from("crawl_jobs")
          .update({
            crawled_pages: crawledCount,
            total_pages: totalFound || crawledCount,
            total_word_count: totalWords,
          })
          .eq("id", jobId);

        // Short polite delay
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[CrawlOrchestrator] Error processing ${task.url}:`, err);
        await this.queueScheduler.failTask(task.id, err instanceof Error ? err.message : String(err));
        crawledCount++; // Increment processed count so failed URLs don't stall the job stats
      }
    }

    // Check if remaining pending/processing items exist and max pages not reached
    const remainingCount = await this.queueScheduler.countRemaining(jobId);

    if (remainingCount > 0 && crawledCount < MAX_SITE_PAGES) {
      console.log(`[CrawlOrchestrator ${jobId}] Batch finished. ${remainingCount} URLs remaining. Triggering continuation chunk...`);
      try {
        // @ts-ignore
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        // @ts-ignore
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && serviceKey) {
          const edgeFunctionUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/analyze-seo`;
          const contPromise = fetch(edgeFunctionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ url: startUrl, siteWide: true, jobId }),
          }).catch(err => console.warn(`[CrawlOrchestrator] Continuation trigger error:`, err));

          // @ts-ignore
          if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
            // @ts-ignore
            EdgeRuntime.waitUntil(contPromise);
          } else {
            await contPromise;
          }
        }
      } catch (err) {
        console.warn(`[CrawlOrchestrator] Failed to schedule continuation:`, err);
      }
    } else {
      const { count: resultCount } = await this.supabase
        .from("crawl_results")
        .select("*", { count: "exact", head: true })
        .eq("job_id", jobId);

      const finalStatus = (resultCount && resultCount > 0) ? "completed" : "failed";
      console.log(`[CrawlOrchestrator ${jobId}] Crawl completed with status '${finalStatus}'! Total pages crawled: ${crawledCount}`);
      await this.supabase
        .from("crawl_jobs")
        .update({ status: finalStatus, crawled_pages: crawledCount })
        .eq("id", jobId);
    }
  }
}
