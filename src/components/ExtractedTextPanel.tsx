import { useState } from "react";
import type { AnalysisResult } from "../types";
import { FileText, ChevronDown, Search } from "lucide-react";

interface ExtractedTextPanelProps {
  result: AnalysisResult;
}

export function ExtractedTextPanel({ result }: ExtractedTextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const { parsed } = result;
  const paragraphs = parsed.paragraphs.length > 0
    ? parsed.paragraphs
    : (parsed.visibleText ? [parsed.visibleText] : []);

  const filtered = search
    ? paragraphs.filter((p) => p.toLowerCase().includes(search.toLowerCase()))
    : paragraphs;

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-ink-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Extracted Page Text</h3>
          <span className="text-xs text-slate-500 font-mono">{paragraphs.length} blocks</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-ink-700 animate-fade-in">
          {parsed.isClientRendered && (
            <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/15 text-xs text-amber-300">
              Client-rendered SPA: only noscript fallback text and head metadata available.
            </div>
          )}

          <div className="p-4 border-b border-ink-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search within extracted text..."
                className="w-full bg-ink-800/80 border border-ink-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-400/40 transition-colors"
              />
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto p-5 space-y-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                {paragraphs.length === 0
                  ? "No paragraph content was extractable from this page."
                  : "No matches for your search."}
              </p>
            ) : (
              filtered.map((para, i) => (
                <div
                  key={i}
                  className="flex gap-3 py-2 border-b border-ink-800/40 last:border-0 animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
                >
                  <span className="text-xs font-mono text-cyan-400/60 flex-shrink-0 w-7 pt-1 text-right">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed">{para}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
