import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { isRateLimited, normalizeUrl, validateUrlSafe } from "./securityGateway.ts";
import { CrawlDecisionEngine } from "./crawlDecision.ts";
import { RenderingManager } from "./renderingManager.ts";
import { DOMParserWrapper } from "./parser.ts";
import { FeatureExtractionEngine, ExtractionContext, UnifiedFeatureModel } from "./featureExtraction.ts";
import { PerformanceManager } from "./performanceManager.ts";
import { CrawlOrchestrator } from "./crawlOrchestrator.ts";
import { ParsedPage, AnalyzeRequest } from "./types.ts";
import { KeywordAnalyzer } from "./keywordAnalyzer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const renderer = new RenderingManager();
const featureExtractor = new FeatureExtractionEngine();
const perfManager = new PerformanceManager();

function mapFeaturesToParsedPage(features: UnifiedFeatureModel, context: ExtractionContext & { isClientRendered: boolean; renderNote: string | null; rawHtmlLength: number }): ParsedPage {
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
    rawHtmlLength: context.rawHtmlLength,
    statusCode: context.statusCode,
    contentType: context.contentType,
    error: null,
    isClientRendered: context.isClientRendered,
    renderNote: context.renderNote,
    responseTimeMs: context.responseTimeMs,
    loadTimeMs: context.loadTimeMs,
    robotsTxtExists: context.robotsTxtExists,
    robotsTxtContent: context.robotsTxtContent,
    sitemapExists: context.sitemapExists,
    sitemapUrl: context.sitemapUrl,
    hasJsonLd: features.schema.hasJsonLd,
    hasMicrodata: features.schema.hasMicrodata,
    hreflangTags: features.metadata.hreflangTags,
    redirectChain: context.redirectChain,
    securityHeaders: {
      hasCsp: features.security.hasCsp,
      hasHsts: features.security.hasHsts,
      hasXFrame: features.security.hasXFrame,
      hasXContentType: features.security.hasXContentType,
      cspHeader: features.security.cspHeader,
      hstsHeader: features.security.hstsHeader,
      xFrameHeader: features.security.xFrameHeader,
      xContentTypeHeader: features.security.xContentTypeHeader,
    },
    accessibilityFlags: {
      hasLang: features.metadata.lang !== null && features.metadata.lang.trim().length > 0,
      langValue: features.metadata.lang,
      hasHeadingSequenceViolation: features.headings.hasHeadingSequenceViolation,
      imagesMissingAltCount: features.images.imagesMissingAltCount,
      totalImagesCount: features.images.totalImagesCount,
      missingFormLabelsCount: features.accessibility.missingFormLabelsCount,
      emptyButtonsCount: features.accessibility.emptyButtonsCount,
      emptyLinksCount: features.accessibility.emptyLinksCount,
      zoomDisabled: features.accessibility.zoomDisabled,
      iframeMissingTitle: features.accessibility.iframeMissingTitle,
      nonSemanticLandmarks: features.navigation.nonSemanticLandmarks,
    },
    securityDetails: {
      referrerPolicy: features.security.referrerPolicy,
      permissionsPolicy: features.security.permissionsPolicy,
      hasSecurityTxt: features.security.hasSecurityTxt,
      hasMixedContent: features.security.hasMixedContent,
      mixedContentUrls: features.security.mixedContentUrls,
      hasDirectoryListing: features.security.hasDirectoryListing,
      sriScore: features.security.sriScore,
      sriMissingUrls: features.security.sriMissingUrls,
      certificateValid: context.certificateValid,
      certificateError: context.certificateError,
      cookies: features.security.cookies,
    },
    performanceDetails: features.performance,
  };
}

