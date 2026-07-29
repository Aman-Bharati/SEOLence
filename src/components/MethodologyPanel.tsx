import { useState } from "react";
import { ShieldCheck, ChevronDown, Info } from "lucide-react";

interface MethodologyPanelProps {
  seoScore: number;
}

interface ScoreBreakdown {
  category: string;
  maxPoints: number;
  description: string;
  checks: string[];
}

const SCORE_BREAKDOWN: ScoreBreakdown[] = [
  {
    category: "Title Tag",
    maxPoints: 15,
    description: "Title tag presence and optimal length",
    checks: [
      "8 pts — Title tag exists",
      "7 pts — Length between 30-60 characters",
      "3 pts — Title exists but outside ideal length",
    ],
  },
  {
    category: "Meta Description",
    maxPoints: 15,
    description: "Meta description presence and length",
    checks: [
      "8 pts — Meta description exists",
      "7 pts — Length between 70-160 characters",
      "3 pts — Description exists but outside ideal length",
    ],
  },
  {
    category: "Heading Structure",
    maxPoints: 15,
    description: "H1 and H2 tag hierarchy",
    checks: [
      "8 pts — Exactly one H1 tag",
      "2 pts — Multiple H1 tags (deducted)",
      "7 pts — Two or more H2 tags",
      "3 pts — At least one H2 tag",
    ],
  },
  {
    category: "Content Volume",
    maxPoints: 15,
    description: "Word count thresholds",
    checks: [
      "5 pts — 300+ words",
      "5 pts — 600+ words",
      "5 pts — 1200+ words",
    ],
  },
  {
    category: "Image Alt Text",
    maxPoints: 10,
    description: "Accessibility and image SEO",
    checks: [
      "10 pts — Proportional to alt text coverage ratio",
      "5 pts — No images on page (neutral)",
    ],
  },
  {
    category: "Linking",
    maxPoints: 10,
    description: "Internal and external links",
    checks: [
      "5 pts — 3+ total links",
      "3 pts — 2+ internal links",
      "2 pts — 1+ external link",
    ],
  },
  {
    category: "Social Tags",
    maxPoints: 10,
    description: "Open Graph and Twitter Card tags",
    checks: [
      "3 pts — og:title present",
      "2 pts — og:description present",
      "3 pts — og:image present",
      "2 pts — twitter:card present",
    ],
  },
  {
    category: "Technical SEO",
    maxPoints: 10,
    description: "Canonical, language, viewport, HTTP status",
    checks: [
      "3 pts — Canonical URL set",
      "2 pts — Language attribute set",
      "3 pts — Viewport meta tag",
      "2 pts — HTTP 2xx status",
    ],
  },
  {
    category: "Penalties",
    maxPoints: 0,
    description: "Score deductions for SEO issues",
    checks: [
      "-1 to -5 pts — Keyword stuffing (density > 5%)",
      "-3 pts per high-severity weakness",
    ],
  },
];

export function MethodologyPanel({ seoScore }: MethodologyPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display font-semibold text-slate-100">How This Score Is Calculated</h3>
          <span className="text-xs text-slate-500">100% transparent methodology</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-5 space-y-4 animate-fade-in">
          <div className="bg-ink-800/40 rounded-xl p-4 border border-ink-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <p className="text-sm text-slate-300 font-medium">Your SEO Score: <span className="text-cyan-400 font-bold">{seoScore}/100</span></p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The SEO score is computed from 8 weighted categories totaling 100 points.
              Each check is evaluated against the page's actual HTML. Penalties are applied
              for keyword stuffing and high-severity issues. The score is clamped to 0-100.
            </p>
          </div>

          <div className="space-y-3">
            {SCORE_BREAKDOWN.map((item) => (
              <div key={item.category} className="bg-ink-800/30 rounded-lg p-3 border border-ink-700/30">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-slate-200">{item.category}</h4>
                  <span className={`text-xs font-mono ${item.maxPoints > 0 ? "text-cyan-400" : "text-rose-400"}`}>
                    {item.maxPoints > 0 ? `/${item.maxPoints} pts` : "Penalties"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{item.description}</p>
                <ul className="space-y-1">
                  {item.checks.map((check, i) => (
                    <li key={i} className="text-xs text-slate-400 font-mono pl-3 border-l border-ink-700">
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-ink-800/40 rounded-xl p-4 border border-ink-700/50">
            <h4 className="text-sm font-medium text-slate-200 mb-2">Readability Scoring</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              Uses the Flesch Reading Ease formula, a widely-accepted standard since 1948:
            </p>
            <div className="bg-ink-900/60 rounded-lg p-3 font-mono text-xs text-emerald-400 mb-2">
              Score = 206.835 − (1.015 × words/sentences) − (84.6 × syllables/words)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-emerald-400">90-100: Very Easy</span>
              <span className="text-cyan-400">70-80: Fairly Easy</span>
              <span className="text-amber-400">50-60: Fairly Difficult</span>
              <span className="text-rose-400">0-30: Very Difficult</span>
            </div>
          </div>

          <div className="bg-ink-800/40 rounded-xl p-4 border border-ink-700/50">
            <h4 className="text-sm font-medium text-slate-200 mb-2">Data Source</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analysis is performed on the raw HTML returned by the server. The page is fetched
              via a Supabase Edge Function with a 15-second timeout, following redirects.
              Scripts, styles, and HTML comments are stripped before text extraction.
              Client-side rendered SPAs are detected and flagged with reduced confidence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
