import type { PhraseEntry } from "../types";

interface PhraseAnalysisProps {
  bigrams: PhraseEntry[];
  trigrams: PhraseEntry[];
}

export function PhraseAnalysis({ bigrams, trigrams }: PhraseAnalysisProps) {
  const maxBi = bigrams[0]?.count ?? 1;
  const maxTri = trigrams[0]?.count ?? 1;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-100">Top Bigrams (2-word phrases)</h3>
          <span className="text-xs text-slate-500 font-mono">{bigrams.length}</span>
        </div>
        {bigrams.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No recurring 2-word phrases found.</p>
        ) : (
          <div className="space-y-2.5">
            {bigrams.slice(0, 15).map((entry, i) => (
              <div
                key={entry.phrase}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm text-slate-200 capitalize">{entry.phrase}</span>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">{entry.count}×</span>
                </div>
                <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500/60 rounded-full transition-all duration-700"
                    style={{ width: `${(entry.count / maxBi) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-100">Top Trigrams (3-word phrases)</h3>
          <span className="text-xs text-slate-500 font-mono">{trigrams.length}</span>
        </div>
        {trigrams.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No recurring 3-word phrases found.</p>
        ) : (
          <div className="space-y-2.5">
            {trigrams.slice(0, 15).map((entry, i) => (
              <div
                key={entry.phrase}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm text-slate-200 capitalize">{entry.phrase}</span>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">{entry.count}×</span>
                </div>
                <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500/60 rounded-full transition-all duration-700"
                    style={{ width: `${(entry.count / maxTri) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
