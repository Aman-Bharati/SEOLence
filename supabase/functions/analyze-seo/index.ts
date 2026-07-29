import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalyzeRequest {
  url: string;
}

interface HeadingInfo {
  level: number;
  text: string;
}

interface ImageInfo {
  src: string;
  alt: string;
  hasAlt: boolean;
}

interface LinkInfo {
  internal: number;
  external: number;
  total: number;
}

interface ParsedPage {
  url: string;
  finalUrl: string;
  title: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonical: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  robots: string | null;
  viewport: string | null;
  charset: string | null;
  lang: string | null;
  headings: HeadingInfo[];
  paragraphs: string[];
  images: ImageInfo[];
  links: LinkInfo;
  bodyText: string;
  visibleText: string;
  wordCount: number;
  rawHtmlLength: number;
  statusCode: number;
  contentType: string;
  error: string | null;
  isClientRendered: boolean;
  renderNote: string | null;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)"
];

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limitInfo = rateLimitMap.get(ip);

  if (!limitInfo) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > limitInfo.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  limitInfo.count++;
  return limitInfo.count > MAX_REQUESTS_PER_WINDOW;
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  return url;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function decodeEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&hellip;": "…",
    "&mdash;": "—",
    "&ndash;": "–",
    "&laquo;": "«",
    "&raquo;": "»",
    "&ldquo;": "\u201C",
    "&rdquo;": "\u201D",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
  };
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }
  // numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_m, code) => String.fromCharCode(parseInt(code, 16)));
  return decoded;
}

function stripTags(html: string): string {
  // remove script and style blocks entirely
  let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, " ");
  cleaned = cleaned.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  cleaned = cleaned.replace(/<template[\s\S]*?<\/template>/gi, " ");
  // remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, " ");
  // remove all tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");
  // decode entities
  cleaned = decodeEntities(cleaned);
  // collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function extractAttribute(tag: string, attr: string): string | null {
  const regex = new RegExp(attr + "\\s*=\\s*[\"']([^\"']*)[\"']", "i");
  const match = tag.match(regex);
  return match ? decodeEntities(match[1]) : null;
}

function extractHeadings(html: string): HeadingInfo[] {
  const headings: HeadingInfo[] = [];
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = stripTags(match[2]).trim();
    if (text) {
      headings.push({ level, text });
    }
  }
  return headings;
}

function extractParagraphs(html: string): string[] {
  const paragraphs: string[] = [];

  // Extract content within common block-level elements
  const blockTags = ["p", "li", "blockquote", "figcaption", "td", "th", "dd", "dt", "label", "span"];
  for (const tag of blockTags) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    let match;
    while ((match = regex.exec(html)) !== null) {
      const text = stripTags(match[1]).trim();
      if (text && text.length > 1) {
        paragraphs.push(text);
      }
    }
  }

  // Also capture heading texts as paragraph-like content blocks
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null) {
    const text = stripTags(hMatch[2]).trim();
    if (text && text.length > 1) {
      paragraphs.push(text);
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return paragraphs.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

function extractImages(html: string, baseUrl: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  const regex = /<img\s[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const src = extractAttribute(tag, "src");
    const alt = extractAttribute(tag, "alt");
    if (src) {
      let resolvedSrc = src;
      try {
        resolvedSrc = new URL(src, baseUrl).href;
      } catch {
        // keep original
      }
      images.push({
        src: resolvedSrc,
        alt: alt ?? "",
        hasAlt: alt !== null,
      });
    }
  }
  return images;
}

function extractLinks(html: string, baseUrl: string, baseDomain: string): LinkInfo {
  let internal = 0;
  let external = 0;
  const regex = /<a\s[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue;
    }
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname.replace(/^www\./, "") === baseDomain) {
        internal++;
      } else {
        external++;
      }
    } catch {
      // relative or malformed — treat as internal
      internal++;
    }
  }
  return { internal, external, total: internal + external };
}

