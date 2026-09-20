import { useState, useEffect } from "react";
import { X, Download, Printer, Copy, Check, Sparkles, Lock } from "lucide-react";
import type { WebsiteAudit } from "../types";
import { analyzePage } from "../lib/analyzer";
import { downloadReport } from "../lib/reportGenerator";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getTierLimits } from "../lib/subscription";
import { UpgradeModal } from "./UpgradeModal";

interface ExportModalProps {
  audit: WebsiteAudit;
  onClose: () => void;
}

export function ExportModal({ audit, onClose }: ExportModalProps) {
  const [agencyName, setAgencyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [layout, setLayout] = useState<"complete" | "executive" | "technical">("complete");
  const [userTier, setUserTier] = useState<string>("free");
  const [userId, setUserId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const limits = getTierLimits(userTier);

  // Load profile & tier from Supabase DB with fallback to localStorage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && isMounted) {
            setUserId(user.id);
            const { data, error: fetchErr } = await supabase
              .from("user_profiles")
              .select("agency_name, agency_logo_url, subscription_tier")
              .eq("user_id", user.id)
              .maybeSingle();

            if (data && !fetchErr && isMounted) {
              if (data.agency_name) setAgencyName(data.agency_name);
              if (data.agency_logo_url) setLogoUrl(data.agency_logo_url);
              if (data.subscription_tier) setUserTier(data.subscription_tier);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to load user profile from DB:", err);
        }
      }

      // Fallback to localStorage
      const savedName = localStorage.getItem("white_label_agency_name");
      const savedLogo = localStorage.getItem("white_label_agency_logo");
      if (savedName && isMounted) setAgencyName(savedName);
      if (savedLogo && isMounted) setLogoUrl(savedLogo);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveSettings = async () => {
    const nameClean = agencyName.trim();
    const logoClean = logoUrl.trim();
    localStorage.setItem("white_label_agency_name", nameClean);
    localStorage.setItem("white_label_agency_logo", logoClean);

    if (isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("user_profiles").upsert(
            {
              user_id: user.id,
              agency_name: nameClean,
              agency_logo_url: logoClean,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        }
      } catch (err) {
        console.error("Failed to save agency profile to Supabase DB:", err);
      }
    }
  };

  const handlePrint = () => {
    if (!limits.canExportWhiteLabel && (agencyName || logoUrl)) {
      setUpgradeReason("White-Label branding and custom PDFs require a Pro or Agency plan.");
      setShowUpgradeModal(true);
      return;
    }
    handleSaveSettings();
    window.print();
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/share/audit/${audit.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    handleSaveSettings();
    const result = analyzePage(audit.audit_data.parsed);
    downloadReport(result, layout);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm no-print">
        <div className="bg-ink-850 border border-ink-700/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-ink-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="font-display font-bold text-slate-100">Export & Share Audit Report</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-ink-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* White label settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  White-Label Branding Settings
                </h4>
                {!limits.canExportWhiteLabel && (
                  <button
                    onClick={() => {
                      setUpgradeReason("White-label agency reports are exclusive to Pro and Agency tiers.");
                      setShowUpgradeModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full hover:bg-cyan-500/20 transition-colors"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Pro Feature</span>
                  </button>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1.5">Agency / Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Agency"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1.5">Agency Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-ink-900 border border-ink-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="w-full h-[1px] bg-ink-800"></div>

            {/* Report Layout Selector */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Report Template Layout
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {(["complete", "executive", "technical"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setLayout(style)}
                    className={`px-3 py-2.5 text-[11px] font-mono font-bold rounded-xl border capitalize transition-all ${
                      layout === style
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        : "bg-ink-900 border-ink-800 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full h-[1px] bg-ink-800"></div>

            {/* Export Actions */}
            <div className="grid sm:grid-cols-3 gap-4">
              {/* HTML Report */}
              <button
                onClick={handleDownloadHtml}
                className="flex flex-col items-center justify-center p-4 bg-ink-900/60 hover:bg-cyan-500/5 border border-ink-800 hover:border-cyan-500/30 rounded-xl group transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                  <Download className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-semibold text-slate-200">HTML Report</span>
                <span className="text-[10px] text-slate-500 mt-1">Download Offline</span>
              </button>

              {/* Print PDF */}
              <button
                onClick={handlePrint}
                className="flex flex-col items-center justify-center p-4 bg-ink-900/60 hover:bg-cyan-500/5 border border-ink-800 hover:border-cyan-500/30 rounded-xl group transition-all relative"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                  <Printer className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  Print PDF
                  {!limits.canExportWhiteLabel && <Lock className="w-3 h-3 text-cyan-400" />}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">Save Professional PDF</span>
              </button>

              {/* Share Link */}
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center p-4 bg-ink-900/60 hover:bg-cyan-500/5 border border-ink-800 hover:border-cyan-500/30 rounded-xl group transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-200">{copied ? "Copied!" : "Share Link"}</span>
                <span className="text-[10px] text-slate-500 mt-1">Copy Share URL</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userId={userId}
        reason={upgradeReason}
      />
    </>
  );
}
