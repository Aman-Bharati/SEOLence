import { useState } from "react";
import { ArrowLeft, Globe, Sparkles, Share2, ListChecks } from "lucide-react";
import type { WebsiteAudit } from "../types";
import { ScoreGauge } from "./ScoreGauge";
import { SerpPreview } from "./SerpPreview";
import { MetaGenerator } from "./MetaGenerator";
import { MetaDetails } from "./MetaDetails";
import { WordFrequencyTable } from "./WordFrequencyTable";
import { PhraseAnalysis } from "./PhraseAnalysis";
import { KeywordRecommendations } from "./KeywordRecommendations";
import { StructurePanel } from "./StructurePanel";
import { ExtractedTextPanel } from "./ExtractedTextPanel";
import { ActionPlan } from "./ActionPlan";
import { TechnicalSeoPanel } from "./TechnicalSeoPanel";
import { runTechnicalSeoChecks, analyzePage } from "../lib/analyzer";
import { AiFixEnginePanel } from "./AiFixEnginePanel";
import { generateAiFixes } from "../lib/aiFixEngine";
import { SecurityDetailsPanel } from "./SecurityDetailsPanel";
import { ExportModal } from "./ExportModal";
import { AccessibilityDetailsPanel } from "./AccessibilityDetailsPanel";

interface AuditDetailsReportProps {
  audit: WebsiteAudit;
  onBack: () => void;
  isPublicShare?: boolean;
  onStartOwnAudit?: () => void;
}

