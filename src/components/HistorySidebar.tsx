import type { SeoReport } from "../types";
import { Clock, Trash2, ChevronRight, BarChart3 } from "lucide-react";

interface HistorySidebarProps {
  reports: SeoReport[];
  onSelect: (report: SeoReport) => void;
  onDelete: (id: string) => void;
  activeId: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-rose-400";
}

export function HistorySidebar({ reports, onSelect, onDelete, activeId }: HistorySidebarProps) {
  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl overflow-hidden h-fit sticky top-6">
      <div className="p-4 border-b border-ink-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Analysis History</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">Saved reports from Supabase</p>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {reports.length === 0 ? (
          <div className="p-6 text-center">
            <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No analyses yet.</p>
            <p className="text-xs text-slate-600 mt-1">Run your first analysis to see it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-800/60">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`group p-3 cursor-pointer transition-all ${
                  activeId === report.id ? "bg-cyan-500/5" : "hover:bg-ink-800/40"
                }`}
                onClick={() => onSelect(report)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{report.domain}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {report.title || report.url}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-600">{timeAgo(report.created_at)}</span>
                      <span className={`text-xs font-mono font-bold ${scoreColor(report.seo_score)}`}>
                        {report.seo_score}/100
                      </span>
                      <span className="text-xs text-slate-600 font-mono">{report.word_count}w</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(report.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
