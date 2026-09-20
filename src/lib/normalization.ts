import type { ParsedPage, UnifiedPageModel } from "../types.ts";
import { analyzePage } from "./analyzer.ts";

export function computeQualityScores(parsed: ParsedPage) {
  const breakdown: {
    category: string;
    check: string;
    score: number;
    maxScore: number;
    status: "passed" | "failed" | "warning";
    impact: string;
    measuredValue?: string;
    formula?: string;
    opportunity?: string;
    expectedImpact?: string;
  }[] = [];

  // 1. SEO Score: calculated using our analyzer logic
  const analysis = analyzePage(parsed);
  const seo_score = analysis.seoScore;

  // Add SEO breakdown
  const titleLen = parsed.title?.length ?? 0;
  breakdown.push({
    category: "SEO",
    check: "Title Tag Presence",
    score: parsed.title ? 8 : 0,
    maxScore: 8,
    status: parsed.title ? "passed" : "failed",
    impact: parsed.title ? "Page title is configured." : "Title tag is missing. Google listings will display default URLs.",
    measuredValue: parsed.title || "Not found",
    formula: "+8 points if title tag exists",
    opportunity: "Create a descriptive title tag containing target keywords.",
    expectedImpact: "+8 points to SEO score",
  });
  breakdown.push({
    category: "SEO",
    check: "Title Tag Length (30-60 chars)",
    score: (parsed.title && titleLen >= 30 && titleLen <= 60) ? 7 : 0,
    maxScore: 7,
    status: (parsed.title && titleLen >= 30 && titleLen <= 60) ? "passed" : "warning",
    impact: (parsed.title && titleLen >= 30 && titleLen <= 60) ? "Optimal search snippet length." : "Title tag length is suboptimal, leading to snippet truncation.",
    measuredValue: parsed.title ? `${titleLen} characters` : "N/A",
    formula: "+7 points if length is between 30 and 60 characters",
    opportunity: "Adjust title length to be within the 30-60 characters threshold.",
    expectedImpact: "+7 points to SEO score",
  });

  const descLen = parsed.metaDescription?.length ?? 0;
  breakdown.push({
    category: "SEO",
    check: "Meta Description Presence",
    score: parsed.metaDescription ? 8 : 0,
    maxScore: 8,
    status: parsed.metaDescription ? "passed" : "failed",
    impact: parsed.metaDescription ? "Meta description is defined." : "Meta description tag is missing. Google will auto-generate snippet text.",
    measuredValue: parsed.metaDescription || "Not found",
    formula: "+8 points if description exists",
    opportunity: "Add a meta description to summarize page content.",
    expectedImpact: "+8 points to SEO score",
  });
  breakdown.push({
    category: "SEO",
    check: "Meta Description Length (70-160 chars)",
    score: (parsed.metaDescription && descLen >= 70 && descLen <= 160) ? 7 : 0,
    maxScore: 7,
    status: (parsed.metaDescription && descLen >= 70 && descLen <= 160) ? "passed" : "warning",
    impact: (parsed.metaDescription && descLen >= 70 && descLen <= 160) ? "Optimal description length." : "Meta description is sub-optimal length.",
    measuredValue: parsed.metaDescription ? `${descLen} characters` : "N/A",
    formula: "+7 points if length is between 70 and 160 characters",
    opportunity: "Rewrite meta description to fit within 70-160 characters.",
    expectedImpact: "+7 points to SEO score",
  });

  const h1Count = parsed.headings.filter((h) => h.level === 1).length;
  const h2Count = parsed.headings.filter((h) => h.level === 2).length;
  breakdown.push({
    category: "SEO",
    check: "Single H1 Header",
    score: h1Count === 1 ? 8 : h1Count > 1 ? 2 : 0,
    maxScore: 8,
    status: h1Count === 1 ? "passed" : "warning",
    impact: h1Count === 1 ? "Optimal H1 layout." : h1Count > 1 ? "Multiple H1 tags detected. Keep a single main title." : "Missing H1 title.",
    measuredValue: `${h1Count} tags`,
    formula: "+8 points if exactly one H1 tag is present",
    opportunity: "Ensure the page has exactly one H1 heading.",
    expectedImpact: "+8 points to SEO score",
  });
  breakdown.push({
    category: "SEO",
    check: "Subheadings Presence (H2+)",
    score: h2Count >= 2 ? 7 : h2Count > 0 ? 3 : 0,
    maxScore: 7,
    status: h2Count >= 2 ? "passed" : "warning",
    impact: h2Count >= 2 ? "Good semantic content structure." : "Few subheadings found.",
    measuredValue: `${h2Count} tags`,
    formula: "+7 points if two or more H2 tags are present",
    opportunity: "Add H2 tags to divide content segments.",
    expectedImpact: "+7 points to SEO score",
  });

  // Defensive fallback for accessibility and security flags
  const accessibility = parsed.accessibilityFlags || {
    hasLang: false,
    langValue: null,
    hasHeadingSequenceViolation: false,
    imagesMissingAltCount: 0,
    totalImagesCount: 0,
    missingFormLabelsCount: 0,
    emptyButtonsCount: 0,
    emptyLinksCount: 0,
    zoomDisabled: false,
    iframeMissingTitle: false,
    nonSemanticLandmarks: false,
  };

  const security = parsed.securityHeaders || {
    hasCsp: false,
    hasHsts: false,
    hasXFrame: false,
    hasXContentType: false,
    cspHeader: null,
    hstsHeader: null,
    xFrameHeader: null,
    xContentTypeHeader: null,
  };

  // 2. Accessibility Score
  let accessibility_score = 100;
  
  if (!accessibility.hasLang) accessibility_score -= 25;
  breakdown.push({
    category: "Accessibility",
    check: "HTML Lang Declared",
    score: accessibility.hasLang ? 25 : 0,
    maxScore: 25,
    status: accessibility.hasLang ? "passed" : "failed",
    impact: accessibility.hasLang ? "Language code is set." : "Missing lang attribute on <html> element.",
    measuredValue: accessibility.langValue || "Not found",
    formula: "+25 points if html lang attribute is defined",
    opportunity: "Declare the language on the html tag.",
    expectedImpact: "+25 points to Accessibility score",
  });

  if (accessibility.hasHeadingSequenceViolation) accessibility_score -= 15;
  breakdown.push({
    category: "Accessibility",
    check: "Heading Sequence",
    score: !accessibility.hasHeadingSequenceViolation ? 15 : 0,
    maxScore: 15,
    status: !accessibility.hasHeadingSequenceViolation ? "passed" : "warning",
    impact: !accessibility.hasHeadingSequenceViolation ? "Heading outline sequence is ordered." : "Skipped heading levels detected.",
    measuredValue: accessibility.hasHeadingSequenceViolation ? "Violated" : "Ordered",
    formula: "+15 points if heading outline structure does not skip levels",
    opportunity: "Avoid skipping heading levels (e.g. going from H1 to H3 directly).",
    expectedImpact: "+15 points to Accessibility score",
  });

  let imgAltScore = 30;
  if (accessibility.totalImagesCount > 0) {
    const missingRatio = accessibility.imagesMissingAltCount / accessibility.totalImagesCount;
    const deduction = Math.round(missingRatio * 30);
    accessibility_score -= deduction;
    imgAltScore = Math.max(0, 30 - deduction);
  }
  breakdown.push({
    category: "Accessibility",
    check: "Image Alt Tags",
    score: imgAltScore,
    maxScore: 30,
    status: accessibility.imagesMissingAltCount === 0 ? "passed" : "warning",
    impact: accessibility.imagesMissingAltCount === 0 ? "All images contain alt text." : `Found ${accessibility.imagesMissingAltCount} images missing alt text.`,
    measuredValue: `${accessibility.imagesMissingAltCount} missing / ${accessibility.totalImagesCount} total`,
    formula: "+30 points minus alt missing ratio penalty",
    opportunity: "Add descriptive alt attributes to all image elements.",
    expectedImpact: "+30 points to Accessibility score",
  });

  const missingFormLabels = accessibility.missingFormLabelsCount || 0;
  const formLabelsDeduction = Math.min(15, missingFormLabels * 5);
  accessibility_score -= formLabelsDeduction;
  breakdown.push({
    category: "Accessibility",
    check: "Form Input Labels",
    score: 15 - formLabelsDeduction,
    maxScore: 15,
    status: missingFormLabels === 0 ? "passed" : "failed",
    impact: missingFormLabels === 0 ? "All form inputs have labels." : `Found ${missingFormLabels} form input controls missing labels.`,
    measuredValue: `${missingFormLabels} missing`,
    formula: "+15 points minus 5 points deduction per missing input label",
    opportunity: "Associate form fields with descriptive labels or aria-label attributes.",
    expectedImpact: "+15 points to Accessibility score",
  });

  if (accessibility.zoomDisabled) accessibility_score -= 15;
  breakdown.push({
    category: "Accessibility",
    check: "Responsive Scaling",
    score: !accessibility.zoomDisabled ? 15 : 0,
    maxScore: 15,
    status: !accessibility.zoomDisabled ? "passed" : "warning",
    impact: !accessibility.zoomDisabled ? "Zoom scaling is allowed." : "Zoom scaling is blocked in meta viewport.",
    measuredValue: accessibility.zoomDisabled ? "Disabled" : "Active",
    formula: "+15 points if zoom/pinch scaling is allowed for readability",
    opportunity: "Remove user-scalable=no or maximum-scale restrictions in meta viewport.",
    expectedImpact: "+15 points to Accessibility score",
  });

  accessibility_score = Math.max(10, accessibility_score);

  // 3. Security Score
  let security_score = 100;
  if (!security.hasCsp) security_score -= 25;
  breakdown.push({
    category: "Security",
    check: "Content Security Policy (CSP)",
    score: security.hasCsp ? 25 : 0,
    maxScore: 25,
    status: security.hasCsp ? "passed" : "failed",
    impact: security.hasCsp ? "CSP rules defined in response headers." : "Missing CSP header. Susceptible to script injections.",
    measuredValue: security.hasCsp ? "Active" : "Missing",
    formula: "+25 points if Content-Security-Policy header is active",
    opportunity: "Define Content-Security-Policy headers on the web server.",
    expectedImpact: "+25 points to Security score",
  });

  if (!security.hasHsts) security_score -= 25;
  breakdown.push({
    category: "Security",
    check: "Strict-Transport-Security (HSTS)",
    score: security.hasHsts ? 25 : 0,
    maxScore: 25,
    status: security.hasHsts ? "passed" : "failed",
    impact: security.hasHsts ? "HSTS force-https rule defined." : "Missing HSTS header. Connections can fall back to insecure HTTP.",
    measuredValue: security.hasHsts ? "Active" : "Missing",
    formula: "+25 points if Strict-Transport-Security header is active",
    opportunity: "Configure HSTS headers on the web server.",
    expectedImpact: "+25 points to Security score",
  });

  if (!security.hasXFrame) security_score -= 25;
  breakdown.push({
    category: "Security",
    check: "X-Frame-Options",
    score: security.hasXFrame ? 25 : 0,
    maxScore: 25,
    status: security.hasXFrame ? "passed" : "failed",
    impact: security.hasXFrame ? "Frame encapsulation restricted." : "Missing X-Frame-Options. Susceptible to clickjacking.",
    measuredValue: security.hasXFrame ? "Active" : "Missing",
    formula: "+25 points if X-Frame-Options header is active",
    opportunity: "Configure X-Frame-Options to restrict frame integration.",
    expectedImpact: "+25 points to Security score",
  });

  if (!security.hasXContentType) security_score -= 25;
  breakdown.push({
    category: "Security",
    check: "X-Content-Type-Options",
    score: security.hasXContentType ? 25 : 0,
    maxScore: 25,
    status: security.hasXContentType ? "passed" : "failed",
    impact: security.hasXContentType ? "MIME-sniffing disabled." : "Missing X-Content-Type-Options.",
    measuredValue: security.hasXContentType ? "Active" : "Missing",
    formula: "+25 points if X-Content-Type-Options header is active",
    opportunity: "Configure X-Content-Type-Options to disable MIME-sniffing.",
    expectedImpact: "+25 points to Security score",
  });

  security_score = Math.max(10, security_score);

  // 4. Content Score
  let content_score = analysis.readabilityScore; // baseline readability
  if (parsed.wordCount < 300) content_score = Math.max(10, content_score - 30);
  else if (parsed.wordCount > 1000) content_score = Math.min(100, content_score + 15);
  content_score = Math.max(10, Math.round(content_score));

  // 5. Performance Score (Real Core Web Vitals or Fallback estimates)
  let performance_score: number | null = null;
  const psi = parsed.performanceDetails;

  const hasPsi = !!(psi && (psi.lcp !== null || psi.fcp !== null));
  const hasNetworkTimings = !!((parsed.responseTimeMs !== null && parsed.responseTimeMs > 0) || 
                               (parsed.loadTimeMs !== null && parsed.loadTimeMs > 0));

  if (hasPsi) {
    performance_score = 100;
    const lcp = psi.lcp || 0;
    let lcpDeduction = 0;
    if (lcp > 4000) lcpDeduction = 25;
    else if (lcp > 2500) lcpDeduction = 15;
    else if (lcp > 1200) lcpDeduction = 5;
    performance_score -= lcpDeduction;
    breakdown.push({
      category: "Performance",
      check: "Largest Contentful Paint (LCP)",
      score: 25 - lcpDeduction,
      maxScore: 25,
      status: lcpDeduction === 0 ? "passed" : lcpDeduction === 5 ? "warning" : "failed",
      impact: `Largest element loaded in ${Math.round(lcp)}ms.`,
      measuredValue: psi.lcp !== null ? `${(psi.lcp/1000).toFixed(2)}s` : "N/A",
      formula: "+25 points based on Core Web Vitals LCP rating",
      opportunity: "Defer offscreen images and reduce render-blocking resources.",
      expectedImpact: "+25 points to Performance score",
    });

    const cls = psi.cls || 0;
    let clsDeduction = 0;
    if (cls > 0.25) clsDeduction = 25;
    else if (cls > 0.1) clsDeduction = 15;
    else if (cls > 0.05) clsDeduction = 5;
    performance_score -= clsDeduction;
    breakdown.push({
      category: "Performance",
      check: "Cumulative Layout Shift (CLS)",
      score: 25 - clsDeduction,
      maxScore: 25,
      status: clsDeduction === 0 ? "passed" : clsDeduction === 5 ? "warning" : "failed",
      impact: `Page layout shifted by score of ${cls.toFixed(3)}.`,
      measuredValue: psi.cls !== null ? psi.cls.toFixed(3) : "N/A",
      formula: "+25 points based on Cumulative Layout Shift rating",
      opportunity: "Assign dimensions to images and dynamic content wrapper elements.",
      expectedImpact: "+25 points to Performance score",
    });

    const fcp = psi.fcp || 0;
    let fcpDeduction = 0;
    if (fcp > 3000) fcpDeduction = 20;
    else if (fcp > 1800) fcpDeduction = 12;
    else if (fcp > 800) fcpDeduction = 4;
    performance_score -= fcpDeduction;
    breakdown.push({
      category: "Performance",
      check: "First Contentful Paint (FCP)",
      score: 20 - fcpDeduction,
      maxScore: 20,
      status: fcpDeduction === 0 ? "passed" : fcpDeduction === 4 ? "warning" : "failed",
      impact: `First visual element rendered in ${Math.round(fcp)}ms.`,
      measuredValue: psi.fcp !== null ? `${(psi.fcp/1000).toFixed(2)}s` : "N/A",
      formula: "+20 points based on First Contentful Paint rating",
      opportunity: "Minimize main thread work and reduce JavaScript payload sizes.",
      expectedImpact: "+20 points to Performance score",
    });

    const tbt = psi.tbt || 0;
    let tbtDeduction = 0;
    if (tbt > 600) tbtDeduction = 20;
    else if (tbt > 200) tbtDeduction = 12;
    else if (tbt > 100) tbtDeduction = 4;
    performance_score -= tbtDeduction;
    breakdown.push({
      category: "Performance",
      check: "Total Blocking Time (TBT)",
      score: 20 - tbtDeduction,
      maxScore: 20,
      status: tbtDeduction === 0 ? "passed" : tbtDeduction === 4 ? "warning" : "failed",
      impact: `Script rendering blocked main thread by ${Math.round(tbt)}ms.`,
      measuredValue: psi.tbt !== null ? `${Math.round(psi.tbt)}ms` : "N/A",
      formula: "+20 points based on Total Blocking Time rating",
      opportunity: "Optimize or code-split complex JavaScript bundles.",
      expectedImpact: "+20 points to Performance score",
    });

    const responseTime = parsed.responseTimeMs || 0;
    let ttfbDeduction = 0;
    if (responseTime > 1000) ttfbDeduction = 10;
    else if (responseTime > 500) ttfbDeduction = 6;
    performance_score -= ttfbDeduction;
    breakdown.push({
      category: "Performance",
      check: "Time to First Byte (TTFB)",
      score: 10 - ttfbDeduction,
      maxScore: 10,
      status: ttfbDeduction === 0 ? "passed" : "failed",
      impact: `Server responded to crawl in ${responseTime}ms.`,
      measuredValue: `${responseTime}ms`,
      formula: "+10 points based on server response latency",
      opportunity: "Implement server-side page caching or CDN distribution.",
      expectedImpact: "+10 points to Performance score",
    });

    performance_score = Math.max(10, performance_score);
  } else if (hasNetworkTimings) {
    performance_score = 100;
    const responseTime = parsed.responseTimeMs || 0;
    const loadTime = parsed.loadTimeMs || 0;

    let responseDeduction = 0;
    if (responseTime > 1000) responseDeduction = 25;
    else if (responseTime > 500) responseDeduction = 15;
    else if (responseTime > 250) responseDeduction = 8;
    performance_score -= responseDeduction;

    let loadDeduction = 0;
    if (loadTime > 3000) loadDeduction = 25;
    else if (loadTime > 1500) loadDeduction = 15;
    else if (loadTime > 800) loadDeduction = 8;
    performance_score -= loadDeduction;

    let assetDeduction = 0;
    if (parsed.images.length > 20) assetDeduction += 10;
    if (parsed.rawHtmlLength > 250000) assetDeduction += 15;
    performance_score -= assetDeduction;

    breakdown.push({
      category: "Performance",
      check: "Server Response Latency",
      score: Math.max(0, 40 - responseDeduction),
      maxScore: 40,
      status: responseDeduction === 0 ? "passed" : "warning",
      impact: `Response latency: ${responseTime}ms.`,
      measuredValue: `${responseTime}ms`,
      formula: "Max 40 points, deducts based on response time ranges",
      opportunity: "Optimize backend endpoints and database queries.",
      expectedImpact: "+40 points to Performance score",
    });
    breakdown.push({
      category: "Performance",
      check: "Estimated Page Load Speed",
      score: Math.max(0, 40 - loadDeduction),
      maxScore: 40,
      status: loadDeduction === 0 ? "passed" : "warning",
      impact: `HTML response retrieved in ${loadTime}ms.`,
      measuredValue: `${loadTime}ms`,
      formula: "Max 40 points, deducts based on load time ranges",
      opportunity: "Reduce document HTML payloads and compress assets.",
      expectedImpact: "+40 points to Performance score",
    });
    breakdown.push({
      category: "Performance",
      check: "Page Weight & Asset Size",
      score: Math.max(0, 20 - assetDeduction),
      maxScore: 20,
      status: assetDeduction === 0 ? "passed" : "warning",
      impact: `HTML size: ${(parsed.rawHtmlLength/1024).toFixed(1)}KB with ${parsed.images.length} images.`,
      measuredValue: `${(parsed.rawHtmlLength/1024).toFixed(1)}KB`,
      formula: "Max 20 points, deducts if images > 20 or HTML size > 250KB",
      opportunity: "Compress and scale image assets to next-gen formats (WebP/AVIF).",
      expectedImpact: "+20 points to Performance score",
    });

    performance_score = Math.max(10, performance_score);
  }
  
  if (performance_score !== null) {
    performance_score = Math.max(10, performance_score);
  }

  // Overall Score (Weighted Average)
  const overall_score = Math.round(
    seo_score * 0.35 +
    accessibility_score * 0.25 +
    security_score * 0.20 +
    content_score * 0.20
  );

  return {
    overall_score,
    seo_score,
    accessibility_score,
    security_score,
    content_score,
    performance_score,
    analysis,
    breakdown,
  };
}

export function normalizeCrawlPayload(parsed: ParsedPage): UnifiedPageModel {
  const scores = computeQualityScores(parsed);
  
  return {
    url: parsed.url,
    finalUrl: parsed.finalUrl,
    metadata: {
      title: parsed.title,
      description: parsed.metaDescription,
      keywords: parsed.metaKeywords,
      canonical: parsed.canonical,
      lang: parsed.lang,
      charset: parsed.charset,
      viewport: parsed.viewport,
    },
    metrics: {
      wordCount: parsed.wordCount,
      paragraphsCount: parsed.paragraphs.length,
      imagesCount: parsed.images.length,
      imagesMissingAltCount: parsed.accessibilityFlags?.imagesMissingAltCount || 0,
      linksInternalCount: parsed.links?.internal || 0,
      linksExternalCount: parsed.links?.external || 0,
      responseTimeMs: parsed.responseTimeMs,
      loadTimeMs: parsed.loadTimeMs,
    },
    scores: {
      overall: scores.overall_score,
      seo: scores.seo_score,
      performance: scores.performance_score,
      accessibility: scores.accessibility_score,
      security: scores.security_score,
      content: scores.content_score,
    },
    breakdown: scores.breakdown,
    parsed,
  };
}
