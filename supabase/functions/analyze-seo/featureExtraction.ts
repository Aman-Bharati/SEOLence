import { HeadingInfo, ImageInfo, LinkInfo } from "./types.ts";

export interface UnifiedFeatureModel {
  url: string;
  finalUrl: string;
  metadata: {
    title: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    canonical: string | null;
    robots: string | null;
    viewport: string | null;
    charset: string | null;
    lang: string | null;
    hreflangTags: { lang: string; href: string }[];
    ogTags: Record<string, string>;
    twitterTags: Record<string, string>;
  };
  headings: {
    list: HeadingInfo[];
    hasHeadingSequenceViolation: boolean;
  };
  paragraphs: {
    list: string[];
    bodyText: string;
    visibleText: string;
    wordCount: number;
  };
  links: {
    list: { href: string; isInternal: boolean; text: string }[];
    counts: LinkInfo;
  };
  images: {
    list: ImageInfo[];
    imagesMissingAltCount: number;
    totalImagesCount: number;
  };
  navigation: {
    hasMainTag: boolean;
    hasHeaderTag: boolean;
    hasNavTag: boolean;
    hasFooterTag: boolean;
    nonSemanticLandmarks: boolean;
  };
  schema: {
    hasJsonLd: boolean;
    hasMicrodata: boolean;
  };
  accessibility: {
    missingFormLabelsCount: number;
    emptyButtonsCount: number;
    emptyLinksCount: number;
    zoomDisabled: boolean;
    iframeMissingTitle: boolean;
  };
  security: {
    hasCsp: boolean;
    hasHsts: boolean;
    hasXFrame: boolean;
    hasXContentType: boolean;
    cspHeader: string | null;
    hstsHeader: string | null;
    xFrameHeader: string | null;
    xContentTypeHeader: string | null;
    referrerPolicy: string | null;
    permissionsPolicy: string | null;
    hasSecurityTxt: boolean;
    hasMixedContent: boolean;
    mixedContentUrls: string[];
    hasDirectoryListing: boolean;
    sriScore: number;
    sriMissingUrls: string[];
    cookies: {
      name: string;
      isHttpOnly: boolean;
      isSecure: boolean;
      sameSite: string | null;
    }[];
  };
  performance: {
    lcp: number | null;
    cls: number | null;
    fcp: number | null;
    tbt: number | null;
    speedIndex: number | null;
  };
}

export interface ExtractionContext {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  headers: Record<string, string>;
  responseTimeMs: number;
  loadTimeMs: number;
  certificateValid: boolean | null;
  certificateError: string | null;
  setCookieHeader: string[];
  hasSecurityTxt: boolean;
  robotsTxtExists: boolean;
  robotsTxtContent: string | null;
  sitemapExists: boolean;
  sitemapUrl: string | null;
  redirectChain: string[];
  psiMetrics: {
    lcp: number | null;
    cls: number | null;
    fcp: number | null;
    tbt: number | null;
    speedIndex: number | null;
  } | null;
}

export interface IFeatureExtractor<T> {
  id: string;
  extract(document: any, context: ExtractionContext): T;
}

// Helper: Extract visible text from Linkedom node
export function extractVisibleText(node: any): string {
  if (!node) return "";
  const tagName = node.tagName;
  if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "NOSCRIPT" || tagName === "HEAD" || tagName === "SVG" || tagName === "IFRAME" || tagName === "TEMPLATE") {
    return "";
  }
  if (node.nodeType === 3) {
    return node.nodeValue || "";
  }
  let text = "";
  if (node.childNodes) {
    for (let i = 0; i < node.childNodes.length; i++) {
      text += " " + extractVisibleText(node.childNodes[i]);
    }
  }
  return text;
}

// 1. Metadata Extractor
export class MetadataExtractor implements IFeatureExtractor<UnifiedFeatureModel["metadata"]> {
  id = "metadata";

