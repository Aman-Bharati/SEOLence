import type { AnalysisResult } from "../types";
import { Tag, Twitter, Share2, FileCode } from "lucide-react";

interface MetaDetailsProps {
  result: AnalysisResult;
}

function StatusRow({ label, value, status }: { label: string; value?: string | null; status: "ok" | "warn" | "bad" | "info" }) {
  const colors = {
    ok: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-rose-400",
    info: "text-slate-400",
  };
  const dotColors = {
    ok: "bg-emerald-400",
    warn: "bg-amber-400",
    bad: "bg-rose-400",
    info: "bg-slate-500",
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-ink-800/50 last:border-0">
      <div className={`w-1.5 h-1.5 rounded-full ${dotColors[status]} mt-2 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">{label}</span>
          <span className={`text-xs font-mono ${colors[status]}`}>
            {value ?? "Missing"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MetaDetails({ result }: MetaDetailsProps) {
  const { parsed } = result;
  const titleLen = parsed.title?.length ?? 0;
  const descLen = parsed.metaDescription?.length ?? 0;

  const titleStatus = !parsed.title ? "bad" : titleLen >= 30 && titleLen <= 60 ? "ok" : "warn";
  const descStatus = !parsed.metaDescription ? "bad" : descLen >= 70 && descLen <= 160 ? "ok" : "warn";

  const ogCount = Object.keys(parsed.ogTags).length;
  const twCount = Object.keys(parsed.twitterTags).length;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Meta Tags */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Meta Tags</h3>
        </div>
        <div className="space-y-0">
          <StatusRow label="Title Tag" value={parsed.title ? `${titleLen} chars` : null} status={titleStatus} />
          {parsed.title && (
            <div className="py-2 pl-4 text-sm text-slate-300 font-medium border-b border-ink-800/50">
              "{parsed.title}"
            </div>
          )}
          <StatusRow label="Meta Description" value={parsed.metaDescription ? `${descLen} chars` : null} status={descStatus} />
          {parsed.metaDescription && (
            <div className="py-2 pl-4 text-sm text-slate-400 border-b border-ink-800/50 leading-relaxed">
              {parsed.metaDescription}
            </div>
          )}
          <StatusRow label="Canonical URL" value={parsed.canonical ? "Set" : null} status={parsed.canonical ? "ok" : "warn"} />
          <StatusRow label="Robots" value={parsed.robots ?? null} status="info" />
          <StatusRow label="Viewport" value={parsed.viewport ? "Set" : null} status={parsed.viewport ? "ok" : "bad"} />
          <StatusRow label="Language" value={parsed.lang ?? null} status="info" />
          <StatusRow label="Charset" value={parsed.charset ?? null} status="info" />
        </div>
      </div>

      {/* Social + Technical */}
      <div className="space-y-4">
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-semibold text-slate-100">Social & Open Graph</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-ink-800/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Share2 className="w-3 h-3 text-cyan-400" />
                <span className="text-xs text-slate-400 font-medium">Open Graph</span>
              </div>
              <p className="text-lg font-display font-bold text-slate-100">{ogCount}</p>
              <p className="text-xs text-slate-600">tags found</p>
            </div>
            <div className="bg-ink-800/50 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Twitter className="w-3 h-3 text-cyan-400" />
                <span className="text-xs text-slate-400 font-medium">Twitter Cards</span>
              </div>
              <p className="text-lg font-display font-bold text-slate-100">{twCount}</p>
              <p className="text-xs text-slate-600">tags found</p>
            </div>
          </div>
          {ogCount > 0 && (
            <div className="mt-3 space-y-1">
              {Object.entries(parsed.ogTags).slice(0, 5).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-cyan-400 flex-shrink-0">{key}</span>
                  <span className="text-slate-500 truncate">{val.slice(0, 50)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-semibold text-slate-100">Page Details</h3>
          </div>
          <div className="space-y-0">
            <StatusRow label="HTTP Status" value={String(parsed.statusCode)} status={parsed.statusCode >= 200 && parsed.statusCode < 300 ? "ok" : "warn"} />
            <StatusRow label="Content Type" value={parsed.contentType.split(";")[0]} status="info" />
            <StatusRow label="HTML Size" value={`${(parsed.rawHtmlLength / 1024).toFixed(1)} KB`} status="info" />
            <StatusRow label="Domain" value={new URL(parsed.finalUrl).hostname} status="info" />
            <StatusRow label="Protocol" value={new URL(parsed.finalUrl).protocol.replace(":", "").toUpperCase()} status={parsed.finalUrl.startsWith("https") ? "ok" : "warn"} />
          </div>
        </div>
      </div>
    </div>
  );
}
