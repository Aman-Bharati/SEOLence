import { useState } from "react";
import { Sparkles, Copy, Check, Code, Heading, Image, Link2, ListChecks, HelpCircle, Tags, FileText, CheckCircle2 } from "lucide-react";
import type { AiFixes } from "../types";

interface AiFixEnginePanelProps {
  aiFixes: AiFixes;
}

export function AiFixEnginePanel({ aiFixes }: AiFixEnginePanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [codeFormat, setCodeFormat] = useState<"html" | "nextjs" | "wordpress">("html");

  if (!aiFixes) {
    return (
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-500 font-medium">No AI suggestions generated. Run a website quality audit first.</p>
      </div>
    );
  }

  // Resilient Clipboard copy handler with execCommand fallback
  const handleCopy = async (text: string, id: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const copyButton = (text: string, id: string, label: string = "Copy Snippet") => {
    const isCopied = copiedId === id;
    return (
      <button
        onClick={() => handleCopy(text, id)}
        aria-label={isCopied ? "Copied code to clipboard" : label}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
          isCopied
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-ink-900 border-ink-700 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400"
        }`}
      >
        {isCopied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>{label}</span>
          </>
        )}
      </button>
    );
  };

  const primaryTitleFix = aiFixes.titles[0]?.text || "";
  const primaryDescFix = aiFixes.descriptions[0]?.text || "";

  const nextJsMetadataCode = `// Next.js App Router layout.tsx or page.tsx export
export const metadata = {
  title: "${primaryTitleFix.replace(/"/g, '\\"')}",
  description: "${primaryDescFix.replace(/"/g, '\\"')}",
};`;

  const wordPressJsonCode = `/* WordPress / Yoast / RankMath API import payload */
{
  "title": "${primaryTitleFix.replace(/"/g, '\\"')}",
  "meta_description": "${primaryDescFix.replace(/"/g, '\\"')}"
}`;

  return (
    <div className="space-y-6">
      {/* Premium Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-purple-950/20 to-ink-850/60 glass border border-ink-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center animate-pulse">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-display font-bold text-slate-50">AI Fix Engine</h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  Ready-to-Deploy
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Context-aware code improvements tailored to your crawled headings, tags, and keywords.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {copyButton(aiFixes.metaTagsCode, "full-head-bundle", "Copy Entire <head> Bundle")}
          </div>
        </div>
      </div>

      {/* Before vs After Comparison Card */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-semibold text-slate-100 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Visual "Before vs. After" Comparison
          </h4>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase">
            +15 PTS Score Gain Potential
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-xl space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase text-rose-400">Current Title (Crawled)</span>
            <p className="text-xs text-slate-300 font-mono italic break-words">
              "{aiFixes.titles[0]?.text ? "Missing or short title tag" : "Default title"}"
            </p>
            <p className="text-[11px] text-slate-500">Short title tags result in snippet truncation and lower keyword weight.</p>
          </div>

          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">AI Recommended Fix</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Ideal (30-60 chars)</span>
            </div>
            <p className="text-xs font-semibold text-slate-100 font-display break-words">
              "{primaryTitleFix}"
            </p>
            <p className="text-[11px] text-slate-400">Maximizes keyword priority at start of title tag for higher search rank.</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Side: Metadata & Outline Suggestions */}
        <div className="md:col-span-2 space-y-6">
          {/* Metadata optimization suggestions */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Meta Tag Optimization
              </h4>

              {/* CMS Format Switcher */}
              <div className="flex bg-ink-950 p-1 rounded-xl border border-ink-800 text-[10px] font-mono">
                <button
                  onClick={() => setCodeFormat("html")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    codeFormat === "html" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  HTML Head
                </button>
                <button
                  onClick={() => setCodeFormat("nextjs")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    codeFormat === "nextjs" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Next.js App
                </button>
                <button
                  onClick={() => setCodeFormat("wordpress")}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    codeFormat === "wordpress" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  WordPress JSON
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Code Export Format Display */}
              {codeFormat !== "html" && (
                <div className="p-3 bg-ink-900 border border-ink-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                      {codeFormat === "nextjs" ? "Next.js App Router Export" : "WordPress / Yoast Field Export"}
                    </span>
                    {copyButton(codeFormat === "nextjs" ? nextJsMetadataCode : wordPressJsonCode, `cms-export-${codeFormat}`)}
                  </div>
                  <pre className="p-2.5 bg-ink-950 rounded-lg text-[10px] font-mono text-cyan-300 overflow-x-auto">
                    {codeFormat === "nextjs" ? nextJsMetadataCode : wordPressJsonCode}
                  </pre>
                </div>
              )}

              {/* Title Options */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Optimized Title Tag Options</p>
                <div className="space-y-3">
                  {aiFixes.titles.map((title, idx) => (
                    <div key={idx} className="p-3.5 bg-ink-900/40 border border-ink-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[10px] font-semibold font-mono text-cyan-400">{title.option}</span>
                        {copyButton(`<title>${title.text}</title>`, `title-${idx}`)}
                      </div>
                      <p className="text-sm font-semibold text-slate-100 break-words font-display">{title.text}</p>
                      <p className="text-[11px] text-slate-500 leading-normal">{title.impact}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Options */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Optimized Meta Description Options</p>
                <div className="space-y-3">
                  {aiFixes.descriptions.map((desc, idx) => (
                    <div key={idx} className="p-3.5 bg-ink-900/40 border border-ink-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[10px] font-semibold font-mono text-purple-400">{desc.option}</span>
                        {copyButton(`<meta name="description" content="${desc.text}" />`, `desc-${idx}`)}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">{desc.text}</p>
                      <p className="text-[11px] text-slate-500 leading-normal">{desc.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Heading improvements */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
                <Heading className="w-4 h-4 text-cyan-400" />
                Optimized Heading Structure
              </h4>
              {copyButton(aiFixes.headingOutline, "heading-outline")}
            </div>
            <p className="text-xs text-slate-400">
              A logical header hierarchy (H1 to H2 to H3) containing your primary semantic keywords.
            </p>
            <pre className="p-4 bg-ink-900 border border-ink-800 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              {aiFixes.headingOutline}
            </pre>
          </div>

          {/* Image Alt tags optimization */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <Image className="w-4 h-4 text-cyan-400" />
              Missing Image Alt Tag Fixes
            </h4>
            <p className="text-xs text-slate-400">
              Derived from local image filenames to fix accessibility gaps and index images accurately.
            </p>

            {aiFixes.imageAltFixes.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium bg-ink-900/30 p-4 rounded-xl border border-ink-850 text-center">
                All images have alternative text tags configured! No improvements needed.
              </p>
            ) : (
              <div className="space-y-3">
                {aiFixes.imageAltFixes.map((img, idx) => (
                  <div key={idx} className="p-3.5 bg-ink-900/40 border border-ink-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-xs sm:max-w-md">File: {img.src.split("/").pop()}</span>
                      {copyButton(img.code, `img-${idx}`)}
                    </div>
                    <div className="flex items-center gap-3 bg-ink-950 p-2.5 rounded-lg border border-ink-900/40">
                      <div className="text-[11px] text-slate-400 shrink-0 font-medium">Suggested Alt:</div>
                      <div className="text-[11px] text-emerald-400 font-semibold italic">"{img.suggestedAlt}"</div>
                    </div>
                    <pre className="p-2 bg-ink-950/80 rounded border border-ink-900/20 font-mono text-[10px] text-slate-500 overflow-x-auto truncate">
                      {img.code}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Schemas, linking & Entities */}
        <div className="space-y-6">
          {/* Schema JSON-LD Markup */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Structured Schema
              </h4>
              {copyButton(aiFixes.schemaJsonLd, "schema-jsonld")}
            </div>
            <p className="text-xs text-slate-400">
              JSON-LD WebSite & Org metadata. Copy and paste inside a <code className="font-mono text-cyan-400 text-[11px]">&lt;script&gt;</code> block in the head.
            </p>
            <pre className="p-3 bg-ink-900 border border-ink-800 rounded-xl font-mono text-[10px] text-slate-400 overflow-y-auto max-h-64 scrollbar-thin">
              {aiFixes.schemaJsonLd}
            </pre>
          </div>

          {/* FAQ Generator block */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                FAQ Schema & HTML
              </h4>
              {copyButton(aiFixes.faqSchema, "faq-schema")}
            </div>
            <p className="text-xs text-slate-400">
              JSON-LD FAQPage Schema tags matching page outline keywords.
            </p>
            <pre className="p-3 bg-ink-900 border border-ink-800 rounded-xl font-mono text-[10px] text-slate-400 overflow-y-auto max-h-48 scrollbar-thin">
              {aiFixes.faqSchema}
            </pre>
          </div>

          {/* Internal link anchor ideas */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-cyan-400" />
              Internal Link Anchor Ideas
            </h4>
            <p className="text-xs text-slate-400">
              Recommended text anchors for linking inside content paths.
            </p>
            <div className="space-y-2">
              {aiFixes.internalLinkAnchors.map((link, idx) => (
                <div key={idx} className="p-3 bg-ink-900/40 border border-ink-800 rounded-xl space-y-1">
                  <p className="text-[10px] font-mono text-slate-500">Destination: {link.pageUrl}</p>
                  <p className="text-xs font-semibold text-cyan-400">Anchor: "{link.anchorText}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Entity suggestions */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <Tags className="w-4 h-4 text-cyan-400" />
              Target Semantic Entities
            </h4>
            <p className="text-xs text-slate-400">
              Core entities to cover in your text content to improve topical relevance.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {aiFixes.entities.map((entity, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-ink-900 border border-ink-800 text-slate-300 font-mono"
                >
                  {entity}
                </span>
              ))}
            </div>
          </div>

          {/* Content Improvements Checklist */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
            <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-cyan-400" />
              Content Enhancements
            </h4>
            <div className="space-y-3">
              {aiFixes.contentSuggestions.map((sug, idx) => (
                <div key={idx} className="flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-normal">{sug}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
