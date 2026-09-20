import type { ParsedPage, VerificationCheck, ConfidenceScore } from "../../types.ts";

export function generateVerificationChecks(parsed: ParsedPage, readabilityScore: number): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  // Title checks
  const titleLen = parsed.title?.length ?? 0;
  checks.push({
    id: "title-exists",
    label: "Title tag present",
    category: "Title Tag",
    expected: "One <title> tag",
    actual: parsed.title ? `Found (${titleLen} chars)` : "Not found",
    passed: !!parsed.title,
    weight: 15,
    notes: parsed.title ? `"${parsed.title.slice(0, 60)}${parsed.title.length > 60 ? "..." : ""}"` : "Every page must have a title tag",
  });
  checks.push({
    id: "title-length",
    label: "Title length 30-60 chars",
    category: "Title Tag",
    expected: "30-60 characters",
    actual: parsed.title ? `${titleLen} characters` : "N/A",
    passed: !!parsed.title && titleLen >= 30 && titleLen <= 60,
    weight: 7,
    notes: titleLen > 60 ? "Truncated in Google SERPs" : titleLen < 30 && titleLen > 0 ? "Too short for keywords" : "",
  });

  // Meta description checks
  const descLen = parsed.metaDescription?.length ?? 0;
  checks.push({
    id: "desc-exists",
    label: "Meta description present",
    category: "Meta Description",
    expected: "One meta description",
    actual: parsed.metaDescription ? `Found (${descLen} chars)` : "Not found",
    passed: !!parsed.metaDescription,
    weight: 15,
    notes: parsed.metaDescription ? `"${parsed.metaDescription.slice(0, 80)}..."` : "Critical for CTR",
  });
  checks.push({
    id: "desc-length",
    label: "Description length 70-160 chars",
    category: "Meta Description",
    expected: "70-160 characters",
    actual: parsed.metaDescription ? `${descLen} characters` : "N/A",
    passed: !!parsed.metaDescription && descLen >= 70 && descLen <= 160,
    weight: 7,
    notes: descLen > 160 ? "Truncated in SERPs" : descLen < 70 && descLen > 0 ? "Too short" : "",
  });

  // H1 check
  const h1Count = parsed.headings.filter((h) => h.level === 1).length;
  checks.push({
    id: "h1-count",
    label: "Exactly one H1 tag",
    category: "Headings",
    expected: "Exactly 1 H1",
    actual: `${h1Count} H1 tag${h1Count !== 1 ? "s" : ""} found`,
    passed: h1Count === 1,
    weight: 8,
    notes: h1Count === 0 ? "Missing H1 — add one with primary keyword" : h1Count > 1 ? "Multiple H1s confuse search engines" : "Perfect",
  });

  // H2 check
  const h2Count = parsed.headings.filter((h) => h.level === 2).length;
  checks.push({
    id: "h2-count",
    label: "At least 2 H2 tags",
    category: "Headings",
    expected: "2+ H2 tags",
    actual: `${h2Count} H2 tags found`,
    passed: h2Count >= 2,
    weight: 7,
    notes: h2Count < 2 ? "Add H2s to structure content" : "Good structure",
  });

  // Content length
  checks.push({
    id: "content-length",
    label: "Content 600+ words",
    category: "Content Volume",
    expected: "600+ words",
    actual: `${parsed.wordCount} words`,
    passed: parsed.wordCount >= 600,
    weight: 10,
    notes: parsed.wordCount < 300 ? "Thin content" : parsed.wordCount < 600 ? "Could be expanded" : "Good depth",
  });

  // Image alt text
  const totalImages = parsed.images.length;
  const imagesWithAlt = parsed.images.filter((i) => i.hasAlt && i.alt.length > 0).length;
  checks.push({
    id: "img-alt",
    label: "All images have alt text",
    category: "Image SEO",
    expected: "100% coverage",
    actual: totalImages > 0 ? `${imagesWithAlt}/${totalImages} (${Math.round((imagesWithAlt / totalImages) * 100)}%)` : "No images",
    passed: totalImages === 0 || imagesWithAlt === totalImages,
    weight: 10,
    notes: totalImages > 0 && imagesWithAlt < totalImages ? `${totalImages - imagesWithAlt} missing alt` : "All covered",
  });

  // Internal links
  checks.push({
    id: "internal-links",
    label: "3+ internal links",
    category: "Linking",
    expected: "3+ internal links",
    actual: `${parsed.links.internal} internal links`,
    passed: parsed.links.internal >= 3,
    weight: 5,
    notes: parsed.links.internal < 3 ? "Add more internal links" : "Good crawlability",
  });

  // Canonical
  checks.push({
    id: "canonical",
    label: "Canonical URL set",
    category: "Technical",
    expected: "<link rel='canonical'>",
    actual: parsed.canonical ? "Found" : "Not found",
    passed: !!parsed.canonical,
    weight: 3,
    notes: parsed.canonical ? parsed.canonical : "Prevents duplicate content",
  });

  // Viewport
  checks.push({
    id: "viewport",
    label: "Viewport meta tag",
    category: "Technical",
    expected: "<meta name='viewport'>",
    actual: parsed.viewport ? "Found" : "Not found",
    passed: !!parsed.viewport,
    weight: 3,
    notes: parsed.viewport ? parsed.viewport : "Critical for mobile",
  });

  // OG tags
  checks.push({
    id: "og-tags",
    label: "Open Graph tags",
    category: "Social",
    expected: "og:title, og:image",
    actual: `${Object.keys(parsed.ogTags).length} OG tags`,
    passed: !!parsed.ogTags["og:title"] && !!parsed.ogTags["og:image"],
    weight: 5,
    notes: Object.keys(parsed.ogTags).length > 0 ? `Tags: ${Object.keys(parsed.ogTags).join(", ")}` : "Add for social sharing",
  });

  // HTTPS
  const isHttps = parsed.finalUrl.startsWith("https://");
  checks.push({
    id: "https",
    label: "HTTPS enabled",
    category: "Technical",
    expected: "https:// protocol",
    actual: isHttps ? "Yes" : "No (HTTP only)",
    passed: isHttps,
    weight: 2,
    notes: isHttps ? "Secure" : "Google prioritizes HTTPS",
  });

  // Readability
  checks.push({
    id: "readability",
    label: "Readability score 50+",
    category: "Content Quality",
    expected: "Flesch score >= 50",
    actual: `${readabilityScore}`,
    passed: readabilityScore >= 50,
    weight: 5,
    notes: readabilityScore < 50 ? "Hard to read — simplify" : readabilityScore < 70 ? "Standard" : "Easy to read",
  });

  return checks;
}

