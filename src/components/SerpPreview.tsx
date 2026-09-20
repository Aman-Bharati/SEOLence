import { useState } from "react";
import { Eye, RotateCcw, Smartphone, Monitor } from "lucide-react";
import type { AnalysisResult } from "../types";

interface SerpPreviewProps {
  result: AnalysisResult;
}

function getDomain(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function SerpPreview({ result }: SerpPreviewProps) {
  const [title, setTitle] = useState(result.parsed.title || result.metaSuggestions.suggestedTitle);
  const [description, setDescription] = useState(
    result.parsed.metaDescription || result.metaSuggestions.suggestedDescription,
  );
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [useSuggested, setUseSuggested] = useState(false);

  const url = getDomain(result.parsed.finalUrl) || "website.com";
  const titleColor = title.length > 60 ? "text-rose-400" : "text-cyan-400";

  const maxWidth = device === "mobile" ? "max-w-[320px]" : "max-w-[600px]";

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">SERP Preview</h3>
          <span className="text-xs text-slate-500">See how your page appears in Google</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded-lg transition-colors ${device === "desktop" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded-lg transition-colors ${device === "mobile" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google-style preview */}
      <div className={`bg-white rounded-xl p-4 ${maxWidth} transition-all`} style={{ fontFamily: "arial, sans-serif" }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
            {url.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-slate-900 font-medium leading-tight">{url.split("/")[0]}</p>
            <p className="text-xs text-slate-500 leading-tight">{url}</p>
          </div>
        </div>
        <h4 className={`text-lg leading-snug mt-2 ${titleColor}`} style={{ color: title.length > 60 ? "#dc2626" : "#1a0dab", fontFamily: "arial, sans-serif" }}>
          {title || "Untitled Page"}
        </h4>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: description.length > 160 ? "#dc2626" : "#545454", fontFamily: "arial, sans-serif" }}>
          {description || "No meta description — Google will auto-generate one from page content."}
        </p>
      </div>

      {/* Character counters */}
      <div className="flex gap-4 mt-3 text-xs">
        <span className={title.length > 60 ? "text-rose-400" : title.length >= 30 ? "text-emerald-400" : "text-amber-400"}>
          Title: {title.length} chars {title.length > 60 ? "(truncated!)" : title.length === 0 ? "(missing!)" : title.length < 30 ? "(too short)" : "(good)"}
        </span>
        <span className={description.length > 160 ? "text-rose-400" : description.length === 0 ? "text-rose-400" : description.length >= 70 ? "text-emerald-400" : "text-amber-400"}>
          Description: {description.length} chars {description.length > 160 ? "(truncated!)" : description.length === 0 ? "(missing!)" : description.length < 70 ? "(too short)" : "(good)"}
        </span>
      </div>

      {/* Editable fields */}
      <div className="mt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400">Title Tag (editable)</label>
            <button
              onClick={() => {
                if (useSuggested) {
                  setTitle(result.parsed.title || "");
                } else {
                  setTitle(result.metaSuggestions.suggestedTitle);
                }
                setUseSuggested(!useSuggested);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {useSuggested ? "Use original" : "Use suggested"}
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={70}
            className="w-full bg-ink-800/80 border border-ink-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/40 transition-colors"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400">Meta Description (editable)</label>
            <button
              onClick={() => {
                setDescription(result.metaSuggestions.suggestedDescription);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Use suggested
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            className="w-full bg-ink-800/80 border border-ink-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400/40 transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}
