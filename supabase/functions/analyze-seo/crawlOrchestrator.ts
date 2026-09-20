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
   * Main multi-page background crawler loop
   */
  async runSiteWideCrawl(jobId: string, startUrl: string) {
    const parsedStart = new URL(startUrl);
    const baseDomain = parsedStart.hostname.replace(/^www\./, "");

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

    let crawledCount = 0;
    let totalWords = 0;
    const maxPages = 50;

    while (crawledCount < maxPages) {
      const task = await this.queueScheduler.nextPending(jobId);
      if (!task) break;

      await this.queueScheduler.startProcessing(task.id);

      try {
        console.log(`[CrawlOrchestrator ${jobId}] Processing URL: ${task.url}`);
        
        // 1. Fetch
        const renderRes = await this.renderer.render(task.url, { usePlaywright: true });

        // 2. Extra metadata fetches
        const [robotsSitemap, redirectChain, hasSecurityTxt] = await Promise.all([
          this.checkRobotsAndSitemap(renderRes.finalUrl),
          this.traceRedirects(task.url),
          this.checkSecurityTxt(renderRes.finalUrl),
        ]);

        const document = DOMParserWrapper.parse(renderRes.html);

        // 3. Compile context
        const context: ExtractionContext = {
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
          hasSecurityTxt,
          robotsTxtExists: robotsSitemap.robotsTxtExists,
          robotsTxtContent: robotsSitemap.robotsTxtContent,
          sitemapExists: robotsSitemap.sitemapExists,
          sitemapUrl: robotsSitemap.sitemapUrl,
          redirectChain,
          psiMetrics: null,
        };

        // 4. Extract UFM
        const features = this.featureExtractor.extract(document, context);

        // 5. Performance Provider
        const resolvedPerf = await this.perfManager.resolveMetrics(task.url, {
          responseTimeMs: renderRes.responseTimeMs,
          loadTimeMs: renderRes.loadTimeMs,
        });
        features.performance = resolvedPerf;

        const decision = CrawlDecisionEngine.evaluate(renderRes.html);
        const parsedPage = this.mapFeaturesToParsedPage(
          features,
          context,
          decision.isClientRendered,
          decision.note,
          renderRes.html.length
        );

        // Run full, authoritative quality scoring engine on the crawl result page
        const scores = computeQualityScores(parsedPage);
        const seoScore = scores.seo_score;
        const perfScore = scores.performance_score; // can be NULL
        const accScore = scores.accessibility_score;
        const secScore = scores.security_score;
        const contentScore = scores.content_score;

        // 6. Discover links and enqueue
        const newUrls: string[] = [];
        for (const link of features.links.list) {
          try {
            const resolved = new URL(link.href, renderRes.finalUrl);
            if (resolved.hostname.replace(/^www\./, "") === baseDomain) {
              const cleanedUrl = resolved.origin + resolved.pathname; // strip query params & anchors
              newUrls.push(cleanedUrl);
            }
          } catch {
            // ignore
          }
        }

        if (newUrls.length > 0) {
          await this.queueScheduler.enqueueUrls(jobId, newUrls);
        }

        // 7. Save crawl results entry
        await this.supabase
          .from("crawl_results")
          .insert({
            job_id: jobId,
            url: task.url,
            word_count: features.paragraphs.wordCount,
            seo_score: seoScore,
            performance_score: perfScore,
            accessibility_score: accScore,
            security_score: secScore,
            content_score: contentScore,
            audit_data: parsedPage,
          });

        await this.queueScheduler.completeTask(task.id);
        crawledCount++;
        totalWords += features.paragraphs.wordCount;

        // Update stats
        const { data: totalFound } = await this.supabase
          .from("queued_urls")
          .select("id", { count: "exact" })
          .eq("job_id", jobId);

        await this.supabase
          .from("crawl_jobs")
          .update({
            crawled_pages: crawledCount,
            total_pages: totalFound?.length || crawledCount,
            total_word_count: totalWords,
          })
          .eq("id", jobId);

        // Polite crawl delay
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`[CrawlOrchestrator] Error processing ${task.url}:`, err);
        await this.queueScheduler.failTask(task.id, err instanceof Error ? err.message : String(err));
      }
    }

    // Mark job as completed/processed
    await this.supabase
      .from("crawl_jobs")
      .update({ status: "completed" })
      .eq("id", jobId);
  }
}
