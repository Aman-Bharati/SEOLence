import type { AnalysisResult } from "../types";
import { TrendingUp, AlertCircle, Sparkles, Copy } from "lucide-react";
import { useState } from "react";

interface KeywordRecommendationsProps {
  result: AnalysisResult;
}

export function KeywordRecommendations({ result }: KeywordRecommendationsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Overused */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <h3 className="font-display font-semibold text-slate-100">Overused Words</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">High density may signal keyword stuffing (&gt;4%)</p>
        {result.overusedWords.length === 0 ? (
          <div className="text-sm text-emerald-400 py-6 text-center bg-emerald-500/5 rounded-lg border border-emerald-500/15">
            No overused words detected
          </div>
        ) : (
          <div className="space-y-2">
            {result.overusedWords.slice(0, 8).map((word) => (
              <div key={word.word} className="flex items-center justify-between bg-ink-800/50 rounded-lg px-3 py-2">
                <span className="font-mono text-sm text-slate-200">{word.word}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-mono">{word.density}%</span>
                  <span className="text-xs text-slate-500 font-mono">{word.count}×</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Keywords */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">Recommended Keywords</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">Suggested targets based on your content & niche</p>
        <div className="flex flex-wrap gap-2">
          {result.recommendedKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => handleCopy(kw)}
              className="group flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-ink-800/60 hover:bg-cyan-500/10 border border-ink-700 hover:border-cyan-400/30 px-3 py-1.5 rounded-lg transition-all"
            >
              {kw}
              <Copy className={`w-3 h-3 transition-opacity ${copied === kw ? "text-cyan-400 opacity-100" : "opacity-40 group-hover:opacity-70"}`} />
            </button>
          ))}
        </div>
        {copied && (
          <p className="text-xs text-emerald-400 mt-3 animate-fade-in">Copied "{copied}" to clipboard</p>
        )}
      </div>

      {/* Top SEO Keywords */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="font-display font-semibold text-slate-100">Strongest SEO Keywords</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">High-relevance content words by frequency</p>
        <div className="space-y-2">
          {result.topKeywords.slice(0, 8).map((kw, i) => (
            <div key={kw.word} className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-600 w-4">{i + 1}</span>
              <span className="font-mono text-sm text-slate-200 flex-1 capitalize">{kw.word}</span>
              <span className="text-xs text-slate-500 font-mono">{kw.count}×</span>
              <div className="w-16 h-1.5 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${(kw.count / result.topKeywords[0].count) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
