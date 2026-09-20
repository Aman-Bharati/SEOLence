export interface PerformanceMetrics {
  lcp: number | null;
  cls: number | null;
  fcp: number | null;
  tbt: number | null;
  speedIndex: number | null;
  ttfb: number | null;
  loadTimeMs: number | null;
  responseTimeMs: number | null;
}

export interface IPerformanceProvider {
  id: string;
  getMetrics(url: string, context: any): Promise<Partial<PerformanceMetrics> | null>;
}

// 1. Google PageSpeed Insights API Provider
export class GooglePsiProvider implements IPerformanceProvider {
  id = "google-psi";

  async getMetrics(url: string, context: any): Promise<Partial<PerformanceMetrics> | null> {
    const apiKey = context.apiKey || Deno.env.get("PAGESPEED_API_KEY") || null;
    try {
      let psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=PERFORMANCE`;
      if (apiKey) {
        psiUrl += `&key=${apiKey}`;
      } else {
        console.log("[GooglePsiProvider] No PAGESPEED_API_KEY provided; requesting with public rate limits.");
      }
      
      const res = await fetch(psiUrl, {
        signal: AbortSignal.timeout(8000),
      });
      
      if (res.status === 429) {
        console.warn("[GooglePsiProvider] Rate limit (429) encountered from Google PSI API. Falling back to local metrics.");
        return null;
      }

      if (res.ok) {
        const data = await res.json();
        const audits = data?.lighthouseResult?.audits || {};
        
        const lcp = audits["largest-contentful-paint"]?.numericValue ?? null;
        const cls = audits["cumulative-layout-shift"]?.numericValue ?? null;
        const fcp = audits["first-contentful-paint"]?.numericValue ?? null;
        const tbt = audits["total-blocking-time"]?.numericValue ?? null;
        const speedIndex = audits["speed-index"]?.numericValue ?? null;
        
        return { lcp, cls, fcp, tbt, speedIndex };
      }
    } catch (e) {
      console.warn("[GooglePsiProvider] PageSpeed API request timed out or failed:", e);
    }
    return null;
  }
}

// 2. Browser Performance API Provider
export class BrowserPerformanceApiProvider implements IPerformanceProvider {
  id = "browser-performance-api";

  async getMetrics(_url: string, context: any): Promise<Partial<PerformanceMetrics> | null> {
    if (context.browserTimings) {
      const t = context.browserTimings;
      return {
        lcp: t.lcp || null,
        cls: t.cls || null,
        fcp: t.fcp || null,
        tbt: t.tbt || null,
        speedIndex: t.speedIndex || null,
        ttfb: t.ttfb || null,
        loadTimeMs: t.loadTime || null,
      };
    }
    return null;
  }
}

// 3. Local Timing Provider
export class LocalTimingProvider implements IPerformanceProvider {
  id = "local-timing";

  async getMetrics(_url: string, context: any): Promise<Partial<PerformanceMetrics> | null> {
    return {
      responseTimeMs: context.responseTimeMs || null,
      loadTimeMs: context.loadTimeMs || null,
      ttfb: context.responseTimeMs || null,
    };
  }
}

// -------------------------------------------------------------
// Coordinator Performance Manager
// -------------------------------------------------------------
export class PerformanceManager {
  private providers: IPerformanceProvider[] = [];

  constructor() {
    this.providers.push(new BrowserPerformanceApiProvider());
    this.providers.push(new GooglePsiProvider());
    this.providers.push(new LocalTimingProvider());
  }

  async resolveMetrics(url: string, context: any): Promise<PerformanceMetrics> {
    let finalMetrics: Partial<PerformanceMetrics> = {};

    for (const provider of this.providers) {
      try {
        const metrics = await provider.getMetrics(url, context);
        if (metrics) {
          finalMetrics = {
            ...metrics,
            ...finalMetrics,
          };
        }
      } catch (err) {
        console.warn(`[PerformanceManager] Provider ${provider.id} error:`, err);
      }
    }

    return {
      lcp: finalMetrics.lcp !== undefined ? finalMetrics.lcp : null,
      cls: finalMetrics.cls !== undefined ? finalMetrics.cls : null,
      fcp: finalMetrics.fcp !== undefined ? finalMetrics.fcp : null,
      tbt: finalMetrics.tbt !== undefined ? finalMetrics.tbt : null,
      speedIndex: finalMetrics.speedIndex !== undefined ? finalMetrics.speedIndex : null,
      ttfb: finalMetrics.ttfb !== undefined ? finalMetrics.ttfb : null,
      loadTimeMs: finalMetrics.loadTimeMs !== undefined ? finalMetrics.loadTimeMs : null,
      responseTimeMs: finalMetrics.responseTimeMs !== undefined ? finalMetrics.responseTimeMs : null,
    };
  }
}
