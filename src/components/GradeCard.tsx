import { GraduationCap } from "lucide-react";
import type { AnalysisResult } from "../types";

interface GradeCardProps {
  result: AnalysisResult;
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (grade.startsWith("B")) return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
  if (grade.startsWith("C")) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  if (grade.startsWith("D")) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
  return "text-rose-400 bg-rose-500/10 border-rose-500/20";
}

function statusIcon(status: string): string {
  switch (status) {
    case "good": return "●";
    case "warning": return "●";
    case "critical": return "●";
    default: return "●";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "good": return "text-emerald-400";
    case "warning": return "text-amber-400";
    case "critical": return "text-rose-400";
    default: return "text-slate-500";
  }
}

export function GradeCard({ result }: GradeCardProps) {
  const { gradeCard } = result;

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">SEO Grade Card</h3>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${gradeColor(gradeCard.overallGrade)}`}>
          <span className="text-xs text-slate-500">Overall</span>
          <span className="text-2xl font-display font-bold">{gradeCard.overallGrade}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {gradeCard.entries.map((entry) => (
          <div
            key={entry.category}
            className="bg-ink-800/40 rounded-xl p-3 border border-ink-700/50 hover:border-cyan-400/20 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-display font-bold ${gradeColor(entry.grade).split(" ")[0]}`}>
                {entry.grade}
              </span>
              <span className={`text-xs ${statusColor(entry.status)}`}>
                {statusIcon(entry.status)}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-tight mb-1">{entry.category}</p>
            <div className="w-full bg-ink-900/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  entry.status === "good" ? "bg-emerald-400" : entry.status === "warning" ? "bg-amber-400" : "bg-rose-400"
                }`}
                style={{ width: `${Math.round((entry.score / entry.maxScore) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">{entry.score}/{entry.maxScore}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