export function calculateConfidence(parsed: ParsedPage, verificationChecks: VerificationCheck[]): ConfidenceScore {
  const factors: ConfidenceScore["factors"] = [];
  let score = 100;

  const statusCodeNum = typeof parsed.statusCode === "number" ? parsed.statusCode : 0;
  const contentTypeStr = parsed.contentType || "";
  const wordCountNum = typeof parsed.wordCount === "number" ? parsed.wordCount : 0;
  const htmlLengthNum = typeof parsed.rawHtmlLength === "number" ? parsed.rawHtmlLength : 0;

  // Factor 1: HTTP status
  if (statusCodeNum >= 200 && statusCodeNum < 300) {
    factors.push({ label: "Page fetched successfully", status: "good", detail: `HTTP ${statusCodeNum}` });
  } else if (statusCodeNum >= 300 && statusCodeNum < 400) {
    factors.push({ label: "Page redirected", status: "warning", detail: `HTTP ${statusCodeNum} — followed redirect` });
    score -= 5;
  } else {
    factors.push({ label: "Non-OK HTTP status", status: "bad", detail: statusCodeNum ? `HTTP ${statusCodeNum}` : "N/A" });
    score -= 20;
  }

  // Factor 2: Content type
  if (contentTypeStr.includes("text/html")) {
    factors.push({ label: "Valid HTML content", status: "good", detail: contentTypeStr });
  } else {
    factors.push({ label: "Non-HTML content type", status: "warning", detail: contentTypeStr || "N/A" });
    score -= 10;
  }

  // Factor 3: Content extraction
  if (wordCountNum >= 100) {
    factors.push({ label: "Sufficient content extracted", status: "good", detail: `${wordCountNum} words found` });
  } else if (wordCountNum >= 30) {
    factors.push({ label: "Limited content extracted", status: "warning", detail: `Only ${wordCountNum} words — results may be incomplete` });
    score -= 15;
  } else {
    factors.push({ label: "Very little content extracted", status: "bad", detail: `Only ${wordCountNum} words — analysis unreliable` });
    score -= 35;
  }

  // Factor 4: SPA rendering
  if (parsed.isClientRendered) {
    factors.push({ label: "Client-side rendered SPA", status: "bad", detail: "Server returned minimal HTML — body content not fully analyzed" });
    score -= 30;
  } else {
    factors.push({ label: "Server-rendered HTML", status: "good", detail: "Full content available for analysis" });
  }

  // Factor 5: Raw HTML size
  if (htmlLengthNum > 5000) {
    factors.push({ label: "Substantial HTML payload", status: "good", detail: `${(htmlLengthNum / 1024).toFixed(1)} KB` });
  } else if (htmlLengthNum > 1000) {
    factors.push({ label: "Small HTML payload", status: "warning", detail: `${(htmlLengthNum / 1024).toFixed(1)} KB` });
    score -= 5;
  } else {
    factors.push({ label: "Very small HTML", status: "bad", detail: `${htmlLengthNum} bytes` });
    score -= 15;
  }

  // Factor 6: Verification pass rate
  const passedChecks = verificationChecks.filter((c) => c.passed).length;
  const passRate = verificationChecks.length > 0 ? (passedChecks / verificationChecks.length) * 100 : 0;
  if (passRate >= 80) {
    factors.push({ label: "High verification pass rate", status: "good", detail: `${passedChecks}/${verificationChecks.length} checks passed` });
  } else if (passRate >= 50) {
    factors.push({ label: "Moderate verification pass rate", status: "warning", detail: `${passedChecks}/${verificationChecks.length} checks passed` });
    score -= 5;
  } else {
    factors.push({ label: "Low verification pass rate", status: "bad", detail: `${passedChecks}/${verificationChecks.length} checks passed` });
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  let label = "High";
  if (score < 50) label = "Low";
  else if (score < 75) label = "Medium";

  return { score, label, factors };
}
