import { useCallback, useEffect, useState } from "react";
import { ScanSearch, Zap, FileText, TrendingUp, ExternalLink, BarChart3, Download, Eye, Sparkles, ListChecks } from "lucide-react";
import { UrlInput } from "./components/UrlInput";
import { ScoreGauge } from "./components/ScoreGauge";
import { StatCards } from "./components/StatCards";
import { WordFrequencyTable } from "./components/WordFrequencyTable";
import { PhraseAnalysis } from "./components/PhraseAnalysis";
import { InsightsPanel } from "./components/InsightsPanel";
import { MetaDetails } from "./components/MetaDetails";
import { KeywordRecommendations } from "./components/KeywordRecommendations";
import { StructurePanel } from "./components/StructurePanel";
import { ExtractedTextPanel } from "./components/ExtractedTextPanel";
import { SerpPreview } from "./components/SerpPreview";
import { MetaGenerator } from "./components/MetaGenerator";
import { ActionPlan } from "./components/ActionPlan";
import { GradeCard } from "./components/GradeCard";
import { MethodologyPanel } from "./components/MethodologyPanel";
import { VerificationChecklist } from "./components/VerificationChecklist";
import { ConfidenceIndicator } from "./components/ConfidenceIndicator";
import { HistorySidebar } from "./components/HistorySidebar";
import { LoadingState } from "./components/LoadingState";
import { SpaWarning } from "./components/SpaWarning";
import { downloadReport } from "./lib/reportGenerator";
import { analyzePage } from "./lib/analyzer";
import {
  generateActionPlan,
  calculateGradeCard,
  generateVerificationChecks,
  calculateConfidence,
} from "./lib/analyzer";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import type { AnalysisResult, ParsedPage, SeoReport } from "./types";
import { AuthModal } from "./components/AuthModal";
import type { User } from "@supabase/supabase-js";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-seo`;

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<SeoReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [view, setView] = useState<"landing" | "report">("landing");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!isSupabaseConfigured || !user) return;
    try {
      const { data, error } = await supabase
        .from("seo_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistory(data as SeoReport[]);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [user, fetchHistory]);

  const saveReport = async (analysis: AnalysisResult): Promise<string | null> => {
    const { parsed } = analysis;
    const domain = getDomain(parsed.finalUrl);

    const headingsMap: Record<string, string[]> = {};
    for (let level = 1; level <= 6; level++) {
      headingsMap[`h${level}`] = parsed.headings
        .filter((h) => h.level === level)
        .map((h) => h.text);
    }

    const rawFrequency: Record<string, number> = {};
    for (const [word, count] of analysis.wordFrequency) {
      rawFrequency[word] = count;
    }

    const insights = {
      strengths: analysis.insights.filter((i) => i.type === "strength"),
      weaknesses: analysis.insights.filter((i) => i.type === "weakness"),
      recommendations: analysis.insights.filter((i) => i.type === "recommendation"),
    };

    const metaTags: Record<string, unknown> = {
      ogTags: parsed.ogTags,
      twitterTags: parsed.twitterTags,
      canonical: parsed.canonical,
      robots: parsed.robots,
      viewport: parsed.viewport,
      charset: parsed.charset,
      lang: parsed.lang,
      keywords: parsed.metaKeywords,
    };

    if (!isSupabaseConfigured || !user) return null;
    try {
      const { data, error: insertError } = await supabase
        .from("seo_reports")
        .insert({
          user_id: user.id,
          url: parsed.finalUrl,
          domain,
          title: parsed.title,
          meta_description: parsed.metaDescription,
          word_count: parsed.wordCount,
          unique_words: analysis.contentQuality.uniqueWords,
          readability_score: analysis.readabilityScore,
          seo_score: analysis.seoScore,
          top_keywords: analysis.topKeywords,
          bigrams: analysis.bigrams,
          trigrams: analysis.trigrams,
          headings: headingsMap,
          meta_tags: metaTags,
          images: parsed.images,
          links: parsed.links,
          insights,
          raw_frequency: rawFrequency,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      return data.id;
    } catch (err) {
      console.error("Failed to save report:", err);
      return null;
    }
  };

  const handleAnalyze = async (url: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setView("report");

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${response.status})`);
      }

      const parsed = (await response.json()) as ParsedPage;

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      if (parsed.statusCode >= 400) {
        throw new Error(`Server returned status ${parsed.statusCode}`);
      }

      const analysis = analyzePage(parsed);
      setResult(analysis);

      const reportId = await saveReport(analysis);
      if (reportId) {
        setActiveReportId(reportId);
        await fetchHistory();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze URL";
      setError(message);
      setView("landing");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (report: SeoReport) => {
    // Reconstruct AnalysisResult from saved report
    const reconstructed: AnalysisResult = {
      parsed: {
        url: report.url,
        finalUrl: report.url,
        title: report.title,
        metaDescription: report.meta_description,
        metaKeywords: (report.meta_tags as Record<string, unknown>)?.keywords as string | null ?? null,
        canonical: (report.meta_tags as Record<string, unknown>)?.canonical as string | null ?? null,
        ogTags: (report.meta_tags as Record<string, unknown>)?.ogTags as Record<string, string> ?? {},
        twitterTags: (report.meta_tags as Record<string, unknown>)?.twitterTags as Record<string, string> ?? {},
        robots: (report.meta_tags as Record<string, unknown>)?.robots as string | null ?? null,
        viewport: (report.meta_tags as Record<string, unknown>)?.viewport as string | null ?? null,
        charset: (report.meta_tags as Record<string, unknown>)?.charset as string | null ?? null,
        lang: (report.meta_tags as Record<string, unknown>)?.lang as string | null ?? null,
        headings: [],
        paragraphs: [],
        images: report.images,
        links: report.links,
        bodyText: "",
        visibleText: "",
        wordCount: report.word_count,
        rawHtmlLength: 0,
        statusCode: 200,
        contentType: "text/html",
        error: null,
        isClientRendered: false,
        renderNote: null,
      },
      wordFrequency: new Map(Object.entries(report.raw_frequency)),
      topKeywords: report.top_keywords,
      stopWordCount: 0,
      bigrams: report.bigrams,
      trigrams: report.trigrams,
      readabilityScore: report.readability_score,
      readabilityLabel: "",
      seoScore: report.seo_score,
      keywordDensity: report.top_keywords,
      overusedWords: report.top_keywords.filter((k) => k.density > 4 && k.count > 5),
      underusedKeywords: [],
      recommendedKeywords: [],
      metaSuggestions: {
        suggestedTitle: report.title || "",
        suggestedDescription: report.meta_description || "",
        titleReason: "",
        descriptionReason: "",
      },
      insights: [
        ...(report.insights.strengths || []),
        ...(report.insights.weaknesses || []),
        ...(report.insights.recommendations || []),
      ],
      actionPlan: [],
      gradeCard: { overallGrade: "", entries: [] },
      verificationChecks: [],
      confidence: { score: 100, label: "High", factors: [] },
      contentQuality: {
        totalWords: report.word_count,
        uniqueWords: report.unique_words,
        lexicalDiversity: report.word_count > 0
          ? Math.round((report.unique_words / report.word_count) * 1000) / 10
          : 0,
        avgWordsPerSentence: 0,
        sentenceCount: 0,
        longWords: 0,
      },
    };

    // Rebuild headings from saved structure
    const headings: { level: number; text: string }[] = [];
    for (let level = 1; level <= 6; level++) {
      const key = `h${level}`;
      const texts = (report.headings as Record<string, string[]>)[key] || [];
      for (const text of texts) {
        headings.push({ level, text });
      }
    }
    reconstructed.parsed.headings = headings;

    // Recompute derived fields from reconstructed data
    reconstructed.actionPlan = generateActionPlan(
      reconstructed.parsed,
      reconstructed.insights,
      reconstructed.topKeywords,
      reconstructed.overusedWords,
    );
    reconstructed.gradeCard = calculateGradeCard(
      reconstructed.parsed,
      reconstructed.topKeywords,
      reconstructed.insights,
    );
    reconstructed.verificationChecks = generateVerificationChecks(
      reconstructed.parsed,
      reconstructed.readabilityScore,
    );
    reconstructed.confidence = calculateConfidence(
      reconstructed.parsed,
      reconstructed.verificationChecks,
    );

    setResult(reconstructed);
    setActiveReportId(report.id);
    setError(null);
    setView("report");
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured || !user) return;
    try {
      await supabase.from("seo_reports").delete().eq("id", id);
      setHistory(history.filter((r) => r.id !== id));
      if (activeReportId === id) {
        setActiveReportId(null);
        setResult(null);
        setView("landing");
      }
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-slate-200 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-ink-800/60 glass sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <ScanSearch className="w-5 h-5 text-ink-950" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-slate-50 leading-none">
                  SEO<span className="gradient-text">Lens</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Word Counter & SEO Analyzer</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isSupabaseConfigured ? (
                <>
                  <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                    Live
                  </span>
                  {user ? (
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:inline text-xs text-slate-400 max-w-[120px] truncate" title={user.email}>
                        {user.email}
                      </span>
                      <button
                        onClick={() => supabase.auth.signOut()}
                        className="text-xs bg-ink-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 px-2.5 py-1.5 rounded-lg border border-ink-700/60 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="text-xs bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-semibold px-4 py-1.5 rounded-lg transition-all hover:brightness-110 active:scale-95"
                    >
                      Sign In
                    </button>
                  )}
                </>
              ) : (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft" />
                  Demo Mode (Database Disconnected)
                </span>
              )}
              <a
                href="https://developers.google.com/search/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <span className="hidden sm:inline">SEO Docs</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {view === "landing" && !loading && (
            <div className="animate-fade-in-up">
              {/* Hero */}
              <div className="text-center max-w-3xl mx-auto mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-300 mb-5">
                  <Zap className="w-3 h-3" />
                  Crawl any URL · Instant analysis
                </div>
                <h2 className="font-display font-bold text-4xl md:text-5xl text-slate-50 leading-tight text-balance mb-4">
                  Analyze your website's <span className="gradient-text">SEO & word frequency</span> in seconds
                </h2>
                <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
                  Enter any URL to extract word counts, keyword density, readability scores,
                  heading structure, and actionable SEO recommendations — all in one professional report.
                </p>
              </div>

              {/* Input */}
              <div className="max-w-2xl mx-auto mb-12">
                <UrlInput onAnalyze={handleAnalyze} loading={loading} error={error} />
              </div>

              {/* Feature highlights */}
              <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
                {[
                  { icon: <FileText className="w-5 h-5" />, title: "Word Frequency", desc: "Every unique word counted with density metrics and stop word filtering." },
                  { icon: <BarChart3 className="w-5 h-5" />, title: "SEO Scoring", desc: "Composite score from 25+ checks: meta tags, headings, images, links." },
                  { icon: <TrendingUp className="w-5 h-5" />, title: "Smart Insights", desc: "Strengths, weaknesses, and keyword recommendations tailored to your niche." },
                  { icon: <Eye className="w-5 h-5" />, title: "SERP Preview", desc: "Live Google search result preview with editable title and description." },
                  { icon: <Sparkles className="w-5 h-5" />, title: "AI Meta Generator", desc: "Auto-generates optimized title, description, and OG tags from your content." },
                  { icon: <ListChecks className="w-5 h-5" />, title: "Action Plan", desc: "Prioritized step-by-step fixes with estimated SEO score impact." },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="bg-ink-850/40 glass border border-ink-700 rounded-xl p-5 hover:border-cyan-400/20 transition-all animate-fade-in-up"
                    style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3">
                      {feature.icon}
                    </div>
                    <h3 className="font-display font-semibold text-slate-100 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* History on landing if exists */}
              {user && history.length > 0 && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-slate-400">Recent analyses</span>
                  </div>
                  <HistorySidebar
                    reports={history.slice(0, 5)}
                    onSelect={handleSelectHistory}
                    onDelete={handleDelete}
                    activeId={activeReportId}
                  />
                </div>
              )}
            </div>
          )}

          {view === "report" && loading && <LoadingState />}

          {view === "report" && result && !loading && (
            <div className="animate-fade-in space-y-6">
              {/* Top bar: back + new analysis */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setView("landing"); setResult(null); setActiveReportId(null); }}
                    className="text-sm text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>← New analysis</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <a
                    href={result.parsed.finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <span className="font-mono text-xs">{getDomain(result.parsed.finalUrl)}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => downloadReport(result)}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/90 to-emerald-500/90 hover:from-cyan-500 hover:to-emerald-500 text-ink-950 font-medium text-xs px-3.5 py-2 rounded-lg transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Report
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_320px] gap-6">
                <div className="space-y-6 min-w-0">
                  {/* Score overview */}
                  <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-8">
                    <ScoreGauge score={result.seoScore} label="SEO Score" sublabel="Composite rating" size="lg" />
                    <div className="flex-1 w-full">
                      <h2 className="font-display font-bold text-xl text-slate-50 mb-1 truncate">
                        {result.parsed.title || "Untitled Page"}
                      </h2>
                      <p className="text-sm text-slate-500 mb-4 font-mono truncate">{result.parsed.finalUrl}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-ink-800/50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-display font-bold text-slate-100">{result.parsed.wordCount.toLocaleString()}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Words</p>
                        </div>
                        <div className="bg-ink-800/50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-display font-bold text-slate-100">{result.contentQuality.uniqueWords.toLocaleString()}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Unique</p>
                        </div>
                        <div className="bg-ink-800/50 rounded-xl p-3 text-center">
                          <p className={`text-2xl font-display font-bold ${result.readabilityScore >= 60 ? "text-emerald-400" : result.readabilityScore >= 40 ? "text-amber-400" : "text-rose-400"}`}>
                            {result.readabilityScore}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Readability</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SPA warning */}
                  {result.parsed.isClientRendered && result.parsed.renderNote && (
                    <SpaWarning note={result.parsed.renderNote} />
                  )}

                  {/* Grade card */}
                  <GradeCard result={result} />

                  {/* Confidence indicator */}
                  <ConfidenceIndicator result={result} />

                  {/* Stat cards */}
                  <StatCards result={result} />

                  {/* SERP Preview */}
                  <SerpPreview result={result} />

                  {/* Meta tag generator */}
                  <MetaGenerator result={result} />

                  {/* Meta details */}
                  <MetaDetails result={result} />

                  {/* Word frequency table */}
                  <WordFrequencyTable
                    rawFrequency={result.wordFrequency}
                    totalWords={result.parsed.wordCount}
                  />

                  {/* Phrase analysis */}
                  <PhraseAnalysis bigrams={result.bigrams} trigrams={result.trigrams} />

                  {/* Keyword recommendations */}
                  <KeywordRecommendations result={result} />

                  {/* Structure */}
                  <StructurePanel result={result} />

                  {/* Extracted text */}
                  <ExtractedTextPanel result={result} />

                  {/* Action plan */}
                  <ActionPlan result={result} />

                  {/* Verification checklist */}
                  <VerificationChecklist result={result} />

                  {/* Methodology */}
                  <MethodologyPanel seoScore={result.seoScore} />

                  {/* Insights */}
                  <div>
                    <h2 className="font-display font-bold text-xl text-slate-50 mb-4">SEO Insights & Recommendations</h2>
                    <InsightsPanel insights={result.insights} />
                  </div>
                </div>

                {/* History sidebar */}
                <div>
                  {user ? (
                    <HistorySidebar
                      reports={history}
                      onSelect={handleSelectHistory}
                      onDelete={handleDelete}
                      activeId={activeReportId}
                    />
                  ) : isSupabaseConfigured ? (
                    <div className="bg-ink-850/45 glass border border-ink-700/50 rounded-2xl p-5 text-center shadow-lg">
                      <h3 className="font-display font-bold text-slate-100 text-sm mb-2">Save Scan History</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        Sign in to automatically save and track your SEO analyses in a personal history dashboard.
                      </p>
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="w-full py-2 bg-gradient-to-r from-cyan-500/80 to-emerald-500/80 hover:from-cyan-500 hover:to-emerald-500 text-ink-950 font-semibold text-xs rounded-lg transition-all active:scale-95"
                      >
                        Sign In / Sign Up
                      </button>
                    </div>
                  ) : (
                    <div className="bg-ink-850/20 border border-ink-800 rounded-2xl p-5 text-center">
                      <p className="text-xs text-slate-500">
                        Connect your database to enable saving report histories.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-ink-800/60 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              SEO Lens — Built with Supabase Edge Functions · Analyzes visible text only
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span>Reports saved to your history</span>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Auth Modal Overlay */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default App;
