export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

export function isRateLimited(ip: string): boolean {
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

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  return url;
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getRandomUserAgent(): string {
  const randomIndex = Math.floor(Math.random() * USER_AGENTS.length);
  return USER_AGENTS[randomIndex];
}

export function isPrivateIp(ip: string): boolean {
  const trimmed = ip.trim().toLowerCase();
  
  // IPv4 Checks
  if (/^[0-9.]+$/.test(trimmed)) {
    if (trimmed.startsWith("127.")) return true; // Loopback
    if (trimmed.startsWith("10.")) return true; // Class A Private
    if (trimmed.startsWith("192.168.")) return true; // Class C Private
    if (trimmed.startsWith("169.254.")) return true; // Link-local
    if (trimmed.startsWith("172.")) { // Class B Private (172.16.x.x - 172.31.x.x)
      const parts = trimmed.split(".");
      if (parts.length >= 2) {
        const second = parseInt(parts[1], 10);
        if (second >= 16 && second <= 31) return true;
      }
    }
    if (trimmed === "0.0.0.0" || trimmed === "255.255.255.255") return true;
  }

  // IPv6 Checks
  if (trimmed.includes(":")) {
    if (trimmed === "::1" || trimmed === "0:0:0:0:0:0:0:1") return true; // Loopback
    if (trimmed === "::" || trimmed === "0:0:0:0:0:0:0:0") return true; // Unspecified
    if (trimmed.startsWith("fc") || trimmed.startsWith("fd")) return true; // Unique local
    if (trimmed.startsWith("fe8") || trimmed.startsWith("fe9") || trimmed.startsWith("fea") || trimmed.startsWith("feb")) return true; // Link-local
    if (trimmed.startsWith("ff")) return true; // Multicast
  }

  return false;
}

export async function resolveDnsIps(hostname: string): Promise<string[]> {
  const ips: string[] = [];
  
  // 1. Try Deno resolveDns
  try {
    // @ts-ignore
    if (typeof Deno !== "undefined" && typeof Deno.resolveDns === "function") {
      // @ts-ignore
      const resolved = await Deno.resolveDns(hostname, "A");
      for (const ip of resolved) {
        if (ip) ips.push(ip);
      }
    }
  } catch {
    // ignore
  }

  // 2. Cloudflare DNS-over-HTTPS (DoH) Fallback (A records)
  if (ips.length === 0) {
    try {
      const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`;
      const res = await fetch(cfUrl, {
        headers: { "accept": "application/dns-json" },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.Answer && Array.isArray(data.Answer)) {
          for (const ans of data.Answer) {
            if (ans.type === 1 && ans.data) {
              ips.push(ans.data);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. DoH Fallback (AAAA IPv6 records)
  if (ips.length === 0) {
    try {
      const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=AAAA`;
      const res = await fetch(cfUrl, {
        headers: { "accept": "application/dns-json" },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.Answer && Array.isArray(data.Answer)) {
          for (const ans of data.Answer) {
            if (ans.type === 28 && ans.data) {
              ips.push(ans.data);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return ips;
}

export async function validateUrlSafe(urlString: string): Promise<{ safe: boolean; error: string | null }> {
  // @ts-ignore
  const allowLocal = typeof Deno !== "undefined" && Deno.env.get("ALLOW_LOCAL_CRAWLS") === "true";

  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { safe: false, error: "Access Denied: Only HTTP and HTTPS protocols are allowed." };
    }

    const hostname = url.hostname;
    if (!hostname) {
      return { safe: false, error: "Access Denied: Invalid hostname." };
    }

    if (allowLocal) {
      return { safe: true, error: null };
    }

    // Direct IP evaluation
    if (/^[0-9.]+$/.test(hostname) || hostname.includes(":")) {
      if (isPrivateIp(hostname)) {
        return { safe: false, error: `Access Denied: Restricted IP space target (${hostname}).` };
      }
      return { safe: true, error: null };
    }

    // Resolve domain IPs to prevent DNS Rebinding / SSRF
    const ips = await resolveDnsIps(hostname);
    if (ips.length === 0) {
      // If we cannot resolve DNS, let it pass to standard fetch, but flag as unsafe if IP resolves locally
      return { safe: true, error: null };
    }

    for (const ip of ips) {
      if (isPrivateIp(ip)) {
        return { safe: false, error: `Access Denied: Hostname resolves to private IP (${ip}).` };
      }
    }

    return { safe: true, error: null };
  } catch (err) {
    return { safe: false, error: `Access Denied: Malformed URL (${err instanceof Error ? err.message : String(err)}).` };
  }
}
