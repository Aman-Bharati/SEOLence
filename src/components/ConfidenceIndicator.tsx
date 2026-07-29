import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { AnalysisResult } from "../types";

interface ConfidenceIndicatorProps {
  result: AnalysisResult;
}

export function ConfidenceIndicator({ result }: ConfidenceIndicatorProps) {
  const { confidence } = result;

  const Icon = confidence.score >= 75 ? ShieldCheck : confidence.score >= 50 ? ShieldAlert : ShieldX;
  const colorClass = confidence.score >= 75
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : confidence.score >= 50
    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-rose-400 bg-rose-500/10 border-rose-500/20";

  const barColor = confidence.score >= 75 ? "bg-emerald-400" : confidence.score >= 50 ? "bg-amber-400" : "bg-rose-400";

  const statusIcon = (status: "good" | "warning" | "bad") => {
    switch (status) {
      case "good": return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />;
      case "warning": return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />;
      case "bad": return <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />;
    }
  };

  return (
    <div className={`glass border rounded-2xl p-5 ${colorClass}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5" />
        <div className="flex-1">
          <h3 className="font-display font-semibold text-slate-100">Analysis Confidence: {confidence.label}</h3>
          <p className="text-xs text-slate-500">How reliable is this analysis?</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-display font-bold">{confidence.score}<span className="text-sm text-slate-500">%</span></span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-ink-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${confidence.score}%` }}
        />
      </div>

      <div className="space-y-2">
        {confidence.factors.map((factor, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-1.5">{statusIcon(factor.status)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-medium">{factor.label}</p>
              <p className="text-xs text-slate-500">{factor.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {confidence.score < 75 && (
        <div className="mt-4 pt-3 border-t border-ink-700/50">
          <p className="text-xs text-slate-400 leading-relaxed">
            {confidence.score < 50
              ? "This analysis has low confidence. The page may be client-side rendered or returned minimal content. Results for body text, keywords, and readability may be incomplete. Meta tags in the <head> are still reliable."
              : "Some factors reduced confidence. Check the verification checklist for which checks were affected."}
          </p>
        </div>
      )}
    </div>
  );
}
