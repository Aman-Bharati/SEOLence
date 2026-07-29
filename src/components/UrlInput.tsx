import { useState, type FormEvent } from "react";
import { Search, Globe, Loader2, AlertCircle } from "lucide-react";

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  loading: boolean;
  error: string | null;
}

const EXAMPLE_SITES = [
  "stripe.com",
  "notion.so",
  "linear.app",
  "vercel.com",
];

export function UrlInput({ onAnalyze, loading, error }: UrlInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim() && !loading) {
      onAnalyze(url.trim());
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-60 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-3 bg-ink-850/90 glass border border-ink-700 rounded-2xl px-5 py-4 focus-within:border-cyan-400/50 transition-colors duration-300">
            <Globe className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a URL (e.g., stripe.com)"
              disabled={loading}
              className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 text-base font-medium outline-none disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-semibold px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin-slow" />
                  Analyzing
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-rose-400 text-sm animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-medium">Try:</span>
        {EXAMPLE_SITES.map((site) => (
          <button
            key={site}
            onClick={() => !loading && onAnalyze(site)}
            disabled={loading}
            className="text-xs font-mono text-slate-400 bg-ink-800/60 hover:bg-ink-700 border border-ink-700 hover:border-cyan-400/30 px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-40"
          >
            {site}
          </button>
        ))}
      </div>
    </div>
  );
}
