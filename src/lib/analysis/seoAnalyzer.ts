import type { ParsedPage, KeywordEntry, InsightItem, PhraseEntry, MetaSuggestions } from "../../types.ts";

export function calculateSeoScore(
  parsed: ParsedPage,
  topKeywords: KeywordEntry[],
  insights: InsightItem[],
): number {
  let score = 0;
  const max = 100;

  // Title (15 pts)
  if (parsed.title) {
    score += 8;
    if (parsed.title.length >= 30 && parsed.title.length <= 60) score += 7;
    else if (parsed.title.length > 0) score += 3;
  }

  // Meta description (15 pts)
  if (parsed.metaDescription) {
    score += 8;
    if (parsed.metaDescription.length >= 70 && parsed.metaDescription.length <= 160) score += 7;
    else if (parsed.metaDescription.length > 0) score += 3;
  }

  // Headings structure (15 pts)
  const h1Count = parsed.headings.filter((h) => h.level === 1).length;
  const h2Count = parsed.headings.filter((h) => h.level === 2).length;
  if (h1Count === 1) score += 8;
  else if (h1Count > 1) score += 2;
  if (h2Count >= 2) score += 7;
  else if (h2Count > 0) score += 3;

  // Content length (15 pts)
  if (parsed.wordCount >= 300) score += 5;
  if (parsed.wordCount >= 600) score += 5;
  if (parsed.wordCount >= 1200) score += 5;

  // Images alt text (10 pts)
  const imagesWithAlt = parsed.images.filter((img) => img.hasAlt && img.alt.length > 0).length;
  if (parsed.images.length > 0) {
    const altRatio = imagesWithAlt / parsed.images.length;
    score += Math.round(altRatio * 10);
  } else {
    score += 5; // no images to worry about
  }

  // Links (10 pts)
  if (parsed.links.total >= 3) score += 5;
  if (parsed.links.internal >= 2) score += 3;
  if (parsed.links.external >= 1) score += 2;

  // Open Graph / social (10 pts)
  if (parsed.ogTags["og:title"]) score += 3;
  if (parsed.ogTags["og:description"]) score += 2;
  if (parsed.ogTags["og:image"]) score += 3;
  if (parsed.twitterTags["twitter:card"]) score += 2;

  // Canonical + lang (5 pts)
  if (parsed.canonical) score += 3;
  if (parsed.lang) score += 2;

  // Keyword density penalty: if top keyword density > 5%, dock points
  const topDensity = topKeywords[0]?.density ?? 0;
  if (topDensity > 5) score -= Math.min(5, Math.round(topDensity - 5));

  // Penalty for too many weaknesses
  const highWeaknesses = insights.filter(
    (i) => i.type === "weakness" && i.severity === "high",
  ).length;
  score -= highWeaknesses * 3;

  return Math.max(0, Math.min(max, score));
}

export function recommendKeywords(
  topKeywords: KeywordEntry[],
  bigrams: PhraseEntry[],
  trigrams: PhraseEntry[],
  domain: string,
): string[] {
  const recommended: string[] = [];
  const domainName = domain.replace(/\.[a-z]{2,}$/, "").replace(/^www\./, "");

  // Add domain-derived keyword
  if (domainName && domainName.length > 2) {
    recommended.push(domainName);
  }

  // Top single keywords (excluding very short)
  for (const kw of topKeywords.slice(0, 3)) {
    if (kw.word.length > 3 && !recommended.includes(kw.word)) {
      recommended.push(kw.word);
    }
  }

  // Top bigrams
  for (const bg of bigrams.slice(0, 4)) {
    if (!recommended.includes(bg.phrase)) {
      recommended.push(bg.phrase);
    }
  }

  // Top trigrams
  for (const tg of trigrams.slice(0, 3)) {
    if (!recommended.includes(tg.phrase)) {
      recommended.push(tg.phrase);
    }
  }

  // SEO modifier keywords
  const modifiers = ["guide", "best practices", "tips", "tutorial", "examples", "how to", "benefits", "comparison"];
  if (topKeywords.length > 0) {
    const primary = topKeywords[0].word;
    for (const mod of modifiers.slice(0, 3)) {
      recommended.push(`${primary} ${mod}`);
    }
  }

  return Array.from(new Set(recommended)).slice(0, 12);
}

