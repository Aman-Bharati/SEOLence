import { validateUrlSafe, getRandomUserAgent } from "./securityGateway.ts";

export interface RenderOptions {
  timeoutMs?: number;
  blockResources?: string[]; // e.g. ['css', 'images', 'trackers']
  userAgent?: string;
  usePlaywright?: boolean;
}

export interface RenderResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  contentType: string;
  headers: Record<string, string>;
  responseTimeMs: number;
  loadTimeMs: number;
  certificateValid: boolean | null;
  certificateError: string | null;
  setCookieHeader: string[];
}

export interface IRenderer {
  id: string;
  render(url: string, options: RenderOptions): Promise<RenderResult>;
}

// -------------------------------------------------------------
// 1. Static HTTP Renderer
// -------------------------------------------------------------
export class HTTPRenderer implements IRenderer {
  id = "http-static";

  async render(url: string, options: RenderOptions = {}): Promise<RenderResult> {
    const retries = 2;
    const delayMs = 1000;
    let lastError: Error | null = null;
    let certificateValid: boolean | null = true;
    let certificateError: string | null = null;
    const timeoutMs = options.timeoutMs || 12000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      const safeCheck = await validateUrlSafe(url);
      if (!safeCheck.safe) {
        throw new Error(safeCheck.error || "Blocked URL (SSRF prevention)");
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const startTime = performance.now();

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": options.userAgent || getRandomUserAgent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
          redirect: "follow",
          signal: controller.signal,
        });

        const responseTimeMs = Math.round(performance.now() - startTime);
        const contentType = response.headers.get("content-type") ?? "text/html";
        const finalUrl = response.url || url;

        const finalSafe = await validateUrlSafe(finalUrl);
        if (!finalSafe.safe) {
          throw new Error(finalSafe.error || "Blocked redirect destination (SSRF prevention)");
        }

        const headers: Record<string, string> = {};
        response.headers.forEach((val, key) => {
          headers[key.toLowerCase()] = val;
        });

