import { useState } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Shield } from "lucide-react";
import type { TechSeoCheck } from "../types";

interface TechnicalSeoPanelProps {
  checks: Record<string, TechSeoCheck>;
}

export function TechnicalSeoPanel({ checks }: TechnicalSeoPanelProps) {
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  if (!checks || Object.keys(checks).length === 0) {
    return (
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-500 font-medium">No technical SEO checks found. Run a new audit to inspect site health.</p>
      </div>
    );
  }

  const checksList = Object.values(checks);
  const passedChecksCount = checksList.filter((c) => c.passed).length;
  const totalChecksCount = checksList.length;

  const toggleCheck = (id: string) => {
    setExpandedCheckId(expandedCheckId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary Card */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-slate-50">Technical SEO Engine</h3>
            <p className="text-xs text-slate-400 mt-0.5">Automated crawling diagnostics for search visibility and outline compliance.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-ink-900/35 border border-ink-800/40 rounded-xl px-4 py-3 shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Passed Checks</p>
            <p className="text-lg font-display font-bold text-slate-100 mt-0.5">
              {passedChecksCount} / {totalChecksCount}
            </p>
          </div>
          <div className="w-[1px] h-8 bg-ink-700/60 mx-1"></div>
          <div className="text-left font-display text-2xl font-bold text-cyan-400 pl-1">
            {Math.round((passedChecksCount / totalChecksCount) * 100)}%
          </div>
        </div>
      </div>

      {/* List of Checks */}
      <div className="space-y-3">
        {checksList.map((check) => {
          const isExpanded = expandedCheckId === check.id;
          const severityColors = {
            high: "bg-rose-500/10 border-rose-500/30 text-rose-400",
            medium: "bg-amber-500/10 border-amber-500/30 text-amber-400",
            low: "bg-blue-500/10 border-blue-500/30 text-blue-400",
            none: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          };

          return (
            <div
              key={check.id}
              className={`bg-ink-850/60 glass border rounded-xl transition-all overflow-hidden ${
                isExpanded ? "border-ink-600 shadow-md" : "border-ink-700/60 hover:border-ink-600"
              }`}
            >
              {/* Header block click area */}
              <div
                onClick={() => toggleCheck(check.id)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {check.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : check.severity === "high" ? (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                      {check.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{check.issue}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono uppercase tracking-wider ${severityColors[check.severity]}`}>
                    {check.passed ? "Passed" : `${check.severity} Severity`}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expansion Details Block */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-ink-850 bg-ink-900/15 text-xs space-y-4 pt-4 animate-fade-in">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Problem/Evidence */}
                    <div className="p-3 bg-ink-950/40 border border-ink-800/40 rounded-xl space-y-1.5">
                      <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Evidence</p>
                      <p className="font-mono text-slate-300 bg-ink-950 p-2 rounded-lg break-all">{check.evidence}</p>
                    </div>

                    {/* How to Fix */}
                    <div className="p-3 bg-ink-950/40 border border-ink-800/40 rounded-xl space-y-1.5">
                      <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">How to Fix</p>
                      <p className="text-slate-300 leading-relaxed">{check.fix}</p>
                    </div>
                  </div>

                  {/* References & Links */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-ink-800/40">
                    <span className="text-[10px] text-slate-500 font-medium">Verified using search console outline compliance rules.</span>
                    <a
                      href={check.reference}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline transition-colors font-semibold"
                    >
                      <span>Read Search Reference Docs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