export function generateMetaSuggestions(
  parsed: ParsedPage,
  topKeywords: KeywordEntry[],
  bigrams: PhraseEntry[],
): MetaSuggestions {
  const domain = (() => {
    try { return new URL(parsed.finalUrl).hostname.replace(/^www\./, ""); } catch { return ""; }
  })();

  // Build suggested title
  let suggestedTitle = "";
  let titleReason = "";

  if (parsed.title && parsed.title.length >= 30 && parsed.title.length <= 60) {
    suggestedTitle = parsed.title;
    titleReason = "Your current title is already well-optimized. No changes needed.";
  } else {
    const parts: string[] = [];
    const primaryKw = topKeywords[0]?.word;
    const secondaryKw = topKeywords[1]?.word;
    const topBigram = bigrams[0]?.phrase;

    if (topBigram) {
      parts.push(topBigram.charAt(0).toUpperCase() + topBigram.slice(1));
    } else if (primaryKw) {
      parts.push(primaryKw.charAt(0).toUpperCase() + primaryKw.slice(1));
    }

    if (secondaryKw && (!topBigram || !topBigram.includes(secondaryKw))) {
      parts.push(secondaryKw);
    }

    if (domain) {
      parts.push(`| ${domain}`);
    }

    suggestedTitle = parts.join(" ").slice(0, 58);

    if (!parsed.title) {
      titleReason = "No title tag found. This generated title includes your top content keywords and brand name for maximum SERP visibility.";
    } else if (parsed.title.length > 60) {
      titleReason = `Current title is ${parsed.title.length} chars — Google truncates at ~60. This version condenses it while keeping your primary keywords.`;
    } else {
      titleReason = `Current title is only ${parsed.title.length} chars. This version adds your top keywords for better search visibility.`;
    }
  }

  // Build suggested description
  let suggestedDescription = "";
  let descriptionReason = "";

  if (parsed.metaDescription && parsed.metaDescription.length >= 70 && parsed.metaDescription.length <= 160) {
    suggestedDescription = parsed.metaDescription;
    descriptionReason = "Your current meta description is well-optimized. No changes needed.";
  } else {
    const sentences: string[] = [];
    const primaryKw = topKeywords[0]?.word;
    const topBigram = bigrams[0]?.phrase;
    const topTrigram = bigrams[1]?.phrase;

    const kwPhrase = topBigram || (primaryKw ? primaryKw : "");

    if (kwPhrase) {
      sentences.push(`Discover ${kwPhrase} with our comprehensive guide.`);
    }
    if (topTrigram) {
      sentences.push(`Learn about ${topTrigram} and expert insights.`);
    }
    if (parsed.wordCount > 0) {
      sentences.push(`Covers ${parsed.wordCount} words of in-depth analysis.`);
    }
    sentences.push(`Get started today.`);

    suggestedDescription = sentences.join(" ").slice(0, 157);

    if (!parsed.metaDescription) {
      descriptionReason = "No meta description found. This generated description includes your primary keywords and a call-to-action to improve click-through rate.";
    } else if (parsed.metaDescription.length > 160) {
      descriptionReason = `Current description is ${parsed.metaDescription.length} chars — truncated in SERPs. This version fits within 160 chars while keeping keywords.`;
    } else {
      descriptionReason = `Current description is only ${parsed.metaDescription.length} chars. This expanded version includes keywords and a CTA for better CTR.`;
    }
  }

  return { suggestedTitle, suggestedDescription, titleReason, descriptionReason };
}