export function AuditDetailsReport({ audit, onBack, isPublicShare = false, onStartOwnAudit }: AuditDetailsReportProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "seo" | "accessibility" | "security" | "content" | "structure" | "performance" | "technical_seo" | "ai_fixes">("overview");

  const [showExportModal, setShowExportModal] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const {
    url,
    overall_score,
    seo_score,
    accessibility_score,
    security_score,
    content_score,
    performance_score,
    audit_data,
    insights,
    created_at,
  } = audit;

  const {
    parsed: rawParsed,
    wordFrequency = {},
    topKeywords = [],
    bigrams = [],
    trigrams = [],
    securityHeaders = {
      hasCsp: false,
      hasHsts: false,
      hasXFrame: false,
      hasXContentType: false,
      cspHeader: null,
      hstsHeader: null,
      xFrameHeader: null,
      xContentTypeHeader: null,
    },
  } = audit_data || {};

  const raw = (rawParsed || {}) as any;

  const headingsArray = Array.isArray(raw?.headings)
    ? raw.headings
    : (raw?.headings?.list || []);

  const imagesArray = Array.isArray(raw?.images)
    ? raw.images
    : (raw?.images?.list || []);

  const linksObj = (raw?.links && !Array.isArray(raw.links) && "counts" in raw.links)
    ? raw.links.counts
    : (raw?.links || { internal: 0, external: 0, total: 0 });

  const parsed = {
    ...rawParsed,
    title: raw?.title || raw?.metadata?.title || "Untitled Website",
    metaDescription: raw?.metaDescription || raw?.metadata?.description || "",
    metaKeywords: raw?.metaKeywords || raw?.metadata?.keywords || "",
    canonical: raw?.canonical || raw?.metadata?.canonical || "",
    ogTags: raw?.ogTags || raw?.metadata?.og || {},
    twitterTags: raw?.twitterTags || raw?.metadata?.twitter || {},
    robots: raw?.robots || raw?.metadata?.robots || "",
    viewport: raw?.viewport || raw?.metadata?.viewport || "",
    charset: raw?.charset || raw?.metadata?.charset || "",
    lang: raw?.lang || raw?.metadata?.lang || "",
    headings: headingsArray.map((h: any) => ({
      level: typeof h?.level === "number" ? h.level : 1,
      text: h?.text || "",
    })),
    paragraphs: Array.isArray(raw?.paragraphs)
      ? raw.paragraphs
      : (raw?.paragraphs?.list || []),
    images: imagesArray.map((img: any) => ({
      src: img?.src || "",
      alt: img?.alt || "",
      hasAlt: typeof img?.hasAlt === "boolean" ? img.hasAlt : !!img?.alt,
    })),
    links: {
      internal: linksObj?.internal || 0,
      external: linksObj?.external || 0,
      total: linksObj?.total || 0,
      list: raw?.links?.list || [],
    },
    bodyText: raw?.bodyText || raw?.paragraphs?.bodyText || "",
    wordCount: typeof raw?.wordCount === "number" ? raw.wordCount : (raw?.paragraphs?.wordCount || 0),
    performance: raw?.performance || {},
    securityHeaders: raw?.securityHeaders || raw?.security || {},
    schemaMarkup: raw?.schemaMarkup || [],
    rawHtmlLength: typeof raw?.rawHtmlLength === "number" ? raw.rawHtmlLength : 0,
    performanceDetails: raw?.performanceDetails || raw?.performance || null,
    isClientRendered: !!raw?.isClientRendered,
    renderNote: raw?.renderNote || null,
    responseTimeMs: typeof raw?.responseTimeMs === "number" ? raw.responseTimeMs : null,
    loadTimeMs: typeof raw?.loadTimeMs === "number" ? raw.loadTimeMs : null,
  };

  // If historical crawl is missing word frequency details, compute them on the fly from the parsed baseline content
  let activeWordFrequency = wordFrequency;
  let activeTopKeywords = topKeywords;
  let activeBigrams = bigrams;
  let activeTrigrams = trigrams;

  const visibleText = parsed.visibleText || (parsed.paragraphs || []).join(" ") || parsed.bodyText || "";

  if ((!activeTopKeywords || activeTopKeywords.length === 0) && visibleText.trim().length > 0) {
    try {
      const liveAnalysis = analyzePage({
        ...parsed,
        visibleText,
      });
      const freqObj: Record<string, number> = {};
      for (const [word, count] of liveAnalysis.wordFrequency) {
        freqObj[word] = count;
      }
      activeWordFrequency = freqObj;
      activeTopKeywords = liveAnalysis.topKeywords;
      activeBigrams = liveAnalysis.bigrams;
      activeTrigrams = liveAnalysis.trigrams;
    } catch (e) {
      console.error("Failed to analyze parsed baseline content on the fly", e);
    }
  }

  // Reconstruct an AnalysisResult shape for backward compatible components
  const legacyResult = {
    parsed,
    wordFrequency: new Map(Object.entries(activeWordFrequency || {})),
    topKeywords: activeTopKeywords,
    stopWordCount: 0,
    bigrams: activeBigrams,
    trigrams: activeTrigrams,
    readabilityScore: parsed.wordCount > 0 ? content_score : 0, // content score mimics readability/quality index
    readabilityLabel: "",
    seoScore: seo_score,
    keywordDensity: activeTopKeywords,
    overusedWords: (activeTopKeywords || []).filter((k) => k.density > 4 && k.count > 5),
    underusedKeywords: [],
    recommendedKeywords: [],
    metaSuggestions: {
      suggestedTitle: parsed.title || "",
      suggestedDescription: parsed.metaDescription || "",
      titleReason: "",
      descriptionReason: "",
    },
    insights: [
      ...(insights?.strengths || []).map(i => ({ ...i, type: "strength" as const })),
      ...(insights?.weaknesses || []).map(i => ({ ...i, type: "weakness" as const })),
      ...(insights?.recommendations || []).map(i => ({ ...i, type: "recommendation" as const })),
    ],
    actionPlan: [] as any[],
    gradeCard: { overallGrade: "", entries: [] } as any,
    verificationChecks: [] as any[],
    confidence: { score: 100, label: "High", factors: [] } as any,
    contentQuality: {
      totalWords: parsed.wordCount,
      uniqueWords: parsed.wordCount > 0 ? Math.round(parsed.wordCount * 0.45) : 0, // estimate unique words if not direct
      lexicalDiversity: 45,
      avgWordsPerSentence: 15,
      sentenceCount: 10,
      longWords: 5,
    },
  };


  const techSeoChecks = runTechnicalSeoChecks(parsed);
  const techSeoChecksList = Object.values(techSeoChecks);
  const techSeoPassed = techSeoChecksList.filter((c: any) => c.passed).length;
  const techSeoTotal = techSeoChecksList.length;
  const techSeoScore = techSeoTotal > 0 ? Math.round((techSeoPassed / techSeoTotal) * 100) : 100;

  const subScores = [
    { id: "seo", label: "SEO Engine", score: `${seo_score}%`, color: "text-cyan-400" },
    { id: "technical_seo", label: "Technical SEO", score: `${techSeoScore}%`, color: "text-rose-400" },
    { id: "accessibility", label: "Accessibility", score: `${accessibility_score}%`, color: "text-indigo-400" },
    { id: "security", label: "Security Headers", score: `${security_score}%`, color: "text-emerald-400" },
    { id: "content", label: "Content Index", score: `${content_score}%`, color: "text-amber-400" },
    { id: "performance", label: "Performance", score: performance_score !== null ? `${performance_score}%` : "N/A", color: "text-purple-400" },
    { id: "ai_fixes", label: "AI Fix Engine", score: "🤖 AI Fixes", color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Interactive Screen View (Hidden during PDF print) */}
      <div className="print:hidden space-y-6">
        {/* Lead Generation Viral CTA Banner for Public Share Views */}
        {isPublicShare && (
          <div className="bg-gradient-to-r from-cyan-950/70 via-emerald-950/60 to-ink-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-slate-50 text-sm sm:text-base">Shared Audit Report</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    READ-ONLY VIEW
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Report generated via SentinelQA. Want to audit your own website or export custom white-label reports?
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onStartOwnAudit) onStartOwnAudit();
                else onBack();
              }}
              className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-emerald-400 text-ink-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Audit Your Site Free</span>
              <span className="text-sm">↗</span>
            </button>
          </div>
        )}

        {/* Back & Breadcrumb */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors back-button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Websites</span>
          </button>

          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500 font-mono">
              Audited at {new Date(created_at).toLocaleString()}
            </p>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 bg-ink-850 hover:bg-cyan-500/10 border border-ink-700/60 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all active:scale-95 duration-200"
            >
              <Share2 className="w-3.5 h-3.5" />
              Export Report
            </button>
          </div>
        </div>

        {/* Main Score Card Header */}
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8 shadow-xl">
          <ScoreGauge score={overall_score} label="Overall Score" sublabel="Web Quality Rating" size="lg" />
          <div className="flex-1 w-full min-w-0">
            <h2 className="text-xl md:text-2xl font-display font-bold text-slate-50 truncate">
              {parsed.title || "Untitled Website"}
            </h2>
            <p className="text-sm font-mono text-slate-500 truncate mt-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-500 shrink-0" />
              {url}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-ink-900/35 border border-ink-800/40 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-slate-100">{parsed.wordCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">Word Count</p>
              </div>
              <div className="bg-ink-900/35 border border-ink-800/40 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-slate-100">{parsed.links.total}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">Links</p>
              </div>
              <div className="bg-ink-900/35 border border-ink-800/40 rounded-xl p-3 text-center">
                <p className="text-xl font-display font-bold text-slate-100">{parsed.images.length}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">Images</p>
              </div>
              <div className="bg-ink-900/35 border border-ink-800/40 rounded-xl p-3 text-center">
                <p className={`text-xl font-display font-bold ${securityHeaders.hasCsp ? "text-emerald-400" : "text-amber-400"}`}>
                  {securityHeaders.hasCsp ? "Secure" : "Warning"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">Security</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-scores Grid Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={`p-4 rounded-xl border text-center transition-all ${activeTab === "overview"
                ? "bg-ink-850/80 border-cyan-500/40 text-slate-100 shadow-md"
                : "bg-ink-950/40 border-ink-800/40 text-slate-400 hover:text-slate-200"
              }`}
          >
            <p className="text-sm font-semibold">Workspace Overview</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">{overall_score}%</p>
          </button>
          {subScores.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveTab(sub.id as any)}
              className={`p-4 rounded-xl border text-center transition-all ${activeTab === sub.id
                  ? "bg-ink-850/80 border-cyan-500/40 text-slate-100 shadow-md"
                  : "bg-ink-950/40 border-ink-800/40 text-slate-400 hover:text-slate-200"
                }`}
            >
              <p className="text-sm font-semibold">{sub.label}</p>
              <p className={`text-sm font-display font-bold mt-1 ${sub.color}`}>{sub.score}</p>
            </button>
          ))}
        </div>

        {/* Inner Report Views */}
        <div className="space-y-6">
          {activeTab === "overview" && (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {/* Action Plan */}
                <ActionPlan result={legacyResult as any} />

                {/* Scoring Engine Breakdown */}
                <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-slate-100 text-base flex items-center gap-2">
                      <ListChecks className="w-4.5 h-4.5 text-cyan-400" />
                      Engine Grading Breakdown
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Transparent points checklist evaluated for each audit category module.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead>
                        <tr className="border-b border-ink-800 text-[10px] text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5">Category</th>
                          <th className="py-2.5">Check / Rule</th>
                          <th className="py-2.5 text-center">Points</th>
                          <th className="py-2.5">Diagnostic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-850/60">
                        {(audit.audit_data.breakdown || [
                          {
                            category: "SEO",
                            check: "Title Tag Presence",
                            score: parsed.title ? 8 : 0,
                            maxScore: 8,
                            status: parsed.title ? "passed" : "failed",
                            impact: parsed.title ? "Page title is configured." : "Title tag is missing.",
                          },
                          {
                            category: "SEO",
                            check: "Meta Description Presence",
                            score: parsed.metaDescription ? 8 : 0,
                            maxScore: 8,
                            status: parsed.metaDescription ? "passed" : "failed",
                            impact: parsed.metaDescription ? "Meta description is defined." : "Meta description tag is missing.",
                          },
                          {
                            category: "Accessibility",
                            check: "HTML Lang Declared",
                            score: parsed.accessibilityFlags?.hasLang ? 25 : 0,
                            maxScore: 25,
                            status: parsed.accessibilityFlags?.hasLang ? "passed" : "failed",
                            impact: parsed.accessibilityFlags?.hasLang ? "Language code is set." : "Missing lang attribute on <html> element.",
                          },
                          {
                            category: "Security",
                            check: "Content Security Policy (CSP)",
                            score: parsed.securityHeaders?.hasCsp ? 25 : 0,
                            maxScore: 25,
                            status: parsed.securityHeaders?.hasCsp ? "passed" : "failed",
                            impact: parsed.securityHeaders?.hasCsp ? "CSP rules defined in headers." : "Missing CSP header.",
                          },
                          {
                            category: "Security",
                            check: "Strict-Transport-Security (HSTS)",
                            score: parsed.securityHeaders?.hasHsts ? 25 : 0,
                            maxScore: 25,
                            status: parsed.securityHeaders?.hasHsts ? "passed" : "failed",
                            impact: parsed.securityHeaders?.hasHsts ? "HSTS force-https rule defined." : "Missing HSTS header.",
                          }
                        ]).map((item: any, idx: number) => {
                          const isExpanded = expandedRow === idx;
                          return (
                            <>
                              <tr
                                key={`row-${idx}`}
                                onClick={() => setExpandedRow(isExpanded ? null : idx)}
                                className="hover:bg-ink-900/40 cursor-pointer transition-all border-b border-ink-900/50"
                              >
                                <td className="py-3 font-medium text-slate-400">{item.category}</td>
                                <td className="py-3 text-slate-200 font-semibold">{item.check}</td>
                                <td className="py-3 text-center font-mono font-bold">
                                  <span className={item.status === "passed" ? "text-emerald-400" : item.status === "failed" ? "text-rose-400" : "text-amber-400"}>
                                    {item.score}/{item.maxScore}
                                  </span>
                                </td>
                                <td className="py-3 text-slate-400 truncate max-w-[180px]" title={item.impact}>{item.impact}</td>
                              </tr>
                              {isExpanded && (
                                <tr key={`expand-${idx}`} className="bg-ink-900/20">
                                  <td colSpan={4} className="p-4 border-b border-ink-800">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300">
                                      <div className="space-y-1.5 p-3 bg-ink-950/40 rounded-xl border border-ink-900/80">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Measured Value</p>
                                        <p className="font-mono text-slate-100 font-semibold">{item.measuredValue || "N/A"}</p>
                                      </div>
                                      <div className="space-y-1.5 p-3 bg-ink-950/40 rounded-xl border border-ink-900/80">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Calculation / Weight Formula</p>
                                        <p className="text-slate-100 font-medium">{item.formula || `${item.maxScore} maximum points`}</p>
                                      </div>
                                      <div className="space-y-1.5 p-3 bg-ink-950/40 rounded-xl border border-ink-900/80 sm:col-span-2">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Diagnostic Reason</p>
                                        <p className="text-slate-200">{item.impact}</p>
                                      </div>
                                      <div className="space-y-1.5 p-3 bg-ink-950/40 rounded-xl border border-ink-900/80">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Improvement Opportunity</p>
                                        <p className="text-cyan-400 font-medium">{item.opportunity || "No fixes required."}</p>
                                      </div>
                                      <div className="space-y-1.5 p-3 bg-ink-950/40 rounded-xl border border-ink-900/80">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Expected Impact</p>
                                        <p className="text-emerald-400 font-semibold">{item.expectedImpact || `+${item.maxScore} score increase`}</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Score insights panels list */}
                <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
                  <h3 className="font-display font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Website Health Audit
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-ink-900/30 rounded-xl border border-ink-800/50">
                      <span className="text-xs text-slate-400 font-medium">SEO Index</span>
                      <span className={`text-xs font-mono font-bold ${seo_score >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{seo_score}/100</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-ink-900/30 rounded-xl border border-ink-800/50">
                      <span className="text-xs text-slate-400 font-medium">Accessibility Audit</span>
                      <span className={`text-xs font-mono font-bold ${accessibility_score >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{accessibility_score}/100</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-ink-900/30 rounded-xl border border-ink-800/50">
                      <span className="text-xs text-slate-400 font-medium">Security Audit</span>
                      <span className={`text-xs font-mono font-bold ${security_score >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{security_score}/100</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-ink-900/30 rounded-xl border border-ink-800/50">
                      <span className="text-xs text-slate-400 font-medium">Content Index</span>
                      <span className={`text-xs font-mono font-bold ${content_score >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{content_score}/100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "seo" && (
            <div className="space-y-6">
              {/* SERP preview & suggestions */}
              <SerpPreview result={legacyResult as any} />
              <MetaGenerator result={legacyResult as any} />
              <MetaDetails result={legacyResult as any} />
              <KeywordRecommendations result={legacyResult as any} />
              <StructurePanel result={legacyResult as any} />
            </div>
          )}

          {activeTab === "accessibility" && (
            <AccessibilityDetailsPanel parsed={parsed} />
          )}

          {activeTab === "security" && (
            <SecurityDetailsPanel parsed={parsed} />
          )}

          {activeTab === "content" && (
            <div className="space-y-6">
              {/* Word frequency and density analysis */}
              <WordFrequencyTable rawFrequency={legacyResult.wordFrequency} totalWords={parsed.wordCount} />
              <PhraseAnalysis bigrams={activeBigrams} trigrams={activeTrigrams} />
              <ExtractedTextPanel result={legacyResult as any} />
            </div>
          )}

          {activeTab === "structure" && (
            <div className="space-y-6">
              <StructurePanel result={legacyResult as any} />
            </div>
          )}

          {activeTab === "performance" && (
            <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-display font-semibold text-slate-100 text-lg">Measured Performance Audit</h3>
                <p className="text-xs text-slate-500 mt-1">Analyzed actual network response timings and resource payloads collected during crawling.</p>
              </div>

              {parsed.performanceDetails ? (
                <div className="p-5 bg-ink-900/40 border border-ink-800 rounded-xl space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">Google Lighthouse Core Web Vitals</h4>
                    <p className="text-[11px] text-slate-400 mt-1">Real synthetic performance metrics measured using PageSpeed Insights API.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {/* LCP */}
                    <div className="p-3 bg-ink-950/60 rounded-xl border border-ink-800/80 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase font-mono block">LCP</span>
                        <span className="text-sm font-bold text-slate-200 mt-1 block">
                          {parsed.performanceDetails.lcp !== null ? `${(parsed.performanceDetails.lcp / 1000).toFixed(2)}s` : "N/A"}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold text-center border ${parsed.performanceDetails.lcp === null ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                          parsed.performanceDetails.lcp < 2500 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            parsed.performanceDetails.lcp < 4000 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                        {parsed.performanceDetails.lcp === null ? "Unknown" :
                          parsed.performanceDetails.lcp < 2500 ? "Good" :
                            parsed.performanceDetails.lcp < 4000 ? "Needs Imp." : "Poor"}
                      </span>
                    </div>

                    {/* CLS */}
                    <div className="p-3 bg-ink-950/60 rounded-xl border border-ink-800/80 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase font-mono block">CLS</span>
                        <span className="text-sm font-bold text-slate-200 mt-1 block">
                          {parsed.performanceDetails.cls !== null ? parsed.performanceDetails.cls.toFixed(3) : "N/A"}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold text-center border ${parsed.performanceDetails.cls === null ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                          parsed.performanceDetails.cls < 0.1 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            parsed.performanceDetails.cls < 0.25 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                        {parsed.performanceDetails.cls === null ? "Unknown" :
                          parsed.performanceDetails.cls < 0.1 ? "Good" :
                            parsed.performanceDetails.cls < 0.25 ? "Needs Imp." : "Poor"}
                      </span>
                    </div>

                    {/* FCP */}
                    <div className="p-3 bg-ink-950/60 rounded-xl border border-ink-800/80 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase font-mono block">FCP</span>
                        <span className="text-sm font-bold text-slate-200 mt-1 block">
                          {parsed.performanceDetails.fcp !== null ? `${(parsed.performanceDetails.fcp / 1000).toFixed(2)}s` : "N/A"}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold text-center border ${parsed.performanceDetails.fcp === null ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                          parsed.performanceDetails.fcp < 1800 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            parsed.performanceDetails.fcp < 3000 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                        {parsed.performanceDetails.fcp === null ? "Unknown" :
                          parsed.performanceDetails.fcp < 1800 ? "Good" :
                            parsed.performanceDetails.fcp < 3000 ? "Needs Imp." : "Poor"}
                      </span>
                    </div>

                    {/* TBT */}
                    <div className="p-3 bg-ink-950/60 rounded-xl border border-ink-800/80 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase font-mono block">TBT</span>
                        <span className="text-sm font-bold text-slate-200 mt-1 block">
                          {parsed.performanceDetails.tbt !== null ? `${Math.round(parsed.performanceDetails.tbt)}ms` : "N/A"}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold text-center border ${parsed.performanceDetails.tbt === null ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                          parsed.performanceDetails.tbt < 200 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            parsed.performanceDetails.tbt < 600 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                        {parsed.performanceDetails.tbt === null ? "Unknown" :
                          parsed.performanceDetails.tbt < 200 ? "Good" :
                            parsed.performanceDetails.tbt < 600 ? "Needs Imp." : "Poor"}
                      </span>
                    </div>

                    {/* Speed Index */}
                    <div className="p-3 bg-ink-950/60 rounded-xl border border-ink-800/80 flex flex-col justify-between space-y-2">
                      <div>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase font-mono block">Speed Index</span>
                        <span className="text-sm font-bold text-slate-200 mt-1 block">
                          {parsed.performanceDetails.speedIndex !== null ? `${(parsed.performanceDetails.speedIndex / 1000).toFixed(2)}s` : "N/A"}
                        </span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold text-center border ${parsed.performanceDetails.speedIndex === null ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                          parsed.performanceDetails.speedIndex < 3400 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            parsed.performanceDetails.speedIndex < 5800 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                        {parsed.performanceDetails.speedIndex === null ? "Unknown" :
                          parsed.performanceDetails.speedIndex < 3400 ? "Good" :
                            parsed.performanceDetails.speedIndex < 5800 ? "Needs Imp." : "Poor"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-ink-900/40 border border-ink-800 rounded-xl text-center py-8">
                  <p className="text-slate-400 text-sm font-medium">Google Lighthouse Core Web Vitals are currently unavailable.</p>
                  <p className="text-slate-500 text-xs mt-1">This report was generated using fallback measurements.</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-ink-900/40 rounded-xl border border-ink-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Time to First Byte (TTFB)</h4>
                    <p className="text-2xl font-bold text-slate-100 mt-2">
                      {parsed.responseTimeMs ? `${parsed.responseTimeMs} ms` : "N/A"}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-ink-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">Server Latency</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${!parsed.responseTimeMs ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                        parsed.responseTimeMs < 250 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          parsed.responseTimeMs < 500 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                      {!parsed.responseTimeMs ? "Unknown" :
                        parsed.responseTimeMs < 250 ? "Fast (<250ms)" :
                          parsed.responseTimeMs < 500 ? "Average" : "Slow (>500ms)"}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-ink-900/40 rounded-xl border border-ink-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Total Page Load Time</h4>
                    <p className="text-2xl font-bold text-slate-100 mt-2">
                      {parsed.loadTimeMs ? `${(parsed.loadTimeMs / 1000).toFixed(2)} s` : "N/A"}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-ink-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">HTML Fetch Speed</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${!parsed.loadTimeMs ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                        parsed.loadTimeMs < 800 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          parsed.loadTimeMs < 1500 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                      {!parsed.loadTimeMs ? "Unknown" :
                        parsed.loadTimeMs < 800 ? "Fast (<0.8s)" :
                          parsed.loadTimeMs < 1500 ? "Average" : "Slow (>1.5s)"}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-ink-900/40 rounded-xl border border-ink-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Page Payload Weight</h4>
                    <p className="text-2xl font-bold text-slate-100 mt-2">
                      {(parsed.rawHtmlLength / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-ink-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium">HTML File Size</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${parsed.rawHtmlLength < 100000 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        parsed.rawHtmlLength < 250000 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                      {parsed.rawHtmlLength < 100000 ? "Optimal" :
                        parsed.rawHtmlLength < 250000 ? "Heavy" : "Overweight"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Factors List */}
              <div className="p-4 bg-ink-900/40 rounded-xl border border-ink-800 space-y-4">
                <h4 className="text-sm font-semibold text-slate-200">Performance Considerations</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-ink-950 rounded-lg text-xs">
                    <span className="text-slate-400">Rendering Mode</span>
                    <span className="font-semibold text-slate-200">
                      {parsed.isClientRendered ? "Client-Side Rendered (SPA)" : "Server-Side Rendered (Static)"}
                    </span>
                  </div>
                  {parsed.renderNote && (
                    <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-xs leading-relaxed text-cyan-300">
                      <strong>Crawler Note:</strong> {parsed.renderNote}
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-ink-950 rounded-lg text-xs">
                    <span className="text-slate-400">Total Static Images Loaded</span>
                    <span className="font-mono font-semibold text-slate-200">{parsed.images.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-ink-950 rounded-lg text-xs">
                    <span className="text-slate-400">Page Content Paragraphs</span>
                    <span className="font-mono font-semibold text-slate-200">{parsed.paragraphs.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "technical_seo" && (
            <TechnicalSeoPanel checks={techSeoChecks as any} />
          )}

          {activeTab === "ai_fixes" && (
            <AiFixEnginePanel aiFixes={generateAiFixes(parsed, legacyResult) as any} />
          )}
        </div>
      </div>

      {/* Printable PDF Comprehensive Audit Report (Visible ONLY when printing to PDF / window.print()) */}
      <div className="hidden print:block space-y-8 text-slate-900">
        {/* Printable White-Label Header */}
        <div className="border-b-2 border-slate-300 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {localStorage.getItem("white_label_agency_name") || "SEO Lens — Web Quality & Audit Report"}
            </h1>
            <p className="text-xs text-slate-600 mt-1">Audit Report Prepared For: <span className="font-mono font-semibold text-slate-900">{url}</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5">Audited on {new Date(created_at).toLocaleString()}</p>
          </div>
          {localStorage.getItem("white_label_agency_logo") && (
            <img src={localStorage.getItem("white_label_agency_logo")!} alt="Agency Logo" className="h-12 object-contain" />
          )}
        </div>

        {/* Section 1: Executive Audit Score & Metric Highlights */}
        <section className="print-page-break-avoid bg-white border border-slate-300 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-200">
            1. Executive Audit Overview
          </h2>
          <div className="flex items-center gap-8 mb-6">
            <ScoreGauge score={overall_score} label="Overall Score" sublabel="Web Quality Rating" size="lg" />
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="p-3 border border-slate-200 rounded-lg text-center bg-slate-50">
                <p className="text-lg font-bold text-slate-900">{parsed.wordCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-600 uppercase font-semibold">Total Words</p>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg text-center bg-slate-50">
                <p className="text-lg font-bold text-slate-900">{parsed.links.total}</p>
                <p className="text-[10px] text-slate-600 uppercase font-semibold">Total Links</p>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg text-center bg-slate-50">
                <p className="text-lg font-bold text-slate-900">{parsed.images.length}</p>
                <p className="text-[10px] text-slate-600 uppercase font-semibold">Total Images</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {subScores.map((sub) => (
              <div key={`print-sub-${sub.id}`} className="p-2.5 border border-slate-200 rounded-lg text-center bg-slate-50">
                <p className="text-[11px] font-semibold text-slate-700">{sub.label}</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{sub.score}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Executive Action Plan */}
        <section className="print-page-break-avoid">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">2. Priority Executive Action Plan</h2>
          <ActionPlan result={legacyResult as any} />
        </section>

        {/* Section 3: Diagnostic Grading Breakdown Checklist */}
        <section className="print-page-break-avoid bg-white border border-slate-300 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">3. Engine Grading Checklist</h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                <th className="p-2">Category</th>
                <th className="p-2">Check / Rule</th>
                <th className="p-2 text-center">Score</th>
                <th className="p-2">Diagnostic Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {(audit.audit_data.breakdown || [
                { category: "SEO", check: "Title Tag Presence", score: parsed.title ? 8 : 0, maxScore: 8, impact: parsed.title ? "Page title is configured." : "Title tag is missing." },
                { category: "SEO", check: "Meta Description Presence", score: parsed.metaDescription ? 8 : 0, maxScore: 8, impact: parsed.metaDescription ? "Meta description defined." : "Meta description missing." },
                { category: "Accessibility", check: "HTML Lang Declared", score: parsed.accessibilityFlags?.hasLang ? 25 : 0, maxScore: 25, impact: parsed.accessibilityFlags?.hasLang ? "Language set." : "Missing lang attribute." },
                { category: "Security", check: "Content Security Policy (CSP)", score: parsed.securityHeaders?.hasCsp ? 25 : 0, maxScore: 25, impact: parsed.securityHeaders?.hasCsp ? "CSP rules defined." : "Missing CSP header." }
              ]).map((item: any, idx: number) => (
                <tr key={`print-row-${idx}`}>
                  <td className="p-2 font-medium text-slate-600">{item.category}</td>
                  <td className="p-2 font-semibold text-slate-900">{item.check}</td>
                  <td className="p-2 text-center font-mono font-bold">{item.score}/{item.maxScore}</td>
                  <td className="p-2 text-slate-700">{item.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Section 4: SEO & Meta Tag Optimization */}
        <section className="print-page-break-avoid space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">4. SEO & Meta Tag Optimization</h2>
          <SerpPreview result={legacyResult as any} />
          <MetaGenerator result={legacyResult as any} />
          <MetaDetails result={legacyResult as any} />
          <KeywordRecommendations result={legacyResult as any} />
          <StructurePanel result={legacyResult as any} />
        </section>

        {/* Section 5: Technical SEO Audit */}
        <section className="print-page-break-avoid space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">5. Technical SEO Audit</h2>
          <TechnicalSeoPanel checks={techSeoChecks as any} />
        </section>

        {/* Section 6: Accessibility Audit */}
        <section className="print-page-break-avoid space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">6. Accessibility Audit</h2>
          <AccessibilityDetailsPanel parsed={parsed} />
        </section>

        {/* Section 7: Security Headers Audit */}
        <section className="print-page-break-avoid space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">7. Security Headers Audit</h2>
          <SecurityDetailsPanel parsed={parsed} />
        </section>

        {/* Section 8: Content & Keyword Analysis */}
        <section className="print-page-break-avoid space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">8. Content & Keyword Analysis</h2>
          <WordFrequencyTable rawFrequency={legacyResult.wordFrequency} totalWords={parsed.wordCount} />
          <PhraseAnalysis bigrams={activeBigrams} trigrams={activeTrigrams} />
        </section>

        {/* Section 9: Measured Performance & Core Web Vitals */}
        <section className="print-page-break-avoid bg-white border border-slate-300 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">9. Measured Performance & Core Web Vitals</h2>
          <div className="grid grid-cols-3 gap-4 text-slate-900">
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              <span className="text-[10px] text-slate-600 uppercase font-bold block">TTFB (Server Latency)</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">{parsed.responseTimeMs ? `${parsed.responseTimeMs} ms` : "N/A"}</span>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              <span className="text-[10px] text-slate-600 uppercase font-bold block">Page Load Speed</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">{parsed.loadTimeMs ? `${(parsed.loadTimeMs / 1000).toFixed(2)} s` : "N/A"}</span>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
              <span className="text-[10px] text-slate-600 uppercase font-bold block">HTML File Payload</span>
              <span className="text-lg font-bold text-slate-900 mt-1 block">{(parsed.rawHtmlLength / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </section>

        {/* Section 10: AI Fix Engine Recommendations */}
        <section className="print-page-break-avoid space-y-4">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">10. AI-Powered Fix Recommendations</h2>
          <AiFixEnginePanel aiFixes={generateAiFixes(parsed, legacyResult) as any} />
        </section>
      </div>

      {showExportModal && (
        <ExportModal audit={audit} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