function extractMeta(html: string): {
  description: string | null;
  keywords: string | null;
  canonical: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  robots: string | null;
  viewport: string | null;
  charset: string | null;
} {
  const description = extractMetaContent(html, "name", "description");
  const keywords = extractMetaContent(html, "name", "keywords");
  const robots = extractMetaContent(html, "name", "robots");
  const viewport = extractMetaContent(html, "name", "viewport");

  let charset: string | null = null;
  const charsetMatch = html.match(/<meta\s+charset\s*=\s*["']?([^"'\">\s]+)["']?[^>]*>/i);
  if (charsetMatch) charset = charsetMatch[1];
  if (!charset) {
    charset = extractMetaContent(html, "http-equiv", "Content-Type");
  }

  const canonicalMatch = html.match(/<link\s[^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  let canonical: string | null = null;
  if (canonicalMatch) {
    canonical = extractAttribute(canonicalMatch[0], "href");
  }

  // Open Graph tags
  const ogTags: Record<string, string> = {};
  const ogRegex = /<meta\s+(?:property|name)\s*=\s*["'](og:[^"']+)["']\s+content\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let ogMatch;
  while ((ogMatch = ogRegex.exec(html)) !== null) {
    ogTags[ogMatch[1]] = decodeEntities(ogMatch[2]);
  }

  // Twitter card tags
  const twitterTags: Record<string, string> = {};
  const twitterRegex = /<meta\s+name\s*=\s*["'](twitter:[^"']+)["']\s+content\s*=\s*["']([^"']*)["'][^>]*>/gi;
  let twMatch;
  while ((twMatch = twitterRegex.exec(html)) !== null) {
    twitterTags[twMatch[1]] = decodeEntities(twMatch[2]);
  }

  return { description, keywords, canonical, ogTags, twitterTags, robots, viewport, charset };
}

function extractMetaContent(html: string, attr: string, value: string): string | null {
  const regex = new RegExp(
    `<meta\\s+${attr}\\s*=\\s*["']${value}["']\\s+content\\s*=\\s*["']([^"']*)["'][^>]*>`,
    "i",
  );
  const match = html.match(regex);
  if (match) return decodeEntities(match[1]);
  // reversed order: content before name
  const regex2 = new RegExp(
    `<meta\\s+content\\s*=\\s*["']([^"']*)["']\\s+${attr}\\s*=\\s*["']${value}["'][^>]*>`,
    "i",
  );
  const match2 = html.match(regex2);
  return match2 ? decodeEntities(match2[1]) : null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(stripTags(match[1]).trim()) : null;
}

function extractLang(html: string): string | null {
  const match = html.match(/<html\s[^>]*lang\s*=\s*["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : null;
}

function extractBodyText(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  return stripTags(bodyHtml);
}

function getRandomUserAgent(): string {
  const randomIndex = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[randomIndex];
}

async function fetchPage(
  url: string, 
  retries = 2, 
  delayMs = 1000
): Promise<{ html: string; finalUrl: string; statusCode: number; contentType: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12-second timeout per attempt

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") ?? "text/html";
      const finalUrl = response.url || url;

      if (!contentType.includes("text/html") && !contentType.includes("xml") && !contentType.includes("text/plain")) {
        const text = await response.text();
        return { html: text, finalUrl, statusCode: response.status, contentType };
      }

      const html = await response.text();
      return { html, finalUrl, statusCode: response.status, contentType };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Attempt ${attempt} failed for crawling ${url}: ${lastError.message}`);
      
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error(`Failed to crawl URL after ${retries} attempts.`);
}

function extractNoscriptContent(html: string): string {
  const match = html.match(/<noscript[^>]*>([\s\S]*?)<\/noscript>/i);
  if (!match) return "";
  return stripTags(match[1]).trim();
}

function detectClientRendered(html: string, bodyText: string): { isClientRendered: boolean; note: string | null } {
  const hasRootDiv = /<div\s+id=["'](root|app|__next)["']/.test(html);
  const hasJsBundle = /<script[^>]+src=["'][^"']*\.js["']/.test(html);
  const hasDataReactRoot = /data-reactroot|__NEXT_DATA__|window\.__INITIAL/i.test(html);
  const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

  // SPA signature: root div + JS bundle + almost no visible body text
  if (hasRootDiv && hasJsBundle && wordCount < 50) {
    return {
      isClientRendered: true,
      note: "This page is a client-side rendered SPA (React/Vue/Next.js etc.). The HTML returned by the server contains only a mount point — actual content is injected by JavaScript after load. Static crawling cannot execute JS, so body text, headings, and images will be incomplete. Meta tags in <head> are still captured. For full analysis, use a server-side rendered or pre-rendered version of the page.",
    };
  }

  // Next.js-style hydration with minimal static content
  if (hasDataReactRoot && wordCount < 50) {
    return {
      isClientRendered: true,
      note: "This page appears to use client-side hydration with minimal server-rendered content. Body text extraction will be limited.",
    };
  }

  return { isClientRendered: false, note: null };
}

function parsePage(html: string, url: string, finalUrl: string, statusCode: number, contentType: string): ParsedPage {
  const domain = getDomain(finalUrl);
  const title = extractTitle(html);
  const meta = extractMeta(html);
  const headings = extractHeadings(html);
  const paragraphs = extractParagraphs(html);
  const images = extractImages(html, finalUrl);
  const links = extractLinks(html, finalUrl, domain);
  const lang = extractLang(html);
  const bodyText = extractBodyText(html);

  // Detect client-side rendering
  const { isClientRendered, note } = detectClientRendered(html, bodyText);

  // If client-rendered, try to use noscript fallback content
  let visibleText = bodyText;
  if (isClientRendered) {
    const noscriptText = extractNoscriptContent(html);
    if (noscriptText.length > bodyText.length) {
      visibleText = noscriptText;
    }
  }

  const wordCount = visibleText.split(/\s+/).filter((w) => w.length > 0).length;

  return {
    url,
    finalUrl,
    title,
    metaDescription: meta.description,
    metaKeywords: meta.keywords,
    canonical: meta.canonical,
    ogTags: meta.ogTags,
    twitterTags: meta.twitterTags,
    robots: meta.robots,
    viewport: meta.viewport,
    charset: meta.charset,
    lang,
    headings,
    paragraphs,
    images,
    links,
    bodyText,
    visibleText,
    wordCount,
    rawHtmlLength: html.length,
    statusCode,
    contentType,
    error: null,
    isClientRendered,
    renderNote: note,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const clientIp = req.headers.get("cf-connecting-ip") || 
                   req.headers.get("x-real-ip") || 
                   req.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                   "unknown-client";

  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many crawl requests from this IP. Please wait a minute before trying again." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json() as AnalyzeRequest;
    const { url: rawUrl } = body;

    if (!rawUrl || typeof rawUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = normalizeUrl(rawUrl);

    // validate URL
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { html, finalUrl, statusCode, contentType } = await fetchPage(url);
    const parsed = parsePage(html, url, finalUrl, statusCode, contentType);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