  extract(document: any, _context: ExtractionContext): UnifiedFeatureModel["metadata"] {
    const titleEl = document.querySelector("title");
    const title = titleEl ? titleEl.textContent.trim() : null;

    const htmlEl = document.querySelector("html");
    const lang = htmlEl ? htmlEl.getAttribute("lang") : null;

    const descEl = document.querySelector('meta[name="description" i]');
    const metaDescription = descEl ? descEl.getAttribute("content") || null : null;

    const keyEl = document.querySelector('meta[name="keywords" i]');
    const metaKeywords = keyEl ? keyEl.getAttribute("content") || null : null;

    const robotsEl = document.querySelector('meta[name="robots" i]');
    const robots = robotsEl ? robotsEl.getAttribute("content") || null : null;

    const viewportEl = document.querySelector('meta[name="viewport" i]');
    const viewport = viewportEl ? viewportEl.getAttribute("content") || null : null;

    const canonicalEl = document.querySelector('link[rel="canonical" i]');
    const canonical = canonicalEl ? canonicalEl.getAttribute("href") || null : null;

    const charsetEl = document.querySelector("meta[charset]");
    let charset = charsetEl ? charsetEl.getAttribute("charset") || null : null;
    if (!charset) {
      const contentTypeMeta = document.querySelector('meta[http-equiv="content-type" i]');
      const contentAttr = contentTypeMeta ? contentTypeMeta.getAttribute("content") : null;
      if (contentAttr) {
        const match = contentAttr.match(/charset=([^\s;]+)/i);
        if (match) charset = match[1];
      }
    }

    const hreflangTags: { lang: string; href: string }[] = [];
    const hreflangElements = document.querySelectorAll('link[rel="alternate" i][hreflang]');
    for (const el of hreflangElements) {
      const hLang = el.getAttribute("hreflang");
      const href = el.getAttribute("href");
      if (hLang && href) {
        hreflangTags.push({ lang: hLang, href });
      }
    }

    const ogTags: Record<string, string> = {};
    const ogElements = document.querySelectorAll('meta[property^="og:" i], meta[name^="og:" i]');
    for (const el of ogElements) {
      const property = el.getAttribute("property") || el.getAttribute("name");
      const content = el.getAttribute("content");
      if (property && content) ogTags[property.toLowerCase()] = content;
    }

    const twitterTags: Record<string, string> = {};
    const twitterElements = document.querySelectorAll('meta[name^="twitter:" i]');
    for (const el of twitterElements) {
      const name = el.getAttribute("name");
      const content = el.getAttribute("content");
      if (name && content) twitterTags[name.toLowerCase()] = content;
    }

    return {
      title,
      metaDescription,
      metaKeywords,
      canonical,
      robots,
      viewport,
      charset,
      lang,
      hreflangTags,
      ogTags,
      twitterTags,
    };
  }
}

// 2. Heading Extractor
export class HeadingExtractor implements IFeatureExtractor<UnifiedFeatureModel["headings"]> {
  id = "headings";

  extract(document: any, _context: ExtractionContext): UnifiedFeatureModel["headings"] {
    const list: HeadingInfo[] = [];
    const headingElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (const el of headingElements) {
      const level = parseInt(el.tagName.substring(1), 10);
      const text = el.textContent.trim();
      if (text) list.push({ level, text });
    }

    let prevLevel = 0;
    let hasHeadingSequenceViolation = false;
    for (const h of list) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        hasHeadingSequenceViolation = true;
        break;
      }
      prevLevel = h.level;
    }

    return {
      list,
      hasHeadingSequenceViolation,
    };
  }
}

// 3. Paragraphs Extractor
export class ParagraphsExtractor implements IFeatureExtractor<UnifiedFeatureModel["paragraphs"]> {
  id = "paragraphs";

  extract(document: any, context: ExtractionContext): UnifiedFeatureModel["paragraphs"] {
    const list: string[] = [];
    const pElements = document.querySelectorAll("p, li, blockquote, figcaption, td, th, dd, dt, label, span, h1, h2, h3, h4, h5, h6");
    const seen = new Set<string>();

    for (const el of pElements) {
      const text = el.textContent.trim().replace(/\s+/g, " ");
      if (text && text.length > 1 && !seen.has(text)) {
        const tagName = el.tagName;
        if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "NOSCRIPT" || tagName === "TEMPLATE") {
          continue;
        }

        let parent = el.parentNode;
        let inForbidden = false;
        while (parent) {
          const pTagName = parent.tagName;
          if (pTagName === "SCRIPT" || pTagName === "STYLE" || pTagName === "NOSCRIPT" || pTagName === "HEAD" || pTagName === "SVG" || pTagName === "TEMPLATE") {
            inForbidden = true;
            break;
          }
          parent = parent.parentNode;
        }

        if (!inForbidden) {
          list.push(text);
          seen.add(text);
        }
      }
    }

    const bodyText = extractVisibleText(document.body || document.documentElement).replace(/\s+/g, " ").trim();
    let visibleText = bodyText;

    const isClientRendered = context.psiMetrics === null; // basic heuristic if PSI isn't run, check context notes
    if (isClientRendered) {
      const noscriptEl = document.querySelector("noscript");
      const noscriptText = noscriptEl ? extractVisibleText(noscriptEl).trim().replace(/\s+/g, " ") : "";
      if (noscriptText.length > bodyText.length) {
        visibleText = noscriptText;
      }
    }

