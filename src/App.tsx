import { useCallback, useEffect, useState } from "react";
import { ScanSearch, Zap, FileText, BarChart3, TrendingUp, Eye, Sparkles, ListChecks, Calendar, ChevronRight } from "lucide-react";
import { UrlInput } from "./components/UrlInput";
import { LoadingState } from "./components/LoadingState";
import { AuthModal } from "./components/AuthModal";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProjectDetailsView } from "./components/ProjectDetailsView";
import { AuditDetailsReport } from "./components/AuditDetailsReport";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { computeQualityScores } from "./lib/normalization";
import type { ParsedPage, WebsiteAudit } from "./types";
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
  const [selectedAudit, setSelectedAudit] = useState<WebsiteAudit | null>(null);
  const [isPublicShare, setIsPublicShare] = useState(false);
  const [historyAudits, setHistoryAudits] = useState<WebsiteAudit[]>([]);
  const [activeTab, setActiveTab] = useState<"projects" | "history" | "methodology">("projects");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<{
    status: string;
    crawled: number;
    total: number;
    wordCount: number;
  } | null>(null);

  // URL Path Hydration for Public Shared Audit Reports (e.g. /share/audit/:id)
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/share\/audit\/([a-f0-9-]{36})/i);
    if (match && match[1]) {
      const shareId = match[1];
      setLoading(true);
      (async () => {
        try {
          const { data, error: fetchErr } = await supabase
            .from("website_audits")
            .select("*")
            .eq("id", shareId)
            .maybeSingle();

          if (data && !fetchErr) {
            setSelectedAudit(data as WebsiteAudit);
            setIsPublicShare(true);
          } else {
            setError("Shared audit report not found or link has expired.");
          }
        } catch (err) {
          console.error("Failed to load share audit:", err);
          setError("Failed to load shared audit report.");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const handleClearAudit = () => {
    setSelectedAudit(null);
    setIsPublicShare(false);
    if (window.location.pathname.startsWith("/share/audit/")) {
      window.history.pushState({}, "", "/");
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!isSupabaseConfigured || !user) return;
    try {
      const { data, error } = await supabase
        .from("website_audits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setHistoryAudits(data as WebsiteAudit[]);
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
      setHistoryAudits([]);
    }
  }, [user, fetchHistory]);

  const saveAudit = async (
    url: string,
    projectId: string | null,
    scores: ReturnType<typeof computeQualityScores>,
    parsed: ParsedPage
  ): Promise<WebsiteAudit | null> => {
    if (!isSupabaseConfigured || !user) return null;

    const rawFrequency: Record<string, number> = {};
    for (const [word, count] of scores.analysis.wordFrequency) {
      rawFrequency[word] = count;
    }

    try {
      const insertPayload = {
        project_id: projectId,
        user_id: user.id,
        url,
        overall_score: scores.overall_score,
        seo_score: scores.seo_score,
        accessibility_score: scores.accessibility_score,
        security_score: scores.security_score,
        content_score: scores.content_score,
        performance_score: scores.performance_score,
        audit_data: {
          parsed,
          wordFrequency: rawFrequency,
          topKeywords: scores.analysis.topKeywords,
          bigrams: scores.analysis.bigrams,
          trigrams: scores.analysis.trigrams,
          breakdown: scores.breakdown,
          securityHeaders: parsed.securityHeaders || {
            hasCsp: false,
            hasHsts: false,
            hasXFrame: false,
            hasXContentType: false,
            cspHeader: null,
            hstsHeader: null,
            xFrameHeader: null,
            xContentTypeHeader: null,
          },
          accessibilityFlags: parsed.accessibilityFlags || {
            hasLang: false,
            langValue: null,
            hasHeadingSequenceViolation: false,
            imagesMissingAltCount: 0,
            totalImagesCount: 0,
          },
        },
        insights: {
          strengths: scores.analysis.insights.filter((i) => i.type === "strength"),
          weaknesses: scores.analysis.insights.filter((i) => i.type === "weakness"),
          recommendations: scores.analysis.insights.filter((i) => i.type === "recommendation"),
        },
      };

      const { data, error: insertError } = await supabase
        .from("website_audits")
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      return data as WebsiteAudit;
    } catch (err) {
      console.error("Failed to save audit:", err);
      return null;
    }
  };

  const handleAnalyze = async (url: string, projectId: string | null = null, siteWide: boolean = false) => {
    setLoading(true);
    setError(null);
    setSelectedAudit(null);
    setCrawlProgress(null);

    try {
      let jobId = null;
      if (siteWide && user && isSupabaseConfigured) {
        const { data, error: jobErr } = await supabase
          .from("crawl_jobs")
          .insert({
            project_id: projectId,
            user_id: user.id,
            status: "pending"
          })
          .select()
          .single();
        if (jobErr) throw jobErr;
        jobId = data.id;
        setCrawlProgress({
          status: "pending",
          crawled: 0,
          total: 0,
          wordCount: 0
        });
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url, siteWide, jobId }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${response.status})`);
      }

      if (siteWide && jobId && user && isSupabaseConfigured) {
        let isDone = false;
        let jobDetails = null;
        while (!isDone) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          const { data, error: pollErr } = await supabase
            .from("crawl_jobs")
            .select("*")
            .eq("id", jobId)
            .single();
          if (pollErr) throw pollErr;
          jobDetails = data;
          setCrawlProgress({
            status: data.status,
            crawled: data.crawled_pages,
            total: data.total_pages,
            wordCount: data.total_word_count
          });
          if (data.status === "completed" || data.status === "failed") {
            isDone = true;
          }
        }

        if (jobDetails.status === "failed") {
          throw new Error("Site-wide crawl failed.");
        }

        const { data: results, error: resultsErr } = await supabase
          .from("crawl_results")
          .select("*")
          .eq("job_id", jobId);
        if (resultsErr) throw resultsErr;

        const totalWordCount = jobDetails.total_word_count;
        let perfCount = 0;
        const avgScores = results.reduce((acc, curr) => {
          acc.seo += curr.seo_score;
          if (curr.performance_score !== null) {
            acc.perf += curr.performance_score;
            perfCount++;
          }
          acc.acc += curr.accessibility_score;
          acc.sec += curr.security_score;
          acc.content += curr.content_score;
          return acc;
        }, { seo: 0, perf: 0, acc: 0, sec: 0, content: 0 });

        const pageCount = results.length || 1;
        const finalSeo = Math.round(avgScores.seo / pageCount);
        const finalPerf = perfCount > 0 ? Math.round(avgScores.perf / perfCount) : null;
        const finalAcc = Math.round(avgScores.acc / pageCount);
        const finalSec = Math.round(avgScores.sec / pageCount);
        const finalContent = Math.round(avgScores.content / pageCount);
        const finalOverall = Math.round(finalSeo * 0.35 + finalAcc * 0.25 + finalSec * 0.20 + finalContent * 0.20);

        if (!results || results.length === 0) {
          throw new Error("No crawled pages were returned for this site-wide crawl.");
        }

        const rootCrawl = results.find(r => r.url === url) || results[0];
        const parsedBaseline = rootCrawl.audit_data;
        parsedBaseline.wordCount = totalWordCount;
        parsedBaseline.url = url;

        // Aggregate visibleText across all crawled pages for site-wide content analysis
        let combinedText = "";
        for (const res of results) {
          const pageParsed = res.audit_data;
          const pageText = pageParsed?.visibleText || (pageParsed?.paragraphs || []).join(" ") || pageParsed?.bodyText || "";
          combinedText += " " + pageText;
        }

        const baseScores = computeQualityScores({
          ...parsedBaseline,
          visibleText: combinedText,
        });

        const scores = {
          overall_score: finalOverall,
          seo_score: finalSeo,
          accessibility_score: finalAcc,
          security_score: finalSec,
          content_score: finalContent,
          performance_score: finalPerf,
          analysis: baseScores.analysis,
          breakdown: baseScores.breakdown
        };

        const saved = await saveAudit(url, projectId, scores, parsedBaseline);
        if (saved) {
          setSelectedAudit(saved);
          await fetchHistory();
        } else {
          setSelectedAudit(constructLocalAudit(url, scores, parsedBaseline, projectId));
        }
        return;
      }

      const parsed = (await response.json()) as ParsedPage;

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      if (parsed.statusCode >= 400) {
        throw new Error(`Server returned status ${parsed.statusCode}`);
      }

      const scores = computeQualityScores(parsed);

      if (user && isSupabaseConfigured) {
        const saved = await saveAudit(parsed.finalUrl, projectId, scores, parsed);
        if (saved) {
          setSelectedAudit(saved);
          await fetchHistory();
        } else {
          setSelectedAudit(constructLocalAudit(parsed.finalUrl, scores, parsed, projectId));
        }
      } else {
        setSelectedAudit(constructLocalAudit(parsed.finalUrl, scores, parsed, null));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze website";
      setError(message);
    } finally {
      setLoading(false);
      setCrawlProgress(null);
    }
  };

  const constructLocalAudit = (
    url: string,
    scores: ReturnType<typeof computeQualityScores>,
    parsed: ParsedPage,
    projectId: string | null
  ): WebsiteAudit => {
    const rawFrequency: Record<string, number> = {};
    for (const [word, count] of scores.analysis.wordFrequency) {
      rawFrequency[word] = count;
    }

    return {
      id: "demo-audit-id",
      project_id: projectId,
      user_id: user?.id || null,
      url,
      overall_score: scores.overall_score,
      seo_score: scores.seo_score,
      accessibility_score: scores.accessibility_score,
      security_score: scores.security_score,
      content_score: scores.content_score,
      performance_score: scores.performance_score,
      audit_data: {
        parsed,
        wordFrequency: rawFrequency,
        topKeywords: scores.analysis.topKeywords,
        bigrams: scores.analysis.bigrams,
        trigrams: scores.analysis.trigrams,
        securityHeaders: parsed.securityHeaders || {
          hasCsp: false,
          hasHsts: false,
          hasXFrame: false,
          hasXContentType: false,
          cspHeader: null,
          hstsHeader: null,
          xFrameHeader: null,
          xContentTypeHeader: null,
        },
        accessibilityFlags: parsed.accessibilityFlags || {
          hasLang: false,
          langValue: null,
          hasHeadingSequenceViolation: false,
          imagesMissingAltCount: 0,
          totalImagesCount: 0,
        },
      },
      insights: {
        strengths: (scores.analysis.insights || []).filter((i) => i.type === "strength"),
        weaknesses: (scores.analysis.insights || []).filter((i) => i.type === "weakness"),
        recommendations: (scores.analysis.insights || []).filter((i) => i.type === "recommendation"),
      },
      created_at: new Date().toISOString(),
    };
  };

  // Sign out handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSelectedAudit(null);
    setActiveTab("projects");
  };

  // Logged-in Dashboard Flow
  if (user) {
    return (
      <DashboardLayout
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
      >
        {loading && (
          <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-ink-900 border border-ink-700/80 rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl glass">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin"></div>
              </div>
              <div>
                <h3 className="text-slate-100 font-display font-semibold text-base">Analyzing Website</h3>
                <p className="text-xs text-slate-400 mt-1">Executing Core Web Vitals and crawling site links...</p>
              </div>
              {crawlProgress && (
                <div className="space-y-3 pt-2 text-left">
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
                    <span>crawling pages</span>
                    <span>{crawlProgress.crawled} / {crawlProgress.total || "?"}</span>
                  </div>
                  <div className="w-full h-1.5 bg-ink-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (crawlProgress.crawled / (crawlProgress.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
                    <span>Status: <span className="text-cyan-400">{crawlProgress.status}</span></span>
                    <span>Words Found: <span className="text-emerald-400">{crawlProgress.wordCount.toLocaleString()}</span></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && (
          <>
            {selectedAudit ? (
              <AuditDetailsReport
                audit={selectedAudit}
                onBack={handleClearAudit}
                isPublicShare={isPublicShare}
                onStartOwnAudit={handleClearAudit}
              />
            ) : (
              <>
                {activeTab === "projects" && (
                  <ProjectDetailsView
                    onSelectAudit={(audit) => setSelectedAudit(audit)}
                    onRunAudit={handleAnalyze}
                    loading={loading}
                  />
                )}

                {activeTab === "history" && (
                  <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
                    <h2 className="text-lg font-display font-bold text-slate-50 mb-4">Historical Audit Records</h2>
                    <div className="space-y-3">
                      {historyAudits.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-8">
                          No audit reports saved. Go to Websites to start crawling.
                        </p>
                      ) : (
                        historyAudits.map((audit) => (
                          <div
                            key={audit.id}
                            onClick={() => setSelectedAudit(audit)}
                            className="flex items-center justify-between p-4 bg-ink-900/30 hover:bg-ink-850/50 border border-ink-800/60 hover:border-cyan-500/20 rounded-xl cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm shrink-0 border ${audit.overall_score >= 80
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : audit.overall_score >= 50
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                }`}>
                                {audit.overall_score}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-200 truncate">{getDomain(audit.url)}</p>
                                <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                  {new Date(audit.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </DashboardLayout>
    );
  }

  // Unauthenticated Landing / Demo Flow
  return (
    <div className="min-h-screen bg-ink-900 text-slate-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background effects */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex-1">
        {/* Header */}
        <header className="border-b border-ink-800/60 glass sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <ScanSearch className="w-5 h-5 text-ink-950" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-slate-50 leading-none">
                  Sentinel<span className="gradient-text">QA</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Website Quality Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-xs bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-semibold px-5 py-2 rounded-xl transition-all hover:brightness-110 active:scale-95 shadow-md shadow-cyan-500/10"
              >
                Sign In / Register
              </button>
              <a
                href="https://developers.google.com/search/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <span className="hidden sm:inline">SEO Docs</span>
                <span className="text-[10px]">↗</span>
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {loading && <LoadingState />}

          {!loading && (
            <>
              {selectedAudit ? (
                <div className="animate-fade-in">
                  <AuditDetailsReport
                    audit={selectedAudit}
                    onBack={handleClearAudit}
                    isPublicShare={isPublicShare}
                    onStartOwnAudit={handleClearAudit}
                  />
                </div>
              ) : (
                <div className="animate-fade-in-up">
                  {/* Hero */}
                  <div className="text-center max-w-3xl mx-auto mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-300 mb-5">
                      <Zap className="w-3 h-3" />
                      Crawl any URL · Instant accessibility & SEO audits
                    </div>
                    <h2 className="font-display font-bold text-4xl md:text-5xl text-slate-50 leading-tight text-balance mb-4">
                      The intelligent platform to audit <span className="gradient-text">Website Quality</span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
                      Run unified audits for SEO tags, response security compliance, HTML accessibility rules,
                      and content density standards in seconds.
                    </p>
                  </div>

                  {/* Input */}
                  <div className="max-w-2xl mx-auto mb-12">
                    <UrlInput onAnalyze={(url) => handleAnalyze(url, null)} loading={loading} error={error} />
                  </div>

                  {/* Feature highlights */}
                  <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
                    {[
                      { icon: <FileText className="w-5 h-5" />, title: "SEO Quality Engine", desc: "Detailed analysis of meta titles, tags, heading outlines, and canonicals." },
                      { icon: <BarChart3 className="w-5 h-5" />, title: "Security Headers", desc: "Verifies protection (CSP, HSTS, X-Frame-Options) against vulnerabilities." },
                      { icon: <TrendingUp className="w-5 h-5" />, title: "Accessibility Compliance", desc: "Validates lang values, alt tag coverage, and heading hierarchy schemas." },
                      { icon: <Eye className="w-5 h-5" />, title: "Content & Word Counter", desc: "Every unique word and phrase mapped with readability difficulty indexing." },
                      { icon: <Sparkles className="w-5 h-5" />, title: "Multi-View Dashboard", desc: "Visual trends graph monitoring performance scores across multiple domains." },
                      { icon: <ListChecks className="w-5 h-5" />, title: "Prioritized Action Plan", desc: "Actionable priority fixes ranked by impact and effort values." },
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
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-ink-800/60 relative z-10 bg-ink-950/20 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            SentinelQA — Continuous Website Quality monitoring. Built with Supabase & React.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>Register to save audit history</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default App;