// -------------------------------------------------------------
// Deno Edge HTTP serve coordinator
// -------------------------------------------------------------
// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const clientIp = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown-client";

  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many crawl requests from this IP. Please wait a minute before trying again." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const urlObj = new URL(req.url);
  if (urlObj.pathname.endsWith("/analyze-keyword")) {
    try {
      const body = await req.json();
      const { jobId } = body;

      if (!jobId) {
        return new Response(
          JSON.stringify({ error: "jobId is required." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // @ts-ignore
      const analyzer = new KeywordAnalyzer(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // @ts-ignore
      EdgeRuntime.waitUntil(analyzer.runAnalysis(jobId));

      return new Response(
        JSON.stringify({
          success: true,
          message: "Keyword analysis execution enqueued in background.",
          jobId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  try {
    const body = await req.json() as AnalyzeRequest;
    const { url: rawUrl, siteWide, jobId } = body;

    if (!rawUrl || typeof rawUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = normalizeUrl(rawUrl);

    // Initial SSRF protection scan
    const safeCheck = await validateUrlSafe(url);
    if (!safeCheck.safe) {
      return new Response(
        JSON.stringify({ error: safeCheck.error || "Blocked URL (SSRF prevention)" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (siteWide) {
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: "jobId is required for site-wide crawls." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Instantiate orchestrator and queue background loop
      // @ts-ignore
      const orchestrator = new CrawlOrchestrator(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      // @ts-ignore
      EdgeRuntime.waitUntil(orchestrator.runSiteWideCrawl(jobId, url));

      return new Response(
        JSON.stringify({ message: "Site-wide crawl started successfully.", jobId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch static page first
    const renderRes = await renderer.render(url, { usePlaywright: false });

    // 2. Evaluate rendering confidence score
    const decision = CrawlDecisionEngine.evaluate(renderRes.html);

    // 3. Fallback to JS rendering provider if confidence is low
    let finalRenderRes = renderRes;
    if (decision.isClientRendered && renderRes.certificateValid !== false) {
      console.log(`[Entry] Low render confidence (${decision.confidenceScore}). Triggering browser fallback rendering...`);
      try {
        finalRenderRes = await renderer.render(url, { usePlaywright: true });
      } catch (err) {
        console.error(`[Entry] Browser fallback rendering failed:`, err);
      }
    }

    // 4. Instantiate Crawl Orchestrator client-helper context to run metadata checks
    // @ts-ignore
    const helperOrch = new CrawlOrchestrator(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [robotsSitemap, redirectChain, hasSecurityTxt, psiMetrics] = await Promise.all([
      helperOrch.checkRobotsAndSitemap(finalRenderRes.finalUrl),
      helperOrch.traceRedirects(url),
      helperOrch.checkSecurityTxt(finalRenderRes.finalUrl),
      // @ts-ignore
      perfManager.providers.find(p => p.id === "google-psi")!.getMetrics(url, { apiKey: Deno.env.get("PAGESPEED_API_KEY") || null }),
    ]);

    const document = DOMParserWrapper.parse(finalRenderRes.html);

    // 5. Build context
    const context: ExtractionContext = {
      url,
      finalUrl: finalRenderRes.finalUrl,
      statusCode: finalRenderRes.statusCode,
      contentType: finalRenderRes.contentType,
      headers: finalRenderRes.headers,
      responseTimeMs: finalRenderRes.responseTimeMs,
      loadTimeMs: finalRenderRes.loadTimeMs,
      certificateValid: finalRenderRes.certificateValid,
      certificateError: finalRenderRes.certificateError,
      setCookieHeader: finalRenderRes.setCookieHeader,
      hasSecurityTxt,
      robotsTxtExists: robotsSitemap.robotsTxtExists,
      robotsTxtContent: robotsSitemap.robotsTxtContent,
      sitemapExists: robotsSitemap.sitemapExists,
      sitemapUrl: robotsSitemap.sitemapUrl,
      redirectChain,
      psiMetrics: psiMetrics as any,
    };

    // 6. Extractor pipeline
    const features = featureExtractor.extract(document, context);

    // 7. Resolve performance providers timings
    const resolvedPerf = await perfManager.resolveMetrics(url, {
      responseTimeMs: finalRenderRes.responseTimeMs,
      loadTimeMs: finalRenderRes.loadTimeMs,
      browserTimings: null,
      // @ts-ignore
      apiKey: Deno.env.get("PAGESPEED_API_KEY") || null,
      psiMetrics,
    });
    features.performance = resolvedPerf;

    // 8. Map to legacy client contract payload format
    const parsedPage = mapFeaturesToParsedPage(features, {
      ...context,
      isClientRendered: decision.isClientRendered,
      renderNote: decision.note,
      rawHtmlLength: finalRenderRes.html.length,
    });

    return new Response(
      JSON.stringify(parsedPage),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
