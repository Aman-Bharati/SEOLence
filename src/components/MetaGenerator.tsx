import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import type { AnalysisResult } from "../types";

interface MetaGeneratorProps {
  result: AnalysisResult;
}

export function MetaGenerator({ result }: MetaGeneratorProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { metaSuggestions } = result;

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const htmlTitle = `<title>${metaSuggestions.suggestedTitle}</title>`;
  const htmlDesc = `<meta name="description" content="${metaSuggestions.suggestedDescription}" />`;

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="font-display font-semibold text-slate-100">AI Meta Tag Generator</h3>
        <span className="text-xs text-slate-500">Auto-generated from your content</span>
      </div>

      <div className="space-y-4">
        {/* Suggested Title */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">TITLE</span>
              <span className="text-xs text-slate-500">{metaSuggestions.suggestedTitle.length} chars</span>
            </div>
            <button
              onClick={() => copy(htmlTitle, "title")}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              {copiedField === "title" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedField === "title" ? "Copied!" : "Copy HTML"}
            </button>
          </div>
          <div className="bg-ink-800/80 border border-ink-700 rounded-lg p-3">
            <p className="text-sm text-slate-200 font-medium mb-2">{metaSuggestions.suggestedTitle}</p>
            <div className="bg-ink-900/60 rounded p-2 font-mono text-xs text-emerald-400 overflow-x-auto">
              {htmlTitle}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{metaSuggestions.titleReason}</p>
        </div>

        {/* Suggested Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">DESCRIPTION</span>
              <span className="text-xs text-slate-500">{metaSuggestions.suggestedDescription.length} chars</span>
            </div>
            <button
              onClick={() => copy(htmlDesc, "desc")}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              {copiedField === "desc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedField === "desc" ? "Copied!" : "Copy HTML"}
            </button>
          </div>
          <div className="bg-ink-800/80 border border-ink-700 rounded-lg p-3">
            <p className="text-sm text-slate-200 mb-2">{metaSuggestions.suggestedDescription}</p>
            <div className="bg-ink-900/60 rounded p-2 font-mono text-xs text-emerald-400 overflow-x-auto">
              {htmlDesc}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{metaSuggestions.descriptionReason}</p>
        </div>

        {/* OG Tags suggestion */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">OPEN GRAPH</span>
            </div>
            <button
              onClick={() => copy(
                `<meta property="og:title" content="${metaSuggestions.suggestedTitle}" />\n<meta property="og:description" content="${metaSuggestions.suggestedDescription}" />\n<meta property="og:type" content="website" />`,
                "og",
              )}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              {copiedField === "og" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedField === "og" ? "Copied!" : "Copy HTML"}
            </button>
          </div>
          <div className="bg-ink-900/60 rounded-lg p-2 font-mono text-xs text-violet-400 overflow-x-auto leading-relaxed">
            {`<meta property="og:title" content="${metaSuggestions.suggestedTitle}" />`}
            <br />
            {`<meta property="og:description" content="${metaSuggestions.suggestedDescription}" />`}
            <br />
            {`<meta property="og:type" content="website" />`}
          </div>
        </div>
      </div>
    </div>
  );
}