    const wordCount = visibleText.split(/\s+/).filter((w) => w.length > 0).length;

    return {
      list,
      bodyText,
      visibleText,
      wordCount,
    };
  }
}

// 4. Link Extractor
export class LinkExtractor implements IFeatureExtractor<UnifiedFeatureModel["links"]> {
  id = "links";

  extract(document: any, context: ExtractionContext): UnifiedFeatureModel["links"] {
    const list: { href: string; isInternal: boolean; text: string }[] = [];
    let internal = 0;
    let external = 0;
    const baseDomain = new URL(context.finalUrl).hostname.replace(/^www\./, "");

    const aElements = document.querySelectorAll("a");
    for (const el of aElements) {
      const href = el.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
        continue;
      }

      let isInternal = true;
      try {
        const resolved = new URL(href, context.finalUrl);
        if (resolved.hostname.replace(/^www\./, "") === baseDomain) {
          internal++;
        } else {
          isInternal = false;
          external++;
        }
      } catch {
        internal++;
      }

      list.push({
        href,
        isInternal,
        text: el.textContent.trim()
      });
    }

    return {
      list,
      counts: { internal, external, total: internal + external }
    };
  }
}

// 5. Image Extractor
export class ImageExtractor implements IFeatureExtractor<UnifiedFeatureModel["images"]> {
  id = "images";

  extract(document: any, context: ExtractionContext): UnifiedFeatureModel["images"] {
    const list: ImageInfo[] = [];
    const imgElements = document.querySelectorAll("img");

    for (const el of imgElements) {
      const src = el.getAttribute("src");
      const alt = el.getAttribute("alt");
      if (src) {
        let resolvedSrc = src;
        try {
          resolvedSrc = new URL(src, context.finalUrl).href;
        } catch {
          // ignore
        }
        list.push({
          src: resolvedSrc,
          alt: alt ?? "",
          hasAlt: alt !== null,
        });
      }
    }

    const totalImagesCount = list.length;
    const imagesMissingAltCount = list.filter(img => !img.hasAlt || img.alt.trim().length === 0).length;

    return {
      list,
      imagesMissingAltCount,
      totalImagesCount,
    };
  }
}

// 6. Navigation Extractor
export class NavigationExtractor implements IFeatureExtractor<UnifiedFeatureModel["navigation"]> {
  id = "navigation";

  extract(document: any, _context: ExtractionContext): UnifiedFeatureModel["navigation"] {
    const mainTag = document.querySelector("main, [role='main' i]");
    const headerTag = document.querySelector("header, [role='banner' i]");
    const navTag = document.querySelector("nav, [role='navigation' i]");
    const footerTag = document.querySelector("footer, [role='contentinfo' i]");

    return {
      hasMainTag: mainTag !== null,
      hasHeaderTag: headerTag !== null,
      hasNavTag: navTag !== null,
      hasFooterTag: footerTag !== null,
      nonSemanticLandmarks: !mainTag || !headerTag || !navTag || !footerTag,
    };
  }
}

// 7. Schema Extractor
export class SchemaExtractor implements IFeatureExtractor<UnifiedFeatureModel["schema"]> {
  id = "schema";

  extract(document: any, _context: ExtractionContext): UnifiedFeatureModel["schema"] {
    const hasJsonLd = document.querySelector('script[type="application/ld+json"]') !== null;
    const hasMicrodata = document.querySelector('[itemscope]') !== null;

    return {
      hasJsonLd,
      hasMicrodata,
    };
  }
}

// 8. Accessibility Extractor
export class AccessibilityExtractor implements IFeatureExtractor<UnifiedFeatureModel["accessibility"]> {
  id = "accessibility";

