export interface NormalizedSERPItem {
  position: number;
  url: string;
  domain: string;
  title: string;
  snippet: string | null;
  resultType: string;
}

export interface ISerpProvider {
  id: string;
  fetchSERP(
    keyword: string,
    country: string,
    location: string,
    language: string,
    device: string
  ): Promise<NormalizedSERPItem[]>;
}

export class SerperDevProvider implements ISerpProvider {
  readonly id = "serper-dev";

  async fetchSERP(
    keyword: string,
    country: string,
    location: string,
    language: string,
    device: string
  ): Promise<NormalizedSERPItem[]> {
    // @ts-ignore
    const apiKey = Deno.env.get("SERPER_API_KEY");
    if (!apiKey) {
      throw new Error("Missing SERPER_API_KEY secret.");
    }

    const payload: Record<string, any> = {
      q: keyword,
      gl: (country || "US").toLowerCase(),
      hl: (language || "en").toLowerCase(),
      num: 100,
    };

    if (device === "mobile") {
      payload.device = "mobile";
    }

    if (location && location.trim().length > 0) {
      payload.location = location.trim();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 403) {
        throw new Error("SERP_AUTH_FAILED: Unauthorized or invalid SERP provider API key.");
      }
      if (res.status === 429) {
        throw new Error("SERP_RATE_LIMIT: Upstream provider rate limit or quota exceeded.");
      }
      if (!res.ok) {
        throw new Error(`SERP_UPSTREAM_ERROR: Upstream provider server error (status ${res.status}).`);
      }

      const raw = await res.json();
      if (!raw || typeof raw !== "object") {
        throw new Error("SERP_MALFORMED: Malformed JSON response received from provider.");
      }

      const organic = raw.organic;
      if (!Array.isArray(organic)) {
        // If query returned no results, or empty search payload
        return [];
      }

      const items: NormalizedSERPItem[] = [];
      for (const item of organic) {
        if (!item.link || !item.title) continue;

        let domain = "";
        try {
          domain = new URL(item.link).hostname;
        } catch {
          domain = item.link;
        }

        items.push({
          position: typeof item.position === "number" ? item.position : (items.length + 1),
          url: item.link,
          domain,
          title: item.title,
          snippet: item.snippet || null,
          resultType: "organic",
        });
      }

      return items;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new Error("SERP_TIMEOUT: Upstream provider connection timed out after 60 seconds.");
        }
        throw err;
      }
      throw new Error(`SERP_UNKNOWN_ERROR: ${String(err)}`);
    }
  }
}
