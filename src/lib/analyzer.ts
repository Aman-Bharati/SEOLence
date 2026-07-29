import type {
  ActionItem,
  AnalysisResult,
  ConfidenceScore,
  GradeCard,
  GradeEntry,
  InsightItem,
  KeywordEntry,
  MetaSuggestions,
  ParsedPage,
  PhraseEntry,
  VerificationCheck,
} from "../types";

// Standard English stop words list
export const STOP_WORDS = new Set<string>([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "here’s", "hers", "herself", "him", "himself", "his", "how",
  "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
  "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
  "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves", "also", "just", "get", "got", "make", "made",
  "like", "well", "even", "still", "back", "way", "many", "much", "will",
  "one", "two", "three", "us", "now", "may", "might", "can", "could",
]);

// Common filler / irrelevant terms beyond grammatical stop words
const FILLER_WORDS = new Set<string>([
  "etc", "ie", "eg", "via", "per", "say", "says", "said", "thing", "things",
  "stuff", "okay", "ok", "yeah", "yes", "nope", "umm", "hmm",
]);

const NEGATIVE_SEO_HINTS = [
  "click here", "read more", "learn more", "more info", "check out",
  "find out", "discover", "lorem ipsum",
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024f\u1e00-\u1eff]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?]+(?:\s|$)/g);
  return matches ? matches.length : 1;
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function generateNgrams(words: string[], n: number): Map<string, number> {
  const ngrams = new Map<string, number>();
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(" ");
    // skip n-grams that are entirely stop words
    const gramWords = gram.split(" ");
    const stopCount = gramWords.filter((w) => STOP_WORDS.has(w)).length;
    if (stopCount === gramWords.length) continue;
    ngrams.set(gram, (ngrams.get(gram) ?? 0) + 1);
  }
  return ngrams;
}

function mapToSortedEntries(map: Map<string, number>, limit: number): PhraseEntry[] {
  return Array.from(map.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function calculateFleschReadingEase(
  words: string[],
  sentenceCount: number,
): { score: number; label: string } {
  if (words.length === 0 || sentenceCount === 0) {
    return { score: 0, label: "N/A" };
  }
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wordsPerSentence = words.length / sentenceCount;
  const syllablesPerWord = totalSyllables / words.length;
  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

  let label = "Very Difficult";
  if (score >= 90) label = "Very Easy";
  else if (score >= 80) label = "Easy";
  else if (score >= 70) label = "Fairly Easy";
  else if (score >= 60) label = "Standard";
  else if (score >= 50) label = "Fairly Difficult";
  else if (score >= 30) label = "Difficult";

  return { score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)), label };
}

