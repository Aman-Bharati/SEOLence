import type { AnalysisResult } from "../types";
import { Heading1, Heading2, Heading3, ImageIcon } from "lucide-react";

interface StructurePanelProps {
  result: AnalysisResult;
}

export function StructurePanel({ result }: StructurePanelProps) {
  const { parsed } = result;
  const headings = parsed?.headings || [];
  const images = parsed?.images || [];
  const h1s = headings.filter((h) => h?.level === 1);
  const h2s = headings.filter((h) => h?.level === 2);
  const h3s = headings.filter((h) => h?.level === 3);
  const h4plus = headings.filter((h) => h?.level >= 4);

  const imagesMissingAlt = images.filter((i) => !i?.hasAlt || (i?.alt || "").length === 0);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Heading Structure */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-100">Heading Structure</h3>
          <span className="text-xs text-slate-500 font-mono">{headings.length} total</span>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center bg-ink-800/50 rounded-lg p-2">
            <Heading1 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-lg font-display font-bold text-slate-100">{h1s.length}</p>
            <p className="text-[10px] text-slate-500">H1</p>
          </div>
          <div className="text-center bg-ink-800/50 rounded-lg p-2">
            <Heading2 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-lg font-display font-bold text-slate-100">{h2s.length}</p>
            <p className="text-[10px] text-slate-500">H2</p>
          </div>
          <div className="text-center bg-ink-800/50 rounded-lg p-2">
            <Heading3 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-lg font-display font-bold text-slate-100">{h3s.length}</p>
            <p className="text-[10px] text-slate-500">H3</p>
          </div>
          <div className="text-center bg-ink-800/50 rounded-lg p-2">
            <p className="text-sm font-mono text-slate-500 mb-1">H4+</p>
            <p className="text-lg font-display font-bold text-slate-100">{h4plus.length}</p>
            <p className="text-[10px] text-slate-500">sub</p>
          </div>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {headings.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No headings found on this page.</p>
          ) : (
            headings.map((heading, i) => (
              <div
                key={i}
                className="flex items-start gap-2 animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                    heading.level === 1
                      ? "bg-cyan-500/20 text-cyan-300"
                      : heading.level === 2
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-ink-700 text-slate-400"
                  }`}
                >
                  H{heading.level}
                </span>
                <span
                  className="text-sm text-slate-300 leading-relaxed"
                  style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                >
                  {heading.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Images */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-semibold text-slate-100">Image Analysis</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">{images.length} images</span>
        </div>

        {images.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No images found on this page.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3">
                <p className="text-2xl font-display font-bold text-emerald-400">
                  {images.length - imagesMissingAlt.length}
                </p>
                <p className="text-xs text-slate-400">With alt text</p>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/15 rounded-lg p-3">
                <p className="text-2xl font-display font-bold text-rose-400">
                  {imagesMissingAlt.length}
                </p>
                <p className="text-xs text-slate-400">Missing alt</p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {images.slice(0, 20).map((img, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-ink-800/40 last:border-0">
                  <img
                    src={img.src}
                    alt=""
                    className="w-8 h-8 rounded object-cover flex-shrink-0 bg-ink-800"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 truncate font-mono">
                      {(img.src || "").split("/").pop() || img.src}
                    </p>
                    <p className={`text-xs truncate ${img.hasAlt && img.alt ? "text-emerald-400" : "text-rose-400"}`}>
                      {img.hasAlt && img.alt ? `"${img.alt}"` : "Missing alt text"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
