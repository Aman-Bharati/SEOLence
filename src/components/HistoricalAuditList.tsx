import React, { useState } from "react";
import type { WebsiteAudit } from "../types";
import {
  Calendar,
  ChevronRight,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";

interface HistoricalAuditListProps {
  audits: WebsiteAudit[];
  onSelectAudit: (audit: WebsiteAudit) => void;
  onDeleteAudits: (auditIds: string[]) => Promise<void>;
  showDomain?: boolean;
  emptyMessage?: string;
  title?: string;
}

function getDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return urlStr;
  }
}

export const HistoricalAuditList: React.FC<HistoricalAuditListProps> = ({
  audits,
  onSelectAudit,
  onDeleteAudits,
  showDomain = false,
  emptyMessage = "No audit records found.",
  title = "Historical Audit Records",
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const allSelected = audits.length > 0 && selectedIds.length === audits.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < audits.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(audits.map((a) => a.id));
    }
  };

  const handleToggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSingleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingIds([id]);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length > 0) {
      setDeletingIds(selectedIds);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingIds || deletingIds.length === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteAudits(deletingIds);
      // Remove deleted IDs from selectedIds state
      setSelectedIds((prev) => prev.filter((id) => !deletingIds.includes(id)));
    } catch (err) {
      console.error("Failed to delete audit records:", err);
    } finally {
      setIsDeleting(false);
      setDeletingIds(null);
    }
  };

  const handleCancelDelete = () => {
    setDeletingIds(null);
  };

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
      {/* Header with Title and Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 border-b border-ink-800 pb-3">
        <div className="flex items-center gap-3">
          {audits.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              title={allSelected ? "Deselect All" : "Select All"}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 px-2 rounded bg-ink-900/50 border border-ink-750"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-cyan-400" />
              ) : isSomeSelected ? (
                <div className="w-4 h-4 flex items-center justify-center text-cyan-400 font-bold text-xs border border-cyan-400 rounded">
                  -
                </div>
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>Select All ({audits.length})</span>
            </button>
          )}
          <h3 className="font-display font-semibold text-slate-100 flex items-center gap-2">
            {title}
            {audits.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-ink-800 text-slate-400 border border-ink-700 font-mono">
                {audits.length}
              </span>
            )}
          </h3>
        </div>

        {/* Delete Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-all font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-ink-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Audit List Items */}
      <div className="space-y-3">
        {audits.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            {emptyMessage}
          </div>
        ) : (
          audits.map((audit) => {
            const isSelected = selectedIds.includes(audit.id);
            return (
              <div
                key={audit.id}
                onClick={() => onSelectAudit(audit)}
                className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all group ${
                  isSelected
                    ? "bg-cyan-500/10 border-cyan-500/40"
                    : "bg-ink-900/30 hover:bg-ink-850/50 border-ink-800/60 hover:border-cyan-500/20"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Item Checkbox */}
                  <div
                    onClick={(e) => handleToggleSelectOne(audit.id, e)}
                    className="p-1 text-slate-500 hover:text-cyan-400 transition-colors shrink-0"
                    title={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-400" />
                    )}
                  </div>

                  {/* Score Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 border ${
                      audit.overall_score >= 80
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : audit.overall_score >= 50
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {audit.overall_score}
                  </div>

                  {/* Record Details */}
                  <div className="min-w-0 flex-1">
                    {showDomain && (
                      <p className="text-sm font-semibold text-slate-200 truncate">
                        {getDomain(audit.url)}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(audit.created_at).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                      <span>
                        SEO:{" "}
                        <strong className="text-slate-300">
                          {audit.seo_score}
                        </strong>
                      </span>
                      <span>
                        Accessibility:{" "}
                        <strong className="text-slate-300">
                          {audit.accessibility_score}
                        </strong>
                      </span>
                      <span>
                        Security:{" "}
                        <strong className="text-slate-300">
                          {audit.security_score}
                        </strong>
                      </span>
                      <span>
                        Content:{" "}
                        <strong className="text-slate-300">
                          {audit.content_score}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={(e) => handleSingleDeleteClick(audit.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                    title="Delete audit record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {deletingIds && (
        <div
          className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={handleCancelDelete}
        >
          <div
            className="bg-ink-850 border border-ink-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="font-display font-bold text-slate-100 text-base">
                  Confirm Deletion
                </h4>
                <p className="text-xs text-slate-400">
                  {deletingIds.length === 1
                    ? "Delete 1 historical audit record?"
                    : `Delete ${deletingIds.length} historical audit records?`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-ink-900/60 p-3 rounded-xl border border-ink-800">
              This action will permanently remove{" "}
              <strong className="text-slate-100">
                {deletingIds.length === 1
                  ? "this historical audit record"
                  : `${deletingIds.length} selected audit records`}
              </strong>{" "}
              from the database. This operation cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 bg-ink-800 hover:bg-ink-750 border border-ink-700 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {deletingIds.length === 1 ? "Record" : `Records (${deletingIds.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
