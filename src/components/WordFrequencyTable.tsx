import { useState } from "react";
import type { KeywordEntry } from "../types";
import { STOP_WORDS } from "../lib/analyzer";
import { Search, ArrowUpDown } from "lucide-react";

interface WordFrequencyTableProps {
  rawFrequency: Map<string, number>;
  totalWords: number;
}

type SortKey = "count" | "word" | "density";

export function WordFrequencyTable({ rawFrequency, totalWords }: WordFrequencyTableProps) {
  const [filter, setFilter] = useState<"all" | "content" | "stop">("content");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [showAll, setShowAll] = useState(false);

  const allEntries: KeywordEntry[] = Array.from(rawFrequency.entries()).map(([word, count]) => ({
    word,
    count,
    density: totalWords > 0 ? Math.round((count / totalWords) * 1000) / 10 : 0,
  }));

  let entries = allEntries;
  if (filter === "content") {
    entries = entries.filter((e) => !STOP_WORDS.has(e.word));
  } else if (filter === "stop") {
    entries = entries.filter((e) => STOP_WORDS.has(e.word));
  }

  if (search) {
    entries = entries.filter((e) => e.word.includes(search.toLowerCase()));
  }

  entries.sort((a, b) => {
    if (sortKey === "count") return b.count - a.count;
    if (sortKey === "density") return b.density - a.density;
    return a.word.localeCompare(b.word);
  });

  const displayed = showAll ? entries : entries.slice(0, 50);
  const maxCount = entries[0]?.count ?? 1;

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-ink-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg text-slate-100">Word Frequency Report</h3>
          <span className="text-xs text-slate-500 font-mono">{entries.length} unique words</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words..."
              className="w-full bg-ink-800/80 border border-ink-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-400/40 transition-colors"
            />
          </div>

          <div className="flex gap-1 bg-ink-800/80 border border-ink-700 rounded-lg p-1">
            {(["content", "stop", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f === "content" ? "Keywords" : f === "stop" ? "Stop Words" : "All"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <span className="text-xs text-slate-500 flex items-center gap-1">Sort:</span>
          {(["count", "density", "word"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                sortKey === k ? "text-cyan-300 bg-cyan-500/10" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ArrowUpDown className="w-3 h-3" />
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-ink-850/95 backdrop-blur-sm z-10">
            <tr className="border-b border-ink-700">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5">Word</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5 w-20">Count</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5 w-24">Density</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-2.5 w-32">Frequency</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-500 text-sm py-12">
                  No words match your filters.
                </td>
              </tr>
            )}
            {displayed.map((entry, i) => {
              const isStop = STOP_WORDS.has(entry.word);
              return (
                <tr
                  key={entry.word}
                  className="border-b border-ink-800/50 hover:bg-ink-800/40 transition-colors animate-fade-in"
                  style={{ animationDelay: `${Math.min(i * 10, 300)}ms` }}
                >
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-slate-200">{entry.word}</span>
                      {isStop && (
                        <span className="text-[10px] font-medium text-slate-600 bg-ink-800 px-1.5 py-0.5 rounded">
                          stop
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-sm text-slate-300 tabular-nums">
                    {entry.count}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-sm tabular-nums">
                    <span className={entry.density > 4 ? "text-amber-400" : "text-slate-400"}>
                      {entry.density}%
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isStop ? "bg-slate-600" : entry.density > 4 ? "bg-amber-400" : "bg-gradient-to-r from-cyan-400 to-emerald-400"
                        }`}
                        style={{ width: `${(entry.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {entries.length > 50 && (
        <div className="p-3 border-t border-ink-700 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            {showAll ? "Show top 50" : `Show all ${entries.length} words`}
          </button>
        </div>
      )}
    </div>
  );
}
