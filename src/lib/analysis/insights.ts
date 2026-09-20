import type { ParsedPage, KeywordEntry, InsightItem } from "../../types.ts";
import { NEGATIVE_SEO_HINTS } from "../shared/stopwords.ts";

export function generateInsights(
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
    message: "Link to 3-5 related pages on your site using descriptive anchor text (not 'click here'). This distributes PageRank and helps screen readers/search engines discover content.",
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
