import type { ParsedPage, InsightItem, KeywordEntry, ActionItem, GradeCard, GradeEntry } from "../../types.ts";

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
      `Create a 120-155 character description that includes your primary keyword and a call-to-action. This directly impacts click-through rate from search results.`,
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