  extract(document: any, _context: ExtractionContext): UnifiedFeatureModel["accessibility"] {
    // Missing Form Labels
    let missingFormLabelsCount = 0;
    const formControls = document.querySelectorAll("input:not([type='hidden' i]):not([type='submit' i]):not([type='button' i]), textarea, select");
    for (const el of formControls) {
      let parent = el.parentNode;
      let hasLabelParent = false;
      while (parent) {
        if (parent.tagName === "LABEL") {
          hasLabelParent = true;
          break;
        }
        parent = parent.parentNode;
      }
      if (hasLabelParent) continue;

      const id = el.getAttribute("id");
      let hasLabelFor = false;
      if (id) {
        const matchingLabel = document.querySelector(`label[for="${id}" i]`);
        if (matchingLabel) hasLabelFor = true;
      }
      if (hasLabelFor) continue;

      const ariaLabel = el.getAttribute("aria-label");
      const ariaLabelledby = el.getAttribute("aria-labelledby");
      if ((ariaLabel && ariaLabel.trim().length > 0) || (ariaLabelledby && ariaLabelledby.trim().length > 0)) {
        continue;
      }
      missingFormLabelsCount++;
    }

    // Empty Buttons
    let emptyButtonsCount = 0;
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      const ariaLabel = btn.getAttribute("aria-label");
      const ariaLabelledby = btn.getAttribute("aria-labelledby");
      if (text.length > 0) continue;
      if (ariaLabel && ariaLabel.trim().length > 0) continue;
      if (ariaLabelledby && ariaLabelledby.trim().length > 0) continue;
      const innerImg = btn.querySelector("img");
      if (innerImg) {
        const alt = innerImg.getAttribute("alt");
        if (alt && alt.trim().length > 0) continue;
      }
      emptyButtonsCount++;
    }

    // Empty Links
    let emptyLinksCount = 0;
    const rawLinks = document.querySelectorAll("a[href]");
    for (const lnk of rawLinks) {
      const text = lnk.textContent.trim();
      const ariaLabel = lnk.getAttribute("aria-label");
      const ariaLabelledby = lnk.getAttribute("aria-labelledby");
      if (text.length > 0) continue;
      if (ariaLabel && ariaLabel.trim().length > 0) continue;
      if (ariaLabelledby && ariaLabelledby.trim().length > 0) continue;
      const innerImg = lnk.querySelector("img");
      if (innerImg) {
        const alt = innerImg.getAttribute("alt");
        if (alt && alt.trim().length > 0) continue;
      }
      emptyLinksCount++;
    }

    // Zoom scaling restrictions
    let zoomDisabled = false;
    const viewportEl = document.querySelector('meta[name="viewport" i]');
    const viewport = viewportEl ? viewportEl.getAttribute("content") || null : null;
    if (viewport) {
      const viewportLower = viewport.toLowerCase();
      if (viewportLower.includes("user-scalable=no") || viewportLower.includes("user-scalable=0") || /maximum-scale=[0-1](\.[0-9]+)?/i.test(viewportLower)) {
        zoomDisabled = true;
      }
    }

    // Iframes missing title
    let iframeMissingTitle = false;
    const iframes = document.querySelectorAll("iframe");
    for (const frame of iframes) {
      const titleAttr = frame.getAttribute("title");
      if (!titleAttr || titleAttr.trim().length === 0) {
        iframeMissingTitle = true;
        break;
      }
    }

    return {
      missingFormLabelsCount,
      emptyButtonsCount,
      emptyLinksCount,
      zoomDisabled,
      iframeMissingTitle,
    };
  }
}

// 9. Security Extractor
export class SecurityExtractor implements IFeatureExtractor<UnifiedFeatureModel["security"]> {
  id = "security";

