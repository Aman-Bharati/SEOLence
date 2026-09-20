// Gemini AI Fix Generator Module for SentinelQA
export interface GeminiFixResponse {
  titles: { option: string; text: string; impact: string }[];
  descriptions: { option: string; text: string; impact: string }[];
  schemaJsonLd: string;
  headingOutline: string;
  contentSuggestions: string[];
  faqSchema: string;
  entities: string[];
  metaTagsCode: string;
  nextJsMetadataCode: string;
  wordPressJsonCode: string;
  isRealAi: boolean;
}

export async function generateGeminiFixes(
  url: string,
  currentTitle: string | null,
  currentDescription: string | null,
  topKeywords: { word: string; count: number; density: number }[],
  headings: { level: number; text: string }[],
  _paragraphs: string[]
): Promise<GeminiFixResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const primaryKw = topKeywords[0]?.word || "target keyword";
  const secondaryKw = topKeywords[1]?.word || "";

  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "website";
    }
  })();
  const brandName = domain.split(".")[0].toUpperCase();

  // Primary Gemini 1.5 Flash API Integration
  if (apiKey) {
    try {
      const prompt = `You are a world-class Technical SEO & Web Architect. Analyze this web page and generate optimized SEO metadata:
URL: ${url}
Brand Name: ${brandName}
Current Title: ${currentTitle || "None"}
Current Meta Description: ${currentDescription || "None"}
Top Keywords: ${topKeywords.slice(0, 5).map(k => k.word).join(", ")}
Headings Summary: ${headings.slice(0, 5).map(h => `H${h.level}: ${h.text}`).join(" | ")}

Return ONLY a raw JSON object (no markdown codeblock wrapper) matching this exact TS interface:
{
  "titles": [
    {"option": "Keyword-First (Search Rank)", "text": "...", "impact": "..."},
    {"option": "Brand Authority", "text": "...", "impact": "..."},
    {"option": "High CTR Question Hook", "text": "...", "impact": "..."}
  ],
  "descriptions": [
    {"option": "Feature-Focused & CTA", "text": "...", "impact": "..."},
    {"option": "Benefit & Value Proposition", "text": "...", "impact": "..."}
  ],
  "schemaJsonLd": "valid json-ld string...",
  "headingOutline": "HTML string outline...",
  "contentSuggestions": ["suggestion 1", "suggestion 2"],
  "faqSchema": "valid FAQ JSON-LD string...",
  "entities": ["Entity 1", "Entity 2"],
  "metaTagsCode": "HTML head string...",
  "nextJsMetadataCode": "Next.js export const metadata object string...",
  "wordPressJsonCode": "JSON snippet string..."
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          return { ...parsed, isRealAi: true };
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to rule engine:", err);
    }
  }

  // Fallback Template Fix Engine
  const titleText = `${primaryKw.charAt(0).toUpperCase() + primaryKw.slice(1)} - Complete Optimization Guide | ${brandName}`;
  const descText = `Discover top tips, examples, and actionable guides for ${primaryKw}. Improve your website search visibility and performance today.`;
  const schemaJsonLd = `{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "${brandName}",
  "url": "${url}"
}`;

  return {
    titles: [
      {
        option: "Keyword-First (Search Rank)",
        text: titleText,
        impact: "Maximizes keyword weight at start of title for higher search indexing.",
      },
      {
        option: "Brand Authority",
        text: `${brandName} | Complete Guide to ${primaryKw}`,
        impact: "Reinforces brand authority while preserving target search alignment.",
      },
      {
        option: "High CTR Question Hook",
        text: `How to Master ${primaryKw.toUpperCase()} in 2026? Tips & Examples`,
        impact: "Drives higher click-through rates by directly answering search intent queries.",
      },
    ],
    descriptions: [
      {
        option: "Feature-Focused & CTA",
        text: descText,
        impact: "Includes actionable CTA and target terms to boost SERP snippet clicks.",
      },
      {
        option: "Benefit & Value Proposition",
        text: `Looking for the best way to optimize ${secondaryKw || primaryKw}? Read our expert analysis for accessibility and SEO.`,
        impact: "Appeals directly to visitor intent in search engine listings.",
      },
    ],
    schemaJsonLd,
    headingOutline: `<h1>${primaryKw} Guide</h1>\n<h2>What is ${primaryKw}?</h2>\n<h2>Key Implementation Steps</h2>`,
    contentSuggestions: [
      `Expand content volume for "${primaryKw}" to aim for at least 1,200 words.`,
      `Place primary keyword "${primaryKw}" naturally within the first 100 words of introductory paragraph.`,
    ],
    faqSchema: `{ "@context": "https://schema.org", "@type": "FAQPage" }`,
    entities: [primaryKw, secondaryKw, "SEO", "Schema Markup"].filter(Boolean),
    metaTagsCode: `<title>${titleText}</title>\n<meta name="description" content="${descText}" />\n<link rel="canonical" href="${url}" />`,
    nextJsMetadataCode: `export const metadata = {\n  title: "${titleText}",\n  description: "${descText}",\n};`,
    wordPressJsonCode: `{\n  "title": "${titleText}",\n  "description": "${descText}"\n}`,
    isRealAi: false,
  };
}
