import { useState } from "react";
import { X, Check, Sparkles } from "lucide-react";
import { openStripeCheckout } from "../lib/subscription";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  reason?: string;
}

export function UpgradeModal({ isOpen, onClose, userId, reason }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = (plan: "pro" | "agency") => {
    setLoadingPlan(plan);
    openStripeCheckout(plan, userId);
    setTimeout(() => {
      setLoadingPlan(null);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-md animate-fade-in no-print">
      <div className="relative w-full max-w-2xl bg-ink-850/95 glass border border-ink-700/60 rounded-2xl p-6 md:p-8 shadow-2xl animate-scale-up space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-ink-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Premium Capabilities</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-50">
            Upgrade to SentinelQA Pro
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {reason || "Export white-label agency reports, automate site-wide crawls, and track multi-domain historical quality scores."}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          {/* Pro Plan */}
          <div className="bg-ink-900/60 border border-cyan-500/40 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between hover:border-cyan-400/60 transition-all shadow-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold uppercase text-cyan-400">Pro Developer</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20">POPULAR</span>
              </div>
              <div>
                <span className="text-3xl font-display font-bold text-slate-50">$19</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span><strong>White-Label PDF & HTML Exports</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>5 Projects & Multi-Domain History</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Full Site-Wide Multi-Page Crawls</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>100 Audits / Month</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout("pro")}
              disabled={loadingPlan === "pro"}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-emerald-400 text-ink-950 font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/10"
            >
              {loadingPlan === "pro" ? "Redirecting..." : "Upgrade to Pro ($19/mo)"}
            </button>
          </div>

          {/* Agency Plan */}
          <div className="bg-ink-900/40 border border-ink-800 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between hover:border-purple-500/40 transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-bold uppercase text-purple-400">Agency / Team</span>
                <span className="text-[10px] bg-purple-500/10 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/20">AGENCY</span>
              </div>
              <div>
                <span className="text-3xl font-display font-bold text-slate-50">$49</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Everything in Pro Plan</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span><strong>25 Projects & Custom Agency Logo</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Automated Weekly Monitoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>500 Audits / Month</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleCheckout("agency")}
              disabled={loadingPlan === "agency"}
              className="w-full py-2.5 bg-ink-800 hover:bg-purple-500/20 border border-ink-700 hover:border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl active:scale-95 transition-all"
            >
              {loadingPlan === "agency" ? "Redirecting..." : "Upgrade to Agency ($49/mo)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