        // @ts-ignore
        const setCookieHeader = typeof response.headers.getSetCookie === "function"
          // @ts-ignore
          ? response.headers.getSetCookie()
          : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);

        const html = await response.text();
        const loadTimeMs = Math.round(performance.now() - startTime);

        return {
          html,
          finalUrl,
          statusCode: response.status,
          contentType,
          headers,
          responseTimeMs,
          loadTimeMs,
          certificateValid,
          certificateError,
          setCookieHeader,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[HTTPRenderer] Attempt ${attempt} failed for ${url}: ${lastError.message}`);

        const errMsg = lastError.message.toLowerCase();
        const isTlsError = errMsg.includes("certificate") ||
          errMsg.includes("ssl") ||
          errMsg.includes("tls") ||
          errMsg.includes("handshake");

        if (isTlsError) {
          certificateValid = false;
          certificateError = lastError.message;
          break;
        }

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    if (certificateValid === false) {
      return {
        html: "",
        finalUrl: url,
        statusCode: 0,
        contentType: "text/html",
        headers: {},
        responseTimeMs: 0,
        loadTimeMs: 0,
        certificateValid,
        certificateError,
        setCookieHeader: [],
      };
    }

    throw lastError || new Error(`Failed to crawl URL after ${retries} attempts.`);
  }
}

// -------------------------------------------------------------
// 2. Playwright Remote/Worker Renderer
// -------------------------------------------------------------
export class PlaywrightRenderer implements IRenderer {
  id = "playwright";

  async render(url: string, options: RenderOptions = {}): Promise<RenderResult> {
    // @ts-ignore
    const serviceUrl = typeof Deno !== "undefined" ? Deno.env.get("PLAYWRIGHT_SERVICE_URL") || Deno.env.get("INTERNAL_RENDERER_URL") : null;
    if (!serviceUrl) {
      throw new Error("Playwright Service is not configured. Config VITE_PLAYWRIGHT_SERVICE_URL or INTERNAL_RENDERER_URL.");
    }

    const safeCheck = await validateUrlSafe(url);
    if (!safeCheck.safe) {
      throw new Error(safeCheck.error || "Blocked URL (SSRF prevention)");
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 25000);

    try {
      const response = await fetch(serviceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": options.userAgent || getRandomUserAgent()
        },
        body: JSON.stringify(
          serviceUrl.includes("browserless.io")
            ? {
              url,
              rejectResourceTypes: ["image", "media", "font"],
              gotoOptions: {
                timeout: options.timeoutMs || 20000,
                waitUntil: "networkidle2"
              }
            }
            : {
              url,
              blockResources: options.blockResources || ["images", "media", "fonts", "trackers"],
              timeout: options.timeoutMs || 20000,
            }
        ),
        signal: controller.signal
      });

      const responseTimeMs = Math.round(performance.now() - startTime);
      if (!response.ok) {
        throw new Error(`Playwright service returned error status: ${response.status}`);
      }

      const contentTypeHeader = response.headers.get("content-type") || "";
      let html = "";
      let finalUrl = url;
      let statusCode = response.status;
      let responseHeaders = {};
      let certificateValid = true;
      let certificateError = null;
      let cookies: string[] = [];

      if (contentTypeHeader.includes("application/json")) {
        const body = await response.json();
        html = body.html || "";
        finalUrl = body.finalUrl || url;
        statusCode = body.status || 200;
        responseHeaders = body.headers || {};
        certificateValid = body.certificateValid !== undefined ? body.certificateValid : true;
        certificateError = body.certificateError || null;
        cookies = body.cookies || [];
      } else {
        html = await response.text();
      }

      const loadTimeMs = Math.round(performance.now() - startTime);

      return {
        html,
        finalUrl,
        statusCode,
        contentType: "text/html",
        headers: responseHeaders,
        responseTimeMs,
        loadTimeMs,
        certificateValid,
        certificateError,
        setCookieHeader: cookies,
      };
    } catch (err) {
      console.warn(`[PlaywrightRenderer] failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// -------------------------------------------------------------
// 3. Jina Reader External Fallback Renderer
// -------------------------------------------------------------
export class JinaRenderer implements IRenderer {
  id = "jina-fallback";

  async render(url: string, options: RenderOptions = {}): Promise<RenderResult> {
    const safeCheck = await validateUrlSafe(url);
    if (!safeCheck.safe) {
      throw new Error(safeCheck.error || "Blocked URL (SSRF prevention)");
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20000);

    try {
      const readerUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
      const response = await fetch(readerUrl, {
        headers: {
          "X-Respond-With": "html",
          "Accept": "text/html",
          "User-Agent": "Mozilla/5.0 (compatible; SentinelQABot/1.0; +https://sentinelqa.com)",
        },
        signal: controller.signal,
      });

      const responseTimeMs = Math.round(performance.now() - startTime);
      if (!response.ok) {
        throw new Error(`Jina Reader returned status: ${response.status}`);
      }

      const html = await response.text();
      const loadTimeMs = Math.round(performance.now() - startTime);

      return {
        html,
        finalUrl: url,
        statusCode: response.status,
        contentType: "text/html",
        headers: {},
        responseTimeMs,
        loadTimeMs,
        certificateValid: true,
        certificateError: null,
        setCookieHeader: [],
      };
    } catch (err) {
      console.warn(`[JinaRenderer] failed for ${url}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// -------------------------------------------------------------
// 4. Rendering Manager Orchestrator
// -------------------------------------------------------------
export class RenderingManager {
  private renderers: Map<string, IRenderer> = new Map();

  constructor() {
    this.registerRenderer(new HTTPRenderer());
    this.registerRenderer(new PlaywrightRenderer());
    this.registerRenderer(new JinaRenderer());
  }

  registerRenderer(renderer: IRenderer) {
    this.renderers.set(renderer.id, renderer);
  }

  async render(url: string, options: RenderOptions = {}): Promise<RenderResult> {
    // 1. Try Playwright if requested and configured
    if (options.usePlaywright) {
      try {
        const pw = this.renderers.get("playwright");
        if (pw) {
          console.log(`[RenderingManager] Routing ${url} via Playwright...`);
          return await pw.render(url, options);
        }
      } catch (err) {
        console.warn(`[RenderingManager] Playwright failed, degrading to Jina Reader fallback...`, err);
      }
    }

    // 2. Try Jina Fallback for dynamic content if Playwright fails or isn't requested/configured
    if (options.usePlaywright) {
      try {
        const jina = this.renderers.get("jina-fallback");
        if (jina) {
          console.log(`[RenderingManager] Routing ${url} via Jina Reader...`);
          return await jina.render(url, options);
        }
      } catch (err) {
        console.warn(`[RenderingManager] Jina fallback failed, degrading to standard HTTP...`, err);
      }
    }

    // 3. Static HTTP Renderer default
    const http = this.renderers.get("http-static")!;
    console.log(`[RenderingManager] Routing ${url} via static HTTP fetch...`);
    return await http.render(url, options);
  }
}
