import { useState } from "react";
import { GitCompare, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { WebsiteAudit } from "../types";
import { compareAudits } from "../lib/analysis/historyDiff";

interface HistoryRegressionPanelProps {
  audits: WebsiteAudit[];
}

export function HistoryRegressionPanel({ audits }: HistoryRegressionPanelProps) {
  const [compareIdx, setCompareIdx] = useState<number>(1); // default to second latest audit if available

  if (audits.length < 2) {
    return (
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-500 font-medium">Add more audits to compare changes and track quality regressions over time.</p>
      </div>
    );
  }

  const latestAudit = audits[0];
  const oldAudit = audits[compareIdx] || audits[1];
  const diff = compareAudits(oldAudit, latestAudit);

  return (
    <div className="space-y-6">
      {/* Selector and Title Banner */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-slate-100">Regression & Improvement Detector</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Compare current audit metrics with a historical baseline.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Baseline Audit:</span>
            <select
              value={compareIdx}
              onChange={(e) => setCompareIdx(Number(e.target.value))}
              className="bg-ink-900 border border-ink-700 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {audits.slice(1).map((audit, idx) => (
                <option key={audit.id} value={idx + 1}>
                  {new Date(audit.created_at).toLocaleString()} (Score: {audit.overall_score})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Delta Score Changes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "Overall Score", current: latestAudit.overall_score, change: diff.scoreChange.overall },
          { label: "SEO Score", current: latestAudit.seo_score, change: diff.scoreChange.seo },
          { label: "Accessibility", current: latestAudit.accessibility_score, change: diff.scoreChange.accessibility },
          { label: "Security", current: latestAudit.security_score, change: diff.scoreChange.security },
          { label: "Content", current: latestAudit.content_score, change: diff.scoreChange.content },
          { label: "Performance", current: latestAudit.performance_score, change: diff.scoreChange.performance },
        ].map((item, idx) => (
          <div key={idx} className="bg-ink-900/40 border border-ink-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xl font-bold font-display text-slate-100">{item.current}</span>
              {item.change !== 0 && (
                <span className={`text-[10px] font-bold flex items-center ${
                  item.change > 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {item.change > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                  )}
                  {item.change > 0 ? `+${item.change}` : item.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Regressions and Improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Regressions alert card */}
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
          <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Regressions Found ({diff.regressions.length})
          </h4>
          <p className="text-xs text-slate-400">
            Issues that passed in the baseline audit but are failing now. Fix these immediately.
          </p>

          <div className="space-y-3">
            {diff.regressions.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs bg-ink-900/20 rounded-xl border border-ink-800">
                🎉 Excellent! No quality regressions detected.
              </div>
            ) : (
              diff.regressions.map((reg, idx) => (
                <div key={idx} className="p-3.5 bg-rose-500/5 border border-rose-500/25 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-semibold">
                    {reg.category}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed mt-1">{reg.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Improvements card */}
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
          <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Resolved & Improved ({diff.improvements.length})
          </h4>
          <p className="text-xs text-slate-400">
            Issues that were failing in the baseline audit but are now resolved.
          </p>

          <div className="space-y-3">
            {diff.improvements.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs bg-ink-900/20 rounded-xl border border-ink-800">
                No score changes or solved issues since baseline audit.
              </div>
            ) : (
              diff.improvements.map((imp, idx) => (
                <div key={idx} className="p-3.5 bg-emerald-500/5 border border-emerald-500/25 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                    {imp.category}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed mt-1">{imp.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Meta side-by-side comparison boxes */}
      {(diff.metaChanges.titleChanged || diff.metaChanges.descChanged) && (
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
          <h4 className="font-display font-semibold text-slate-100 text-sm">Metadata Changes</h4>

          <div className="space-y-4">
            {diff.metaChanges.titleChanged && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Title Tag Shift</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-ink-900/40 border border-ink-800 rounded-xl">
                    <p className="text-[10px] text-slate-500">Previous</p>
                    <p className="text-xs font-semibold text-slate-300 mt-1">{diff.metaChanges.prevTitle || "(Empty)"}</p>
                  </div>
                  <div className="p-3.5 bg-ink-900/40 border border-ink-800 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-cyan-400">Current</p>
                      <p className="text-xs font-semibold text-slate-100 mt-1">{diff.metaChanges.currTitle || "(Empty)"}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cyan-500 shrink-0" />
                  </div>
                </div>
              </div>
            )}

            {diff.metaChanges.descChanged && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Meta Description Shift</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-ink-900/40 border border-ink-800 rounded-xl">
                    <p className="text-[10px] text-slate-500">Previous</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed font-mono">{diff.metaChanges.prevDesc || "(Empty)"}</p>
                  </div>
                  <div className="p-3.5 bg-ink-900/40 border border-ink-800 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-cyan-400">Current</p>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed font-mono">{diff.metaChanges.currDesc || "(Empty)"}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cyan-500 shrink-0" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
