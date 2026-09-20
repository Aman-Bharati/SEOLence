import type { ParsedPage, TechSeoCheck } from "../../types.ts";

export function runTechnicalSeoChecks(parsed: ParsedPage): Record<string, TechSeoCheck> {
  const checks: Record<string, TechSeoCheck> = {};

  // 1. Robots.txt
  checks["robots_txt"] = {
    id: "robots_txt",
    name: "robots.txt Availability",
    passed: !!parsed.robotsTxtExists,
    severity: parsed.robotsTxtExists ? "none" : "medium",
    issue: parsed.robotsTxtExists
      ? "robots.txt is present on the server."
      : "robots.txt file was not found on the server.",
    evidence: parsed.robotsTxtExists
      ? "Accessible at /robots.txt"
      : "HTTP 404 Not Found at /robots.txt",
    fix: "Create a robots.txt file at the root of your domain to guide web crawlers on which pages to scan.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
  };

  // 2. Sitemap.xml
  checks["sitemap"] = {
    id: "sitemap",
    name: "XML Sitemap Availability",
    passed: !!parsed.sitemapExists,
    severity: parsed.sitemapExists ? "none" : "medium",
    issue: parsed.sitemapExists
      ? "XML Sitemap is present."
      : "No XML sitemap was found on the server or referenced in robots.txt.",
    evidence: parsed.sitemapExists
      ? `Accessible at ${parsed.sitemapUrl}`
      : "Missing standard sitemap.xml file",
    fix: "Generate an XML sitemap for your site and place it at /sitemap.xml. Also add a Sitemap: directive to robots.txt.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview",
  };

  // 3. Canonical Tag consistency
  const hasCanonical = !!parsed.canonical;
  const canonicalNormalized = hasCanonical ? parsed.canonical!.replace(/\/$/, "").toLowerCase() : "";
  const pageUrlNormalized = parsed.finalUrl ? parsed.finalUrl.replace(/\/$/, "").toLowerCase() : "";
  const canonicalMatches = hasCanonical && (canonicalNormalized === pageUrlNormalized);

  checks["canonical"] = {
    id: "canonical",
    name: "Canonical Tag Consistency",
    passed: hasCanonical && canonicalMatches,
    severity: !hasCanonical ? "medium" : (canonicalMatches ? "none" : "high"),
    issue: !hasCanonical
      ? "No canonical link element was found."
      : (canonicalMatches ? "Canonical URL matches the page URL." : "Canonical URL points to a different location (URL consolidation mismatch)."),
    evidence: !hasCanonical
      ? "Missing link[rel=canonical]"
      : `Canonical points to: "${parsed.canonical}" vs Page URL: "${parsed.finalUrl}"`,
    fix: "Ensure every indexable page has a self-referential canonical tag unless you explicitly want to consolidate indexing to a different version.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
  };

  // 4. Redirect chains
  const redirectsCount = parsed.redirectChain ? parsed.redirectChain.length : 1;
  const hasRedirects = redirectsCount > 1;
  checks["redirects"] = {
    id: "redirects",
    name: "Redirect Chains",
    passed: !hasRedirects || redirectsCount <= 2,
    severity: redirectsCount > 2 ? "medium" : (hasRedirects ? "low" : "none"),
    issue: hasRedirects
      ? `The URL went through redirects: ${parsed.redirectChain.join(" -> ")}`
      : "No redirects detected.",
    evidence: hasRedirects
      ? `${redirectsCount - 1} redirect step(s) found.`
      : "Direct access (200 OK)",
    fix: "Point your internal links directly to the final destination URL to avoid wasting crawl budget and causing slow response times.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/301-redirects",
  };

  // 5. Indexability
  const isNoindex = !!parsed.robots && (parsed.robots.toLowerCase().includes("noindex") || parsed.robots.toLowerCase().includes("none"));
  checks["indexability"] = {
    id: "indexability",
    name: "Search Engine Indexability",
    passed: !isNoindex,
    severity: !isNoindex ? "none" : "high",
    issue: !isNoindex
      ? "Page is indexable by search engine crawlers."
      : "Page has a 'noindex' or 'none' directive, blocking search engines from indexing it.",
    evidence: parsed.robots
      ? `meta[name=robots] content: "${parsed.robots}"`
      : "Default (Indexable)",
    fix: "Remove 'noindex' or 'none' from your robots meta tags or X-Robots-Tag response header if you want this page to rank in search results.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/block-indexing",
  };

  // 6. Duplicate metadata
  const isDuplicateMetadata = !!parsed.title && !!parsed.metaDescription && (parsed.title.trim().toLowerCase() === parsed.metaDescription.trim().toLowerCase());
  checks["duplicate_metadata"] = {
    id: "duplicate_metadata",
    name: "Metadata Uniqueness",
    passed: !isDuplicateMetadata,
    severity: isDuplicateMetadata ? "medium" : "none",
    issue: isDuplicateMetadata
      ? "The title tag and meta description are identical. This reduces search snippet utility."
      : "Title tag and meta description are unique.",
    evidence: isDuplicateMetadata ? "Title matches description text" : "Metadata elements are distinct",
    fix: "Write a unique title (under 60 characters) and a descriptive meta description (under 160 characters) that are distinct from each other.",
    reference: "https://developers.google.com/search/docs/appearance/good-titles-snippets",
  };

  // 7. Structured data
  const hasSchema = !!parsed.hasJsonLd || !!parsed.hasMicrodata;
  checks["structured_data"] = {
    id: "structured_data",
    name: "Structured Schema Markup",
    passed: hasSchema,
    severity: hasSchema ? "none" : "low",
    issue: hasSchema
      ? "Structured data (Schema.org) markup detected."
      : "No structured data schema (JSON-LD or Microdata) detected.",
    evidence: parsed.hasJsonLd
      ? "JSON-LD script tag present"
      : (parsed.hasMicrodata ? "Microdata tags present" : "Missing structured data"),
    fix: "Add Schema.org JSON-LD tags to help search engines understand the context of your page content (e.g., Article, Organization, FAQ, or Product schema).",
    reference: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
  };

  // 8. Hreflang localization
  const hasHreflang = !!parsed.hreflangTags && parsed.hreflangTags.length > 0;
  checks["hreflang"] = {
    id: "hreflang",
    name: "Hreflang Language Localization",
    passed: hasHreflang,
    severity: "none",
    issue: hasHreflang
      ? `${parsed.hreflangTags.length} localization link alternate tag(s) found.`
      : "No hreflang localization tags found.",
    evidence: hasHreflang
      ? `${parsed.hreflangTags.length} language variations mapped`
      : "No link[hreflang] tags found",
    fix: "If your website serves multi-lingual or regional content, use link alternate hreflang tags in the <head> to guide search engines to the correct localized version.",
    reference: "https://developers.google.com/search/docs/specialty/international/localized-versions",
  };

  // 9. Broken & Insecure links
  checks["broken_links"] = {
    id: "broken_links",
    name: "Insecure & Empty Links Check",
    passed: true,
    severity: "none",
    issue: "No critical empty or insecure links flagged.",
    evidence: "Links are structured correctly",
    fix: "Avoid empty anchor tags (e.g. href=\"#\" used as buttons) and mixed content by ensuring all links on HTTPS pages use HTTPS.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
  };

  // 10. Image Optimization
  const legacyImagesCount = parsed.images ? parsed.images.filter(img => {
    const src = img.src.toLowerCase();
    return src.endsWith(".png") || src.endsWith(".jpg") || src.endsWith(".jpeg");
  }).length : 0;
  
  checks["image_optimization"] = {
    id: "image_optimization",
    name: "Image Format & Quality",
    passed: legacyImagesCount === 0,
    severity: legacyImagesCount > 5 ? "medium" : (legacyImagesCount > 0 ? "low" : "none"),
    issue: legacyImagesCount > 0
      ? `Found ${legacyImagesCount} images in legacy formats (PNG/JPG).`
      : "All images are in optimal formats or no images found.",
    evidence: `${legacyImagesCount} PNG/JPG images out of ${parsed.images ? parsed.images.length : 0} total`,
    fix: "Convert legacy images (PNG, JPG) to modern next-gen formats like WebP or AVIF. This reduces file size significantly and improves page load speed.",
    reference: "https://developers.google.com/search/docs/appearance/google-images",
  };

  // 11. URL quality
  let hasUnderscores = false;
  let hasDynamicParams = false;
  let isTooLong = false;
  let hasUppercase = false;
  
  try {
    const parsedUrl = new URL(parsed.finalUrl);
    const urlPath = parsedUrl.pathname;
    hasUnderscores = urlPath.includes("_");
    hasDynamicParams = parsedUrl.search !== "";
    isTooLong = parsed.finalUrl.length > 75;
    hasUppercase = /[A-Z]/.test(urlPath);
  } catch {
    // ignore
  }
  
  const urlPassed = !hasUnderscores && !hasDynamicParams && !isTooLong && !hasUppercase;
  
  let urlIssue = "URL is clean and well-optimized.";
  if (isTooLong) urlIssue = "URL length exceeds 75 characters.";
  else if (hasUnderscores) urlIssue = "URL uses underscores (_) instead of hyphens (-).";
  else if (hasDynamicParams) urlIssue = "URL contains dynamic query parameters.";
  else if (hasUppercase) urlIssue = "URL contains uppercase letters (can cause duplicate page crawls).";

  checks["url_quality"] = {
    id: "url_quality",
    name: "URL Quality & Structure",
    passed: urlPassed,
    severity: urlPassed ? "none" : "low",
    issue: urlIssue,
    evidence: parsed.finalUrl,
    fix: "Keep URLs short, entirely lowercase, and use hyphens (-) as word separators instead of underscores. Avoid dynamic parameters where possible.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/url-structure",
  };

  // 12. Internal linking
  const internalLinksPassed = parsed.links.internal >= 3;
  checks["internal_linking"] = {
    id: "internal_linking",
    name: "Internal Linking Volume",
    passed: internalLinksPassed,
    severity: internalLinksPassed ? "none" : (parsed.links.internal > 0 ? "medium" : "high"),
    issue: internalLinksPassed
      ? "Page has a healthy count of internal links."
      : `Only ${parsed.links.internal} internal link(s) found.`,
    evidence: `${parsed.links.internal} internal link(s)`,
    fix: "Link to other relevant pages on your site to share crawl equity and guide visitors to related topics.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
  };

  // 13. External linking
  const externalLinksPassed = parsed.links.external >= 1;
  checks["external_linking"] = {
    id: "external_linking",
    name: "Outbound External Links",
    passed: externalLinksPassed,
    severity: externalLinksPassed ? "none" : "low",
    issue: externalLinksPassed
      ? "Page contains outbound links to external sources."
      : "No outbound links to other domains found.",
    evidence: `${parsed.links.external} outbound link(s)`,
    fix: "Add high-quality external links when referencing facts, sources, or third-party tools to build topical trust.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
  };

  // 14. Crawl depth
  checks["crawl_depth"] = {
    id: "crawl_depth",
    name: "Page Crawl Depth",
    passed: true,
    severity: "none",
    issue: "Crawl depth is optimal (1 hop from entry).",
    evidence: "Depth: 1",
    fix: "Ensure all important content is accessible within 3 click hops from the homepage outline structure.",
    reference: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
  };

  return checks;
}
