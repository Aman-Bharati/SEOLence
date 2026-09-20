import { DOMParser } from "https://esm.sh/linkedom@0.16.8?external=canvas";

export interface DecisionResult {
  isClientRendered: boolean;
  confidenceScore: number;
  signals: Record<string, boolean | number>;
  note: string | null;
}

export class CrawlDecisionEngine {
  /**
   * Evaluates the raw HTML and initial DOM tree to compute a Render Confidence Score.
   * A lower score indicates that the page relies heavily on client-side JS and requires rendering.
   */
  static evaluate(html: string): DecisionResult {
    let confidenceScore = 100;
    const signals: Record<string, boolean | number> = {};

    let document;
    try {
      document = new DOMParser().parseFromString(html, "text/html");
    } catch {
      // Malformed HTML is an immediate trigger for browser fallback
      return {
        isClientRendered: true,
        confidenceScore: 0,
        signals: { malformedHtml: true },
        note: "Malformed HTML. Browser rendering triggered as safe fallback.",
      };
    }

    // 1. Framework & Hydration Markers (React, Next.js, Vue, Angular, Nuxt)
    const hasReactRoot = /data-reactroot|__NEXT_DATA__|window\.__INITIAL/i.test(html);
    const hasVue = /data-v-|__NUXT_JSON__/i.test(html);
    const hasAngular = /ng-version|ng-app/i.test(html);
    const hasNextData = html.includes("__NEXT_DATA__");

    signals.hasReactRoot = hasReactRoot;
    signals.hasVue = hasVue;
    signals.hasAngular = hasAngular;
    signals.hasNextData = hasNextData;

    if (hasReactRoot) confidenceScore -= 20;
    if (hasVue) confidenceScore -= 20;
    if (hasAngular) confidenceScore -= 20;
    if (hasNextData) confidenceScore -= 10;

    // 2. Mount Containers
    const mountEl = document.querySelector("#root, #app, #__next, div[id='root' i], div[id='app' i]");
    const hasMountEl = mountEl !== null;
    signals.hasMountEl = hasMountEl;
    if (hasMountEl) confidenceScore -= 25;

    // 3. Scripts and JS Bundles Count
    const scriptElements = document.querySelectorAll("script[src]");
    const jsBundleCount = scriptElements.length;
    signals.jsBundleCount = jsBundleCount;
    if (jsBundleCount > 5) confidenceScore -= 10;
    else if (jsBundleCount > 2) confidenceScore -= 5;

    // 4. Script to Content Character Ratio
    const totalCharCount = html.length;
    const scriptTagElements = document.querySelectorAll("script");
    let scriptCharCount = 0;
    for (const el of scriptTagElements) {
      scriptCharCount += (el.textContent || "").length;
    }
    const scriptRatio = totalCharCount > 0 ? scriptCharCount / totalCharCount : 0;
    signals.scriptRatio = Math.round(scriptRatio * 100) / 100;
    if (scriptRatio > 0.6) confidenceScore -= 20;
    else if (scriptRatio > 0.4) confidenceScore -= 10;

    // 5. DOM Complexity & Word Count
    const allTags = document.querySelectorAll("*");
    const domComplexity = allTags.length;
    signals.domComplexity = domComplexity;

    const bodyText = (document.body?.textContent || "").trim().replace(/\s+/g, " ");
    const wordCount = bodyText.split(/\s+/).filter((w: string) => w.length > 0).length;
    signals.wordCount = wordCount;

    // High complexity but very low text content usually implies SPA shell
    const wordToTagRatio = domComplexity > 0 ? wordCount / domComplexity : 0;
    signals.wordToTagRatio = Math.round(wordToTagRatio * 100) / 100;
    if (domComplexity > 100 && wordCount < 80) {
      confidenceScore -= 30;
    } else if (domComplexity > 50 && wordCount < 40) {
      confidenceScore -= 20;
    }

    // 6. Navigation, Heading, & Canonical Signals
    const headings = document.querySelectorAll("h1, h2, h3");
    const hasHeadings = headings.length > 0;
    signals.hasHeadings = hasHeadings;
    if (!hasHeadings) confidenceScore -= 10;

    const paragraphs = document.querySelectorAll("p");
    const hasParagraphs = paragraphs.length > 0;
    signals.hasParagraphs = hasParagraphs;
    if (!hasParagraphs) confidenceScore -= 10;

    const nav = document.querySelector("nav, ul, ol");
    const hasNav = nav !== null;
    signals.hasNav = hasNav;
    if (!hasNav) confidenceScore -= 10;

    const canonical = document.querySelector('link[rel="canonical" i]');
    const hasCanonical = canonical !== null;
    signals.hasCanonical = hasCanonical;
    if (!hasCanonical) confidenceScore -= 5;

    // Normalize final score bounds [0, 100]
    const finalScore = Math.max(0, Math.min(100, confidenceScore));

    // Browser rendering fallback is triggered if the confidence score falls below 60
    const isClientRendered = finalScore < 60;
    let note = null;
    if (isClientRendered) {
      note = `Low HTML render confidence (${finalScore}/100). The page appears to require JavaScript execution (SPA structure). Dynamic fallback triggered.`;
    }

    return {
      isClientRendered,
      confidenceScore: finalScore,
      signals,
      note,
    };
  }
}
