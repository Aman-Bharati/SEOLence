export function LoadingState() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero skeleton */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-40 h-40 rounded-2xl bg-ink-800 animate-shimmer" />
        <div className="flex-1 space-y-3 w-full">
          <div className="h-6 w-3/4 bg-ink-800 rounded-lg animate-shimmer" />
          <div className="h-4 w-1/2 bg-ink-800/60 rounded-lg animate-shimmer" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 bg-ink-800/40 rounded-xl animate-shimmer" />
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-ink-850/60 border border-ink-700 rounded-xl p-4 h-24 animate-shimmer" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-ink-850/60 border border-ink-700 rounded-2xl p-5 h-64 animate-shimmer" />
        ))}
      </div>

      <div className="text-center py-4">
        <div className="inline-flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin-slow" />
          <span className="font-display text-sm">Crawling page and analyzing content…</span>
        </div>
      </div>
    </div>
  );
}
