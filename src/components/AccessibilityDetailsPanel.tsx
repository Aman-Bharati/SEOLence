import { ShieldAlert, CheckCircle2, AlertTriangle, Image as ImageIcon, HelpCircle } from "lucide-react";
import type { ParsedPage } from "../types";

interface AccessibilityDetailsPanelProps {
  parsed: ParsedPage;
}

export function AccessibilityDetailsPanel({ parsed }: AccessibilityDetailsPanelProps) {
  const flags = parsed.accessibilityFlags || {
    hasLang: false,
    langValue: null,
    hasHeadingSequenceViolation: false,
    imagesMissingAltCount: 0,
    totalImagesCount: 0,
    missingFormLabelsCount: 0,
    emptyButtonsCount: 0,
    emptyLinksCount: 0,
    zoomDisabled: false,
    iframeMissingTitle: false,
    nonSemanticLandmarks: false,
  };

  const checks = [
    {
      name: "HTML Lang Declared",
      status: flags.hasLang,
      passedText: `Language correctly set to "${flags.langValue || "en"}".`,
      failedText: "Missing language attribute on <html> element.",
      severity: "high" as const,
      desc: "Declaring the language ensures screen readers pronounce the website text correctly."
    },
    {
      name: "Heading Level Sequence",
      status: !flags.hasHeadingSequenceViolation,
      passedText: "Heading hierarchy uses ordered sequences.",
      failedText: "Heading skipped sequences detected (e.g. going H1 to H3).",
      severity: "medium" as const,
      desc: "Maintains screen-reader outline structures so users can navigate headings sequentially."
    },
    {
      name: "Form Input Labels",
      status: (flags.missingFormLabelsCount ?? 0) === 0,
      passedText: "All input fields have corresponding labels or titles.",
      failedText: `Found ${flags.missingFormLabelsCount ?? 0} inputs missing descriptive labels.`,
      severity: "high" as const,
      desc: "Form elements need labels or aria-label attributes so screen readers describe inputs to users."
    },
    {
      name: "Interactive Buttons",
      status: (flags.emptyButtonsCount ?? 0) === 0,
      passedText: "All buttons contain readable text or naming tags.",
      failedText: `Found ${flags.emptyButtonsCount ?? 0} empty button controls.`,
      severity: "high" as const,
      desc: "Buttons without text, labels, or inner image alt text block keyboard screen reader users."
    },
    {
      name: "Accessible Links",
      status: (flags.emptyLinksCount ?? 0) === 0,
      passedText: "All anchor tags display descriptive link texts.",
      failedText: `Found ${flags.emptyLinksCount ?? 0} empty anchor link nodes.`,
      severity: "medium" as const,
      desc: "Anchors without readable text or labels are announced as blank URLs by screen readers."
    },
    {
      name: "Responsive Viewport Scaling",
      status: !flags.zoomDisabled,
      passedText: "Viewport zoom is enabled (supports user scaling).",
      failedText: "Viewport settings disable page zooming.",
      severity: "medium" as const,
      desc: "Blocking zoom scaling (e.g. user-scalable=no) prevents visually impaired users from magnifying pages."
    },
    {
      name: "Embedded Iframe Titles",
      status: !flags.iframeMissingTitle,
      passedText: "All embed frames display identifier title tags.",
      failedText: "Iframe embeddings missing descriptions.",
      severity: "medium" as const,
      desc: "Iframes require a title attribute so users can identify what content the iframe embeds."
    },
    {
      name: "Document Landmark Outlines",
      status: !flags.nonSemanticLandmarks,
      passedText: "Page layout utilizes standard landmarks (<main>, <nav> etc.).",
      failedText: "Missing core semantic landmark outlines.",
      severity: "low" as const,
      desc: "Core landmarks help screen reader users skip repetitive menus and jump straight to content."
    }
  ];

  const totalChecks = checks.length;
  const passedCount = checks.filter(c => c.status).length;
  const score = Math.round((passedCount / totalChecks) * 100);

  return (
    <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-6">
      {/* Header and Rating */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-800 pb-5">
        <div>
          <h3 className="font-display font-semibold text-slate-100 text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            WCAG 2.2 Accessibility Diagnostics
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Inspected document markup schemas, interactive form states, scaling controls, and landmarks.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Compliance Score</span>
            <span className={`text-xl font-mono font-bold ${score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400"}`}>
              {score}/100
            </span>
          </div>
          <div className={`w-2.5 h-10 rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500"}`}></div>
        </div>
      </div>

      {/* Grid of checks */}
      <div className="grid sm:grid-cols-2 gap-4">
        {checks.map((c, index) => (
          <div key={index} className="p-4 bg-ink-900/40 rounded-xl border border-ink-800 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              {c.status ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : c.severity === "high" ? (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              
              <div>
                <h4 className="text-xs font-semibold text-slate-200">{c.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  {c.status ? c.passedText : c.failedText}
                </p>
              </div>
            </div>
            
            <div className="pt-2.5 border-t border-ink-800/60 flex items-start gap-1 text-[10px] text-slate-500 leading-normal">
              <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-600 mt-0.5" />
              <span>{c.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Images missing alt list */}
      <div className="p-4 bg-ink-900/40 rounded-xl border border-ink-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-200">Image Alternative Descriptions</h4>
          <span className="text-[10px] font-mono text-slate-500">
            {flags.imagesMissingAltCount} missing / {flags.totalImagesCount} total
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-normal">
          Screen readers read image alternate (alt) descriptions to blind users. Informative images must have alt descriptions, while purely decorative images should have empty alt tags (alt="").
        </p>

        {flags.imagesMissingAltCount > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1.5 pt-2 border-t border-ink-800/60">
            {parsed.images.filter(img => !img.hasAlt || !(img.alt || "").trim()).map((img, idx) => (
              <div key={idx} className="p-2 bg-ink-950/60 rounded-lg text-[10px] font-mono text-slate-400 truncate flex items-center justify-between gap-4">
                <span className="truncate">{img.src}</span>
                <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-semibold shrink-0">Missing Alt</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