  extract(document: any, context: ExtractionContext): UnifiedFeatureModel["security"] {
    const cspHeader = context.headers["content-security-policy"] || null;
    const hstsHeader = context.headers["strict-transport-security"] || null;
    const xFrameHeader = context.headers["x-frame-options"] || null;
    const xContentTypeHeader = context.headers["x-content-type-options"] || null;
    const referrerPolicy = context.headers["referrer-policy"] || null;
    const permissionsPolicy = context.headers["permissions-policy"] || null;

    const baseDomain = new URL(context.finalUrl).hostname.replace(/^www\./, "");

    // Mixed Content
    let hasMixedContent = false;
    const mixedContentUrls: string[] = [];
    if (context.finalUrl.startsWith("https://")) {
      const mixedElements = document.querySelectorAll("script[src^='http://'], link[rel='stylesheet' i][href^='http://'], img[src^='http://'], iframe[src^='http://']");
      for (const el of mixedElements) {
        const urlAttr = el.getAttribute("src") || el.getAttribute("href");
        if (urlAttr) {
          mixedContentUrls.push(urlAttr);
        }
      }
      hasMixedContent = mixedContentUrls.length > 0;
    }

    // SRI Checks
    let sriExternalCount = 0;
    let sriWithIntegrityCount = 0;
    const sriMissingUrls: string[] = [];
    const sriElements = document.querySelectorAll("script[src], link[rel='stylesheet' i][href]");
    for (const el of sriElements) {
      const src = el.getAttribute("src") || el.getAttribute("href");
      if (src) {
        try {
          const srcUrl = new URL(src, context.finalUrl);
          if (srcUrl.hostname !== baseDomain) {
            sriExternalCount++;
            const integrity = el.getAttribute("integrity");
            if (integrity && integrity.trim().length > 0) {
              sriWithIntegrityCount++;
            } else {
              sriMissingUrls.push(src);
            }
          }
        } catch {
          // ignore
        }
      }
    }
    const sriScore = sriExternalCount > 0 ? Math.round((sriWithIntegrityCount / sriExternalCount) * 100) : 100;

    // Directory Listing checks
    const titleEl = document.querySelector("title");
    const title = titleEl ? titleEl.textContent.trim() : "";
    const titleLower = title.toLowerCase();
    const bodyText = extractVisibleText(document.body || document.documentElement).replace(/\s+/g, " ").trim();
    const hasDirectoryListing = titleLower.includes("index of /") ||
      titleLower.includes("directory listing") ||
      bodyText.includes("Index of /");

    // Cookies mapping
    const cookies = context.setCookieHeader.map(cookieStr => {
      const parts = cookieStr.split(";").map(p => p.trim());
      const namePart = parts[0] || "";
      const name = namePart.split("=")[0] || "cookie";
      const isHttpOnly = parts.some(p => p.toLowerCase() === "httponly");
      const isSecure = parts.some(p => p.toLowerCase() === "secure");
      let sameSite: string | null = null;
      for (const p of parts) {
        const match = p.match(/samesite=([^\s;]+)/i);
        if (match) {
          sameSite = match[1];
          break;
        }
      }
      return { name, isHttpOnly, isSecure, sameSite };
    });

    return {
      hasCsp: cspHeader !== null,
      hasHsts: hstsHeader !== null,
      hasXFrame: xFrameHeader !== null,
      hasXContentType: xContentTypeHeader !== null,
      cspHeader,
      hstsHeader,
      xFrameHeader,
      xContentTypeHeader,
      referrerPolicy,
      permissionsPolicy,
      hasSecurityTxt: context.hasSecurityTxt,
      hasMixedContent,
      mixedContentUrls,
      hasDirectoryListing,
      sriScore,
      sriMissingUrls,
      cookies,
    };
  }
}

// 10. Performance Extractor
export class PerformanceExtractor implements IFeatureExtractor<UnifiedFeatureModel["performance"]> {
  id = "performance";

  extract(_document: any, context: ExtractionContext): UnifiedFeatureModel["performance"] {
    const psi = context.psiMetrics || { lcp: null, cls: null, fcp: null, tbt: null, speedIndex: null };
    return {
      lcp: psi.lcp,
      cls: psi.cls,
      fcp: psi.fcp,
      tbt: psi.tbt,
      speedIndex: psi.speedIndex,
    };
  }
}

// -------------------------------------------------------------
// Core Feature Extraction Engine Coordinator
// -------------------------------------------------------------
export class FeatureExtractionEngine {
  private extractors: IFeatureExtractor<any>[] = [];

  constructor() {
    this.extractors.push(new MetadataExtractor());
    this.extractors.push(new HeadingExtractor());
    this.extractors.push(new ParagraphsExtractor());
    this.extractors.push(new LinkExtractor());
    this.extractors.push(new ImageExtractor());
    this.extractors.push(new NavigationExtractor());
    this.extractors.push(new SchemaExtractor());
    this.extractors.push(new AccessibilityExtractor());
    this.extractors.push(new SecurityExtractor());
    this.extractors.push(new PerformanceExtractor());
  }

  extract(document: any, context: ExtractionContext): UnifiedFeatureModel {
    const metadata = this.extractors.find(e => e.id === "metadata")!.extract(document, context);
    const headings = this.extractors.find(e => e.id === "headings")!.extract(document, context);
    const paragraphs = this.extractors.find(e => e.id === "paragraphs")!.extract(document, context);
    const links = this.extractors.find(e => e.id === "links")!.extract(document, context);
    const images = this.extractors.find(e => e.id === "images")!.extract(document, context);
    const navigation = this.extractors.find(e => e.id === "navigation")!.extract(document, context);
    const schema = this.extractors.find(e => e.id === "schema")!.extract(document, context);
    const accessibility = this.extractors.find(e => e.id === "accessibility")!.extract(document, context);
    const security = this.extractors.find(e => e.id === "security")!.extract(document, context);
    const performance = this.extractors.find(e => e.id === "performance")!.extract(document, context);

    return {
      url: context.url,
      finalUrl: context.finalUrl,
      metadata,
      headings,
      paragraphs,
      links,
      images,
      navigation,
      schema,
      accessibility,
      security,
      performance,
    };
  }
}