function calculateSeoScore(
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

function generateInsights(
  parsed: ParsedPage,
  topKeywords: KeywordEntry[],
  overusedWords: KeywordEntry[],
  readabilityScore: number,
): InsightItem[] {
  const insights: InsightItem[] = [];

  // --- STRENGTHS ---
  if (parsed.title && parsed.title.length >= 30 && parsed.title.length <= 60) {
    insights.push({
      type: "strength",
      category: "Title Tag",
      message: `Title tag is well-optimized at ${parsed.title.length} characters (ideal: 30-60).`,
      severity: "low",
    });
  }
  if (parsed.metaDescription && parsed.metaDescription.length >= 70 && parsed.metaDescription.length <= 160) {
    insights.push({
      type: "strength",
      category: "Meta Description",
      message: `Meta description length is optimal (${parsed.metaDescription.length} chars, ideal: 70-160).`,
      severity: "low",
    });
  }
  const h1s = parsed.headings.filter((h) => h.level === 1);
  if (h1s.length === 1) {
    insights.push({
      type: "strength",
      category: "Heading Structure",
      message: "Exactly one H1 tag found — ideal for SEO hierarchy.",
      severity: "low",
    });
  }
  if (parsed.wordCount >= 600) {
    insights.push({
      type: "strength",
      category: "Content Volume",
      message: `Content is substantial (${parsed.wordCount} words), which search engines tend to favor.`,
      severity: "low",
    });
  }
  const altCovered = parsed.images.length > 0
    ? parsed.images.filter((i) => i.hasAlt && i.alt.length > 0).length / parsed.images.length
    : 1;
  if (parsed.images.length > 0 && altCovered >= 0.9) {
    insights.push({
      type: "strength",
      category: "Image SEO",
      message: `${Math.round(altCovered * 100)}% of images have descriptive alt text.`,
      severity: "low",
    });
  }
  if (parsed.ogTags["og:title"] && parsed.ogTags["og:image"]) {
    insights.push({
      type: "strength",
      category: "Social Sharing",
      message: "Open Graph tags are present — link previews will render well on social platforms.",
      severity: "low",
    });
  }
  if (parsed.canonical) {
    insights.push({
      type: "strength",
      category: "Canonical URL",
      message: "Canonical URL is set, preventing duplicate content issues.",
      severity: "low",
    });
  }
  if (parsed.links.internal >= 5) {
    insights.push({
      type: "strength",
      category: "Internal Linking",
      message: `${parsed.links.internal} internal links found — good for crawlability and PageRank flow.`,
      severity: "low",
    });
  }

  // --- WEAKNESSES ---

  // Client-side rendering warning — high priority SEO issue
  if (parsed.isClientRendered) {
    insights.push({
      type: "weakness",
      category: "Rendering Strategy",
      message: "Page is client-side rendered with minimal server HTML. Search engines may not index body content. Implement SSR, SSG, or pre-rendering so crawlers see full content without executing JavaScript.",
      severity: "high",
    });
  }

  if (!parsed.title) {
    insights.push({
      type: "weakness",
      category: "Title Tag",
      message: "No title tag detected. This is critical — every page needs a unique, descriptive title.",
      severity: "high",
    });
  } else if (parsed.title.length > 60) {
    insights.push({
      type: "weakness",
      category: "Title Tag",
      message: `Title tag is ${parsed.title.length} characters — likely truncated in search results. Keep under 60.`,
      severity: "medium",
    });
  } else if (parsed.title.length < 30 && parsed.title.length > 0) {
    insights.push({
      type: "weakness",
      category: "Title Tag",
      message: `Title tag is only ${parsed.title.length} characters — too short to include target keywords.`,
      severity: "medium",
    });
  }

  if (!parsed.metaDescription) {
    insights.push({
      type: "weakness",
      category: "Meta Description",
      message: "No meta description found. Add one (70-160 chars) to improve click-through rate.",
      severity: "high",
    });
  } else if (parsed.metaDescription.length > 160) {
    insights.push({
      type: "weakness",
      category: "Meta Description",
      message: `Meta description is ${parsed.metaDescription.length} chars — truncated in SERPs. Keep under 160.`,
      severity: "medium",
    });
  } else if (parsed.metaDescription.length < 70 && parsed.metaDescription.length > 0) {
    insights.push({
      type: "weakness",
      category: "Meta Description",
      message: `Meta description is only ${parsed.metaDescription.length} chars — too short to be compelling.`,
      severity: "low",
    });
  }

  if (h1s.length === 0) {
    insights.push({
      type: "weakness",
      category: "Heading Structure",
      message: "No H1 tag found. Add one H1 containing your primary keyword.",
      severity: "high",
    });
  } else if (h1s.length > 1) {
    insights.push({
      type: "weakness",
      category: "Heading Structure",
      message: `${h1s.length} H1 tags found — use exactly one H1 per page for clear topical focus.`,
      severity: "medium",
    });
  }

  const h2Count = parsed.headings.filter((h) => h.level === 2).length;
  if (h2Count === 0 && parsed.wordCount > 300) {
    insights.push({
      type: "weakness",
      category: "Heading Structure",
      message: "No H2 tags found. Break content into sections with H2 subheadings for readability and SEO.",
      severity: "medium",
    });
  }

  if (parsed.wordCount < 300) {
    insights.push({
      type: "weakness",
      category: "Content Volume",
      message: `Only ${parsed.wordCount} words on page. Thin content (<300 words) ranks poorly. Aim for 600+.`,
      severity: "high",
    });
  } else if (parsed.wordCount < 600) {
    insights.push({
      type: "weakness",
      category: "Content Volume",
      message: `${parsed.wordCount} words — decent but could be expanded. 600+ words typically rank better.`,
      severity: "low",
    });
  }

  if (parsed.images.length > 0) {
    const missingAlt = parsed.images.filter((i) => !i.hasAlt || i.alt.length === 0);
    if (missingAlt.length > 0) {
      insights.push({
        type: "weakness",
        category: "Image SEO",
        message: `${missingAlt.length} of ${parsed.images.length} images missing alt text. Add descriptive alt for accessibility and image search.`,
        severity: parsed.images.length > 5 ? "high" : "medium",
      });
    }
  }

  if (!parsed.ogTags["og:title"]) {
    insights.push({
      type: "weakness",
      category: "Social Sharing",
      message: "Missing Open Graph tags. Add og:title, og:description, and og:image for social link previews.",
      severity: "medium",
    });
  }

  if (!parsed.canonical) {
    insights.push({
      type: "weakness",
      category: "Canonical URL",
      message: "No canonical link tag. Add one to prevent duplicate-content penalties.",
      severity: "medium",
    });
  }

  if (!parsed.viewport) {
    insights.push({
      type: "weakness",
      category: "Mobile Optimization",
      message: "No viewport meta tag. Without it, the page won't render properly on mobile devices.",
      severity: "high",
    });
  }

  if (parsed.links.internal < 3 && parsed.wordCount > 300) {
    insights.push({
      type: "weakness",
      category: "Internal Linking",
      message: `Only ${parsed.links.internal} internal links. Add more to improve crawlability and keep users engaged.`,
      severity: "low",
    });
  }

  if (overusedWords.length > 0) {
    insights.push({
      type: "weakness",
      category: "Keyword Stuffing",
      message: `"${overusedWords[0].word}" appears ${overusedWords[0].count} times (${overusedWords[0].density}% density) — risk of keyword stuffing. Naturally vary your language.`,
      severity: overusedWords[0].density > 6 ? "high" : "medium",
    });
  }

  if (readabilityScore < 50 && parsed.wordCount > 100) {
    insights.push({
      type: "weakness",
      category: "Readability",
      message: `Flesch reading ease is ${readabilityScore} — content may be hard to read. Simplify sentences and use shorter words.`,
      severity: "medium",
    });
  }

  // --- RECOMMENDATIONS ---
  if (topKeywords.length > 0) {
    const primary = topKeywords.slice(0, 5).map((k) => k.word).join(", ");
    insights.push({
      type: "recommendation",
      category: "Keyword Strategy",
      message: `Your strongest content keywords are: ${primary}. Ensure these appear in your title, H1, and first 100 words.`,
      severity: "medium",
    });
  }

  insights.push({
    type: "recommendation",
    category: "Content Structure",
    message: "Aim for one H1, multiple H2s breaking content into topics, and H3s for sub-points. Include target keywords in at least one H2.",
    severity: "medium",
  });

  insights.push({
    type: "recommendation",
    category: "Image Optimization",
    message: "Compress images, use descriptive filenames (e.g., blue-widget-guide.jpg), and add alt text containing relevant keywords.",
    severity: "low",
  });

  if (parsed.wordCount < 1200) {
    insights.push({
      type: "recommendation",
      category: "Content Depth",
      message: "Expand content to 1200+ words with original analysis, examples, or data. Long-form content earns more backlinks and ranks for more long-tail queries.",
      severity: "medium",
    });
  }

  insights.push({
    type: "recommendation",
    category: "Internal Linking",
    message: "Link to 3-5 related pages on your site using descriptive anchor text (not 'click here'). This distributes PageRank and helps search engines discover content.",
    severity: "low",
  });

  insights.push({
    type: "recommendation",
    category: "Technical SEO",
    message: "Ensure HTTPS is active, implement structured data (schema.org), submit an XML sitemap, and keep page load under 3 seconds.",
    severity: "low",
  });

  // Check for negative SEO hints in links/headings
  const allText = (parsed.visibleText + " " + parsed.headings.map((h) => h.text).join(" ")).toLowerCase();
  for (const hint of NEGATIVE_SEO_HINTS) {
    if (allText.includes(hint)) {
      insights.push({
        type: "recommendation",
        category: "Anchor Text",
        message: `Generic anchor text "${hint}" detected — replace with descriptive, keyword-rich anchor text.`,
        severity: "low",
      });
      break;
    }
  }

  return insights;
}

function recommendKeywords(
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

export function generateActionPlan(
  parsed: ParsedPage,
  insights: InsightItem[],
  topKeywords: KeywordEntry[],
  overusedWords: KeywordEntry[],
): ActionItem[] {
  const items: ActionItem[] = [];
  let step = 1;

  const add = (title: string, detail: string, impact: number, effort: ActionItem["effort"], category: string) => {
    items.push({ step: step++, title, detail, impact, effort, category });
  };

  // High-severity weaknesses first
  const highWeaknesses = insights.filter((i) => i.type === "weakness" && i.severity === "high");
  const medWeaknesses = insights.filter((i) => i.type === "weakness" && i.severity === "medium");
  const recs = insights.filter((i) => i.type === "recommendation");

  for (const w of highWeaknesses) {
    const effort = w.category === "Rendering Strategy" ? "high" : "low";
    add(
      `Fix: ${w.category}`,
      w.message,
      8,
      effort,
      w.category,
    );
  }

  // Title optimization
  if (!parsed.title || parsed.title.length < 30 || parsed.title.length > 60) {
    const kw = topKeywords[0]?.word || "your target keyword";
    add(
      "Optimize your title tag",
      `Write a 50-60 character title that starts with "${kw}". Include your brand name at the end. Example: "${kw.charAt(0).toUpperCase() + kw.slice(1)} — Complete Guide | Your Brand"`,
      7,
      "low",
      "Title Tag",
    );
  }

  // Meta description
  if (!parsed.metaDescription || parsed.metaDescription.length < 70 || parsed.metaDescription.length > 160) {
    add(
      "Write a compelling meta description",
      `Create a 120-155 character description that includes your primary keyword and a clear call-to-action. This directly impacts click-through rate from search results.`,
      6,
      "low",
      "Meta Description",
    );
  }

  // Content expansion
  if (parsed.wordCount < 600) {
    add(
      `Expand content from ${parsed.wordCount} to 600+ words`,
      `Add detailed sections covering subtopics, examples, and FAQs. Long-form content (1200+ words) earns 3x more backlinks and ranks for more long-tail queries. Use your top keywords: ${topKeywords.slice(0, 3).map((k) => k.word).join(", ")}.`,
      9,
      "medium",
      "Content Volume",
    );
  }

  // Heading structure
  const h1Count = parsed.headings.filter((h) => h.level === 1).length;
  if (h1Count !== 1) {
    add(
      h1Count === 0 ? "Add an H1 heading" : `Reduce from ${h1Count} H1 tags to exactly 1`,
      `Use exactly one H1 containing your primary keyword. Then use H2s for major sections and H3s for subsections. This creates a clear content hierarchy that search engines use to understand your page.`,
      5,
      "low",
      "Heading Structure",
    );
  }

  // Image alt text
  const missingAlt = parsed.images.filter((i) => !i.hasAlt || i.alt.length === 0);
  if (missingAlt.length > 0) {
    add(
      `Add alt text to ${missingAlt.length} images`,
      `Write descriptive alt text for each image. Include relevant keywords where natural. Example: instead of "image1.jpg", use "screenshot of ${topKeywords[0]?.word || "keyword"} dashboard". This improves accessibility and image search rankings.`,
      4,
      "low",
      "Image SEO",
    );
  }

  // Keyword stuffing
  if (overusedWords.length > 0) {
    add(
      `Reduce "${overusedWords[0].word}" keyword density`,
      `"${overusedWords[0].word}" appears ${overusedWords[0].count} times (${overusedWords[0].density}% density). Replace some instances with synonyms and related terms. Target 1-3% density for primary keywords.`,
      5,
      "low",
      "Keyword Density",
    );
  }

  // Social tags
  if (!parsed.ogTags["og:title"] || !parsed.ogTags["og:image"]) {
    add(
      "Add Open Graph and Twitter Card tags",
      `Add og:title, og:description, og:image (1200x630px), and twitter:card tags to the <head>. This ensures rich link previews when your page is shared on social media, improving click-through rate by 2-3x.`,
      4,
      "low",
      "Social Sharing",
    );
  }

  // Canonical
  if (!parsed.canonical) {
    add(
      "Add a canonical link tag",
      `Add <link rel="canonical" href="${parsed.finalUrl}" /> to the <head>. This tells search engines which URL is the primary version, preventing duplicate content penalties.`,
      3,
      "low",
      "Canonical URL",
    );
  }

  // Internal linking
  if (parsed.links.internal < 3 && parsed.wordCount > 300) {
    add(
      `Add internal links (currently ${parsed.links.internal})`,
      `Link to 3-5 related pages on your site using descriptive anchor text. This helps search engines discover content and distributes PageRank. Avoid generic anchors like "click here".`,
      4,
      "medium",
      "Internal Linking",
    );
  }

  // Medium weaknesses
  for (const w of medWeaknesses.slice(0, 3)) {
    if (!items.some((i) => i.category === w.category)) {
      add(
        `Improve: ${w.category}`,
        w.message,
        4,
        "low",
        w.category,
      );
    }
  }

  // Top recommendations
  for (const r of recs.slice(0, 3)) {
    if (!items.some((i) => i.category === r.category)) {
      add(
        `Implement: ${r.category}`,
        r.message,
        3,
        "medium",
        r.category,
      );
    }
  }

  return items;
}

export function calculateGradeCard(
  parsed: ParsedPage,
  topKeywords: KeywordEntry[],
  insights: InsightItem[],
): GradeCard {
  const entries: GradeEntry[] = [];

  const gradeFor = (score: number, max: number): { grade: string; status: GradeEntry["status"] } => {
    const pct = max > 0 ? (score / max) * 100 : 100;
    let grade = "F";
    if (pct >= 95) grade = "A+";
    else if (pct >= 90) grade = "A";
    else if (pct >= 85) grade = "A-";
    else if (pct >= 80) grade = "B+";
    else if (pct >= 75) grade = "B";
    else if (pct >= 70) grade = "B-";
    else if (pct >= 65) grade = "C+";
    else if (pct >= 60) grade = "C";
    else if (pct >= 55) grade = "C-";
    else if (pct >= 50) grade = "D+";
    else if (pct >= 45) grade = "D";
    else if (pct >= 40) grade = "D-";
    const status: GradeEntry["status"] = pct >= 75 ? "good" : pct >= 50 ? "warning" : "critical";
    return { grade, status };
  };

  // Title (15)
  let titleScore = 0;
  if (parsed.title) {
    titleScore += 8;
    if (parsed.title.length >= 30 && parsed.title.length <= 60) titleScore += 7;
    else if (parsed.title.length > 0) titleScore += 3;
  }
  const tg = gradeFor(titleScore, 15);
  entries.push({ category: "Title Tag", grade: tg.grade, score: titleScore, maxScore: 15, status: tg.status });

  // Meta description (15)
  let descScore = 0;
  if (parsed.metaDescription) {
    descScore += 8;
    if (parsed.metaDescription.length >= 70 && parsed.metaDescription.length <= 160) descScore += 7;
    else if (parsed.metaDescription.length > 0) descScore += 3;
  }
  const dg = gradeFor(descScore, 15);
  entries.push({ category: "Meta Description", grade: dg.grade, score: descScore, maxScore: 15, status: dg.status });

  // Headings (15)
  let headScore = 0;
  const h1Count = parsed.headings.filter((h) => h.level === 1).length;
  const h2Count = parsed.headings.filter((h) => h.level === 2).length;
  if (h1Count === 1) headScore += 8;
  else if (h1Count > 1) headScore += 2;
  if (h2Count >= 2) headScore += 7;
  else if (h2Count > 0) headScore += 3;
  const hg = gradeFor(headScore, 15);
  entries.push({ category: "Headings", grade: hg.grade, score: headScore, maxScore: 15, status: hg.status });

  // Content (15)
  let contentScore = 0;
  if (parsed.wordCount >= 300) contentScore += 5;
  if (parsed.wordCount >= 600) contentScore += 5;
  if (parsed.wordCount >= 1200) contentScore += 5;
  const cg = gradeFor(contentScore, 15);
  entries.push({ category: "Content Volume", grade: cg.grade, score: contentScore, maxScore: 15, status: cg.status });

  // Images (10)
  let imgScore = 0;
  const imagesWithAlt = parsed.images.filter((img) => img.hasAlt && img.alt.length > 0).length;
  if (parsed.images.length > 0) {
    imgScore = Math.round((imagesWithAlt / parsed.images.length) * 10);
  } else {
    imgScore = 5;
  }
  const ig = gradeFor(imgScore, 10);
  entries.push({ category: "Image Alt Text", grade: ig.grade, score: imgScore, maxScore: 10, status: ig.status });

  // Links (10)
  let linkScore = 0;
  if (parsed.links.total >= 3) linkScore += 5;
  if (parsed.links.internal >= 2) linkScore += 3;
  if (parsed.links.external >= 1) linkScore += 2;
  const lg = gradeFor(linkScore, 10);
  entries.push({ category: "Linking", grade: lg.grade, score: linkScore, maxScore: 10, status: lg.status });

  // Social (10)
  let socialScore = 0;
  if (parsed.ogTags["og:title"]) socialScore += 3;
  if (parsed.ogTags["og:description"]) socialScore += 2;
  if (parsed.ogTags["og:image"]) socialScore += 3;
  if (parsed.twitterTags["twitter:card"]) socialScore += 2;
  const sg = gradeFor(socialScore, 10);
  entries.push({ category: "Social Tags", grade: sg.grade, score: socialScore, maxScore: 10, status: sg.status });

  // Technical (10)
  let techScore = 0;
  if (parsed.canonical) techScore += 3;
  if (parsed.lang) techScore += 2;
  if (parsed.viewport) techScore += 3;
  if (parsed.statusCode >= 200 && parsed.statusCode < 300) techScore += 2;
  const tcg = gradeFor(techScore, 10);
  entries.push({ category: "Technical", grade: tcg.grade, score: techScore, maxScore: 10, status: tcg.status });

  // Overall — apply same penalties as SEO score
  let totalScore = entries.reduce((sum, e) => sum + e.score, 0);
  const topDensity = topKeywords[0]?.density ?? 0;
  if (topDensity > 5) totalScore -= Math.min(5, Math.round(topDensity - 5));
  const highWeaknesses = insights.filter(
    (i) => i.type === "weakness" && i.severity === "high",
  ).length;
  totalScore -= highWeaknesses * 3;
  totalScore = Math.max(0, Math.min(100, totalScore));
  const overall = gradeFor(totalScore, 100);

  return { overallGrade: overall.grade, entries };
}

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

  // Factor 1: HTTP status
  if (parsed.statusCode >= 200 && parsed.statusCode < 300) {
    factors.push({ label: "Page fetched successfully", status: "good", detail: `HTTP ${parsed.statusCode}` });
  } else if (parsed.statusCode >= 300 && parsed.statusCode < 400) {
    factors.push({ label: "Page redirected", status: "warning", detail: `HTTP ${parsed.statusCode} — followed redirect` });
    score -= 5;
  } else {
    factors.push({ label: "Non-OK HTTP status", status: "bad", detail: `HTTP ${parsed.statusCode}` });
    score -= 20;
  }

  // Factor 2: Content type
  if (parsed.contentType.includes("text/html")) {
    factors.push({ label: "Valid HTML content", status: "good", detail: parsed.contentType });
  } else {
    factors.push({ label: "Non-HTML content type", status: "warning", detail: parsed.contentType });
    score -= 10;
  }

  // Factor 3: Content extraction
  if (parsed.wordCount >= 100) {
    factors.push({ label: "Sufficient content extracted", status: "good", detail: `${parsed.wordCount} words found` });
  } else if (parsed.wordCount >= 30) {
    factors.push({ label: "Limited content extracted", status: "warning", detail: `Only ${parsed.wordCount} words — results may be incomplete` });
    score -= 15;
  } else {
    factors.push({ label: "Very little content extracted", status: "bad", detail: `Only ${parsed.wordCount} words — analysis unreliable` });
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
  if (parsed.rawHtmlLength > 5000) {
    factors.push({ label: "Substantial HTML payload", status: "good", detail: `${(parsed.rawHtmlLength / 1024).toFixed(1)} KB` });
  } else if (parsed.rawHtmlLength > 1000) {
    factors.push({ label: "Small HTML payload", status: "warning", detail: `${(parsed.rawHtmlLength / 1024).toFixed(1)} KB` });
    score -= 5;
  } else {
    factors.push({ label: "Very small HTML", status: "bad", detail: `${parsed.rawHtmlLength} bytes` });
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

export function analyzePage(parsed: ParsedPage): AnalysisResult {
  const words = tokenize(parsed.visibleText);
  const wordCount = words.length;

  // Word frequency
  const wordFrequency = new Map<string, number>();
  for (const word of words) {
    wordFrequency.set(word, (wordFrequency.get(word) ?? 0) + 1);
  }

  // Separate stop words from content words
  let stopWordCount = 0;
  const contentWordFrequency = new Map<string, number>();
  for (const [word, count] of wordFrequency) {
    if (STOP_WORDS.has(word) || FILLER_WORDS.has(word)) {
      stopWordCount += count;
    } else {
      contentWordFrequency.set(word, count);
    }
  }

  // Top keywords (content words only), sorted by count
  const topKeywords: KeywordEntry[] = Array.from(contentWordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({
      word,
      count,
      density: wordCount > 0 ? Math.round((count / wordCount) * 1000) / 10 : 0,
    }));

  // Keyword density for all content words
  const keywordDensity: KeywordEntry[] = Array.from(contentWordFrequency.entries())
    .map(([word, count]) => ({
      word,
      count,
      density: wordCount > 0 ? Math.round((count / wordCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.density - a.density);

  // Overused words (density > 4% with count > 5)
  const overusedWords = keywordDensity.filter(
    (k) => k.density > 4 && k.count > 5,
  );

  // Underused: top keywords that appear only once or twice
  const underusedKeywords = Array.from(contentWordFrequency.entries())
    .filter(([, count]) => count <= 2 && count >= 1)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([word]) => word);

  // N-grams from full word list (includes stop words for phrase context)
  const bigramMap = generateNgrams(words, 2);
  const trigramMap = generateNgrams(words, 3);
  const bigrams = mapToSortedEntries(bigramMap, 20);
  const trigrams = mapToSortedEntries(trigramMap, 15);

  // Readability
  const sentenceCount = countSentences(parsed.visibleText);
  const { score: readabilityScore, label: readabilityLabel } = calculateFleschReadingEase(
    words,
    sentenceCount,
  );

  // Long words (3+ syllables approximated by length > 7)
  const longWords = words.filter((w) => w.length > 7).length;

  // Content quality metrics
  const uniqueWords = wordFrequency.size;
  const lexicalDiversity = wordCount > 0
    ? Math.round((uniqueWords / wordCount) * 1000) / 10
    : 0;
  const avgWordsPerSentence = sentenceCount > 0
    ? Math.round((wordCount / sentenceCount) * 10) / 10
    : 0;

  // Generate insights
  const insights = generateInsights(parsed, topKeywords, overusedWords, readabilityScore);

  // Calculate SEO score
  const seoScore = calculateSeoScore(parsed, topKeywords, insights);

  // Recommended keywords
  const domain = parsed.finalUrl
    ? new URL(parsed.finalUrl).hostname.replace(/^www\./, "")
    : "";
  const recommendedKeywords = recommendKeywords(topKeywords, bigrams, trigrams, domain);

  // New: meta suggestions, action plan, grade card
  const metaSuggestions = generateMetaSuggestions(parsed, topKeywords, bigrams);
  const actionPlan = generateActionPlan(parsed, insights, topKeywords, overusedWords);
  const gradeCard = calculateGradeCard(parsed, topKeywords, insights);
  const verificationChecks = generateVerificationChecks(parsed, readabilityScore);
  const confidence = calculateConfidence(parsed, verificationChecks);

  return {
    parsed,
    wordFrequency,
    topKeywords,
    stopWordCount,
    bigrams,
    trigrams,
    readabilityScore,
    readabilityLabel,
    seoScore,
    keywordDensity,
    overusedWords,
    underusedKeywords,
    recommendedKeywords,
    insights,
    contentQuality: {
      totalWords: wordCount,
      uniqueWords,
      lexicalDiversity,
      avgWordsPerSentence,
      sentenceCount,
      longWords,
    },
    metaSuggestions,
    actionPlan,
    gradeCard,
    verificationChecks,
    confidence,
  };
}
