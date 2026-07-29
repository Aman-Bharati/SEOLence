import { ListChecks, ArrowUp, Wrench, Clock } from "lucide-react";
import type { AnalysisResult } from "../types";

interface ActionPlanProps {
  result: AnalysisResult;
}

export function ActionPlan({ result }: ActionPlanProps) {
  const { actionPlan } = result;

  if (actionPlan.length === 0) {
    return (
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Priority Action Plan</h3>
        </div>
        <p className="text-sm text-emerald-400">No actions needed — your page is well optimized!</p>
      </div>
    );
  }

  const effortColor: Record<string, string> = {
    low: "text-emerald-400 bg-emerald-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    high: "text-rose-400 bg-rose-500/10",
  };

  const impactColor = (impact: number) => {
    if (impact >= 7) return "text-rose-400";
    if (impact >= 5) return "text-amber-400";
    return "text-cyan-400";
  };

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="w-4 h-4 text-cyan-400" />
        <h3 className="font-display font-semibold text-slate-100">Priority Action Plan</h3>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        {actionPlan.length} steps to improve your SEO score. Follow in order — highest impact first.
      </p>

      <div className="space-y-3">
        {actionPlan.map((item) => (
          <div
            key={item.step}
            className="flex gap-4 p-4 bg-ink-800/40 rounded-xl border border-ink-700/50 hover:border-cyan-400/20 transition-all animate-fade-in"
            style={{ animationDelay: `${Math.min(item.step * 30, 300)}ms` }}
          >
            {/* Step number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-display font-bold text-cyan-400">
              {item.step}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium text-slate-100">{item.title}</h4>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`flex items-center gap-1 text-xs font-medium ${impactColor(item.impact)}`}>
                    <ArrowUp className="w-3 h-3" />
                    +{item.impact} pts
                  </span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${effortColor[item.effort]}`}>
                    <Wrench className="w-2.5 h-2.5" />
                    {item.effort}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-5 pt-4 border-t border-ink-700/50 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Total potential improvement: <span className="text-cyan-400 font-medium">+{actionPlan.reduce((s, i) => s + i.impact, 0)} points</span>
        </span>
        <span className="text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Est. effort: {actionPlan.filter((i) => i.effort === "high").length > 0 ? "High" : actionPlan.filter((i) => i.effort === "medium").length > 0 ? "Medium" : "Low"}
        </span>
      </div>
    </div>
  );
}
