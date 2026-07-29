import { CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import type { AnalysisResult } from "../types";

interface VerificationChecklistProps {
  result: AnalysisResult;
}

export function VerificationChecklist({ result }: VerificationChecklistProps) {
  const { verificationChecks } = result;
  const passed = verificationChecks.filter((c) => c.passed).length;
  const total = verificationChecks.length;
  const passRate = Math.round((passed / total) * 100);

  const categories = Array.from(new Set(verificationChecks.map((c) => c.category)));

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Verification Checklist</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-ink-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${passRate >= 75 ? "bg-emerald-400" : passRate >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
              style={{ width: `${passRate}%` }}
            />
          </div>
          <span className={`text-sm font-mono font-medium ${passRate >= 75 ? "text-emerald-400" : passRate >= 50 ? "text-amber-400" : "text-rose-400"}`}>
            {passed}/{total}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Every check shows the expected value, the actual value found on your page, and whether it passed.
        This is the raw data behind your SEO score — no black boxes.
      </p>

      <div className="space-y-5">
        {categories.map((category) => {
          const catChecks = verificationChecks.filter((c) => c.category === category);
          return (
            <div key={category}>
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
              <div className="space-y-2">
                {catChecks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-3 p-3 bg-ink-800/30 rounded-lg border border-ink-700/30"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : check.weight >= 8 ? (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm text-slate-200 font-medium">{check.label}</span>
                        <span className="text-xs font-mono text-slate-500 flex-shrink-0">{check.weight} pts</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Expected: </span>
                          <span className="text-slate-400">{check.expected}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Actual: </span>
                          <span className={check.passed ? "text-emerald-400" : "text-amber-400"}>
                            {check.actual}
                          </span>
                        </div>
                      </div>
                      {check.notes && (
                        <p className="text-xs text-slate-500 mt-1 italic">{check.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
