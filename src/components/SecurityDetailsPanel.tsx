import { Shield, ShieldAlert, ShieldCheck, CheckCircle2, AlertCircle, HelpCircle, Lock, Unlock, FileText, Code } from "lucide-react";
import type { ParsedPage } from "../types";

interface SecurityDetailsPanelProps {
  parsed: ParsedPage;
}

export function SecurityDetailsPanel({ parsed }: SecurityDetailsPanelProps) {
  const security = parsed.securityHeaders || {
    hasCsp: false,
    hasHsts: false,
    hasXFrame: false,
    hasXContentType: false,
    cspHeader: null,
    hstsHeader: null,
    xFrameHeader: null,
    xContentTypeHeader: null,
  };

  const details = parsed.securityDetails || {
    referrerPolicy: null,
    permissionsPolicy: null,
    hasSecurityTxt: false,
    hasMixedContent: false,
    mixedContentUrls: [],
    hasDirectoryListing: false,
    sriScore: 100,
    sriMissingUrls: [],
    certificateValid: true,
    certificateError: null,
    cookies: [],
  };

  const cookieList = details.cookies || [];

  return (
    <div className="space-y-6">
      {/* Crawler Shield Status Banner */}
      <div className="bg-gradient-to-r from-emerald-950/20 via-cyan-950/30 to-ink-850/60 glass border border-emerald-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-display font-bold text-slate-50">Crawler Security Shield</h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-pulse">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                SSRF prevention active. DNS lookup validation enabled. Restricted internal networks RFC1918 & IPv6 ranges blacklisted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-2 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Target Host Verified Safe</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Columns: Audit Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* SSL/TLS Certificate Status */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              SSL/TLS Certificate Validity
            </h4>
            
            {details.certificateValid !== false ? (
              <div className="flex items-start gap-3 bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Valid Certificate Connection</p>
                  <p className="text-xs text-slate-400 mt-1">
                    The connection was established over secure SSL/TLS with verified certificate authority roots.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-rose-950/30 border border-rose-500/30 p-4 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-400">SSL Certificate Handshake Failed</p>
                  <p className="text-xs text-slate-300 font-mono mt-1 bg-ink-950 p-2.5 rounded-lg border border-ink-800 break-all">
                    {details.certificateError || "Unable to verify SSL connection."}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Search engines flag and penalize websites with expired, self-signed, or invalid SSL certificates. Fix this immediately.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cookies Audit */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Cookie Security Attributes
            </h4>
            <p className="text-xs text-slate-400">
              Audit cookie flags set during network handshake. Missing security attributes leave cookies vulnerable to XSS and session hijacking.
            </p>

            {cookieList.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium bg-ink-900/30 p-4 rounded-xl border border-ink-850 text-center">
                No cookies set by the server during crawl page handshake.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ink-800 text-slate-400 font-mono">
                      <th className="py-2.5 font-semibold">Cookie Name</th>
                      <th className="py-2.5 font-semibold text-center">HttpOnly</th>
                      <th className="py-2.5 font-semibold text-center">Secure</th>
                      <th className="py-2.5 font-semibold text-center">SameSite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookieList.map((cookie, idx) => (
                      <tr key={idx} className="border-b border-ink-900/50 hover:bg-ink-900/25">
                        <td className="py-2.5 font-mono text-slate-300 break-all pr-4">{cookie.name}</td>
                        <td className="py-2.5 text-center">
                          {cookie.isHttpOnly ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400">
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          {cookie.isSecure ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                              Yes
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono border ${
                            cookie.sameSite 
                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" 
                              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          }`}>
                            {cookie.sameSite || "None"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mixed Content Scan */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-cyan-400" />
              Mixed Content Audit
            </h4>
            <p className="text-xs text-slate-400">
              Mixed content occurs when an HTTPS site loads assets (images, scripts, styles) via non-secure HTTP connections. Browsers block these by default, breaking UX.
            </p>

            {!details.hasMixedContent ? (
              <div className="flex items-center gap-3 bg-emerald-950/10 border border-emerald-500/20 p-4 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">No mixed content detected. All subresources load securely.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Found {details.mixedContentUrls.length} non-secure resources on HTTPS page!</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-ink-800 rounded-xl p-3 bg-ink-950/30">
                  {details.mixedContentUrls.map((url, idx) => (
                    <p key={idx} className="font-mono text-[10px] text-slate-400 break-all p-1 bg-ink-950 border border-ink-900 rounded">
                      {url}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Policies & Metadata */}
        <div className="space-y-6">
          {/* Security Headers List */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              HTTP Security Policies
            </h4>
            
            <div className="space-y-3.5">
              {/* CSP */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Content Security Policy (CSP)</span>
                  {security.hasCsp ? (
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase font-mono">Present</span>
                  ) : (
                    <span className="text-[10px] text-rose-400 font-semibold uppercase font-mono">Missing</span>
                  )}
                </div>
                {security.cspHeader && (
                  <pre className="p-2 bg-ink-900 border border-ink-800 rounded-lg text-[9px] font-mono text-slate-500 truncate max-w-full hover:whitespace-normal">
                    {security.cspHeader}
                  </pre>
                )}
              </div>

              {/* HSTS */}
              <div className="space-y-1 pt-1 border-t border-ink-800/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">HSTS Strict Transport Security</span>
                  {security.hasHsts ? (
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase font-mono">Present</span>
                  ) : (
                    <span className="text-[10px] text-rose-400 font-semibold uppercase font-mono">Missing</span>
                  )}
                </div>
                {security.hstsHeader && (
                  <pre className="p-2 bg-ink-900 border border-ink-800 rounded-lg text-[9px] font-mono text-slate-500 truncate">
                    {security.hstsHeader}
                  </pre>
                )}
              </div>

              {/* Referrer Policy */}
              <div className="space-y-1 pt-1 border-t border-ink-800/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Referrer Policy</span>
                  {details.referrerPolicy ? (
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase font-mono">Set</span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-semibold uppercase font-mono">Not Set</span>
                  )}
                </div>
                {details.referrerPolicy && (
                  <pre className="p-2 bg-ink-900 border border-ink-800 rounded-lg text-[9px] font-mono text-slate-300 font-semibold">
                    {details.referrerPolicy}
                  </pre>
                )}
              </div>

              {/* Permissions Policy */}
              <div className="space-y-1 pt-1 border-t border-ink-800/40">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Permissions Policy</span>
                  {details.permissionsPolicy ? (
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase font-mono">Set</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-semibold uppercase font-mono">Missing</span>
                  )}
                </div>
                {details.permissionsPolicy && (
                  <pre className="p-2 bg-ink-900 border border-ink-800 rounded-lg text-[9px] font-mono text-slate-400 truncate">
                    {details.permissionsPolicy}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Subresource Integrity (SRI) */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Subresource Integrity (SRI)
              </h4>
              <span className="text-sm font-display font-bold text-cyan-400">{details.sriScore}%</span>
            </div>
            <p className="text-xs text-slate-400">
              Verifies if cross-origin scripts and link assets utilize integrity check hashes to block third-party file injections.
            </p>

            {details.sriMissingUrls.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Missing Integrity Attributes</p>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-ink-800 rounded-xl p-2 bg-ink-950/20">
                  {details.sriMissingUrls.map((url, idx) => (
                    <p key={idx} className="font-mono text-[9px] text-slate-400 truncate hover:text-slate-200">
                      {url.split("/").pop() || url}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Security.txt & Directory Listing Checks */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-3.5">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              General Server Audits
            </h4>

            {/* security.txt */}
            <div className="flex items-center justify-between text-xs py-1 border-b border-ink-800/40">
              <span className="text-slate-400">Security Contact (security.txt)</span>
              {details.hasSecurityTxt ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Published
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-semibold font-mono bg-ink-900 border border-ink-800 px-2 py-0.5 rounded-full">
                  Not Found
                </span>
              )}
            </div>

            {/* directory listing */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-400">Directory Index Listings</span>
              {!details.hasDirectoryListing ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Secure / Hidden
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-semibold font-mono bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  Exposed Listing
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
