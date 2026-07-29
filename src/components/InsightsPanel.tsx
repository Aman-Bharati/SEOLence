import type { InsightItem } from "../types";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";

interface InsightsPanelProps {
  insights: InsightItem[];
}

function severityStyles(severity: string): { dot: string; tag: string } {
  switch (severity) {
    case "high":
      return { dot: "bg-rose-400", tag: "text-rose-300 bg-rose-500/10" };
    case "medium":
      return { dot: "bg-amber-400", tag: "text-amber-300 bg-amber-500/10" };
    default:
      return { dot: "bg-emerald-400", tag: "text-emerald-300 bg-emerald-500/10" };
  }
}

function InsightCard({ item, index }: { item: InsightItem; index: number }) {
  const config = {
    strength: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-emerald-400",
      bg: "bg-emerald-500/5 border-emerald-500/15",
      label: "Strength",
    },
    weakness: {
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "text-rose-400",
      bg: "bg-rose-500/5 border-rose-500/15",
      label: "Weakness",
    },
    recommendation: {
      icon: <Lightbulb className="w-5 h-5" />,
      color: "text-cyan-400",
      bg: "bg-cyan-500/5 border-cyan-500/15",
      label: "Recommendation",
    },
  }[item.type];

  const sev = severityStyles(item.severity);

  return (
    <div
      className={`border ${config.bg} rounded-xl p-4 animate-fade-in-up`}
      style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.color} flex-shrink-0 mt-0.5`}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-300">{item.category}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sev.tag}`}>
              {item.severity}
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{item.message}</p>
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  const strengths = insights.filter((i) => i.type === "strength");
  const weaknesses = insights.filter((i) => i.type === "weakness");
  const recommendations = insights.filter((i) => i.type === "recommendation");

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h3 className="font-display font-semibold text-slate-100">SEO Strengths</h3>
          <span className="text-xs text-slate-500 font-mono">({strengths.length})</span>
        </div>
        <div className="space-y-3">
          {strengths.length === 0 ? (
            <div className="bg-ink-850/40 border border-ink-700 rounded-xl p-4 text-sm text-slate-500 text-center">
              No strengths detected yet.
            </div>
          ) : (
            strengths.map((item, i) => <InsightCard key={i} item={item} index={i} />)
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h3 className="font-display font-semibold text-slate-100">Weaknesses</h3>
          <span className="text-xs text-slate-500 font-mono">({weaknesses.length})</span>
        </div>
        <div className="space-y-3">
          {weaknesses.length === 0 ? (
            <div className="bg-ink-850/40 border border-ink-700 rounded-xl p-4 text-sm text-emerald-400 text-center">
              No critical weaknesses found!
            </div>
          ) : (
            weaknesses.map((item, i) => <InsightCard key={i} item={item} index={i} />)
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Recommendations</h3>
          <span className="text-xs text-slate-500 font-mono">({recommendations.length})</span>
        </div>
        <div className="space-y-3">
          {recommendations.map((item, i) => <InsightCard key={i} item={item} index={i} />)}
        </div>
      </div>
    </div>
  );
}
