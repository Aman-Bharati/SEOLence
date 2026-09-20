import { useState, useEffect } from "react";
import { Plus, Trash2, ShieldCheck, Sparkles, Loader2, RefreshCw, Trophy, Crown, Check, AlertTriangle, Key, BookOpen, List, ArrowRight } from "lucide-react";
import type { WebsiteAudit, CompetitorScorecard } from "../types";
import { computeQualityScores } from "../lib/normalization";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface CompetitorPanelProps {
  projectId: string;
  latestAudit: WebsiteAudit | null;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-seo`;

export function CompetitorPanel({ projectId, latestAudit }: CompetitorPanelProps) {
  const [competitorUrls, setCompetitorUrls] = useState<string[]>([]);
  const [scorecards, setScorecards] = useState<Record<string, CompetitorScorecard>>({});
  const [newUrl, setNewUrl] = useState("");
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"scores" | "keywords" | "outlines" | "gaps">("scores");
  const [selectedCompOutlineUrl, setSelectedCompOutlineUrl] = useState<string>("");

  // Load competitor URLs from Supabase DB with fallback to localStorage
  useEffect(() => {
    let isMounted = true;
    setScorecards({});

    (async () => {
      if (isSupabaseConfigured) {
        try {
          const { data, error: dbErr } = await supabase
            .from("project_competitors")
            .select("domain")
            .eq("project_id", projectId);

          if (data && !dbErr && data.length > 0 && isMounted) {
            const urls = data.map((row) => row.domain);
            setCompetitorUrls(urls);
            urls.forEach((u) => scanCompetitor(u));
            return;
          }
        } catch (err) {
          console.error("Failed to fetch competitors from DB:", err);
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(`project_competitors_${projectId}`);
      if (saved && isMounted) {
        try {
          const urls = JSON.parse(saved);
          setCompetitorUrls(urls);
          urls.forEach((u: string) => scanCompetitor(u));
        } catch {
          setCompetitorUrls([]);
        }
      } else if (isMounted) {
        setCompetitorUrls([]);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const saveCompetitors = async (urls: string[], addedUrl?: string, deletedUrl?: string) => {
    setCompetitorUrls(urls);
    localStorage.setItem(`project_competitors_${projectId}`, JSON.stringify(urls));

    if (isSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (addedUrl) {
            await supabase.from("project_competitors").insert({
              project_id: projectId,
              user_id: user.id,
              domain: addedUrl,
            });
          }
          if (deletedUrl) {
            await supabase
              .from("project_competitors")
              .delete()
              .eq("project_id", projectId)
              .eq("domain", deletedUrl);
          }
        }
      } catch (err) {
        console.error("Failed to sync competitor to Supabase:", err);
      }
    }
  };

  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let urlClean = newUrl.trim().toLowerCase();
    if (!urlClean) return;

    if (!/^https?:\/\//i.test(urlClean)) {
      urlClean = "https://" + urlClean;
    }

    try {
      new URL(urlClean);
    } catch {
      setError("Invalid competitor URL format.");
      return;
    }

    if (competitorUrls.includes(urlClean)) {
      setError("Competitor URL already tracked.");
      return;
    }

    if (competitorUrls.length >= 3) {
      setError("You can track up to 3 competitors per project.");
      return;
    }

    const updated = [...competitorUrls, urlClean];
    saveCompetitors(updated, urlClean, undefined);
    setNewUrl("");
    scanCompetitor(urlClean);
  };

  const handleDeleteCompetitor = (url: string) => {
    const updated = competitorUrls.filter((u) => u !== url);
    saveCompetitors(updated, undefined, url);
    const updatedCards = { ...scorecards };
    delete updatedCards[url];
    setScorecards(updatedCards);
    if (selectedCompOutlineUrl === url) {
      const remainingUrls = Object.keys(updatedCards);
      setSelectedCompOutlineUrl(remainingUrls[0] || "");
    }
  };

  const scanCompetitor = async (url: string) => {
    setLoadingUrl(url);
    setError(null);

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
        throw new Error(`Crawl request failed (${response.status})`);
      }

      const parsed = await response.json();
      if (parsed.error) {
        throw new Error(parsed.error);
      }

      // Run modular client side scoring & analysis mapping
      const scores = computeQualityScores(parsed);

      const scorecard: CompetitorScorecard = {
        url,
        overallScore: scores.overall_score,
        seoScore: scores.seo_score,
        performanceScore: scores.performance_score,
        accessibilityScore: scores.accessibility_score,
        securityScore: scores.security_score,
        contentScore: scores.content_score,
        wordCount: parsed.wordCount || 0,
        responseTimeMs: parsed.responseTimeMs || 0,
        loadTimeMs: parsed.loadTimeMs || 0,
        hasCsp: parsed.securityHeaders?.hasCsp ?? false,
        hasSchema: parsed.hasJsonLd || parsed.hasMicrodata,
        hasRobots: parsed.robotsTxtExists ?? false,
        hasSitemap: parsed.sitemapExists ?? false,
        topKeywords: scores.analysis.topKeywords,
        headings: parsed.headings,
        title: parsed.title,
        metaDescription: parsed.metaDescription,
      };

      setScorecards((prev) => {
        const next = { ...prev, [url]: scorecard };
        if (!selectedCompOutlineUrl) {
          setSelectedCompOutlineUrl(url);
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to crawl ${url}`);
    } finally {
      setLoadingUrl(null);
    }
  };

  // Prepare baseline scorecard for main site
  const mainScorecard: CompetitorScorecard | null = latestAudit
    ? {
        url: latestAudit.url,
        overallScore: latestAudit.overall_score,
        seoScore: latestAudit.seo_score,
        performanceScore: latestAudit.performance_score,
        accessibilityScore: latestAudit.accessibility_score,
        securityScore: latestAudit.security_score,
        contentScore: latestAudit.content_score,
        wordCount: latestAudit.audit_data.parsed?.wordCount || 0,
        responseTimeMs: latestAudit.audit_data.parsed?.responseTimeMs || 0,
        loadTimeMs: latestAudit.audit_data.parsed?.loadTimeMs || 0,
        hasCsp: latestAudit.audit_data.parsed?.securityHeaders?.hasCsp ?? false,
        hasSchema: latestAudit.audit_data.parsed?.hasJsonLd || latestAudit.audit_data.parsed?.hasMicrodata,
        hasRobots: latestAudit.audit_data.parsed?.robotsTxtExists ?? false,
        hasSitemap: latestAudit.audit_data.parsed?.sitemapExists ?? false,
        topKeywords: latestAudit.audit_data?.topKeywords || [],
        headings: latestAudit.audit_data.parsed?.headings || [],
        title: latestAudit.audit_data.parsed?.title || null,
        metaDescription: latestAudit.audit_data.parsed?.metaDescription || null,
      }
    : null;

  const activeCards = Object.values(scorecards);

  // Compute category winners
  const getWinner = (key: keyof CompetitorScorecard) => {
    if (!mainScorecard) return "";
    const list = [mainScorecard, ...activeCards];
    let maxVal = -1;
    let winnerUrl = "";
    for (const card of list) {
      const val = card[key];
      if (typeof val === "number" && val > maxVal) {
        maxVal = val;
        winnerUrl = card.url;
      }
    }
    return winnerUrl;
  };

  // Generate automated gap analysis recommendations
  const generateGaps = () => {
    const gaps: { title: string; desc: string; type: "warning" | "info" | "success" }[] = [];
    if (!mainScorecard || activeCards.length === 0) return gaps;

    for (const comp of activeCards) {
      const compDomain = new URL(comp.url).hostname;
      
      // Speed Gap
      if (comp.loadTimeMs > 0 && mainScorecard.loadTimeMs > comp.loadTimeMs + 500) {
        gaps.push({
          title: `Performance lag vs. ${compDomain}`,
          desc: `Your website loads in ${mainScorecard.loadTimeMs}ms, while ${compDomain} resolves in ${comp.loadTimeMs}ms. Consider minifying main bundles and compressing assets.`,
          type: "warning",
        });
      }

      // Schema Gap
      if (comp.hasSchema && !mainScorecard.hasSchema) {
        gaps.push({
          title: `Schema tags gap vs. ${compDomain}`,
          desc: `${compDomain} deploys structural schema markup for richer search results. Generate organizational schemas via the AI Fix Engine.`,
          type: "warning",
        });
      }

      // CSP Security Gap
      if (comp.hasCsp && !mainScorecard.hasCsp) {
        gaps.push({
          title: `Content Security Policy gap vs. ${compDomain}`,
          desc: `${compDomain} sets CSP headers. Configuring CSP protects your pages against cross-site scripting (XSS).`,
          type: "warning",
        });
      }

      // Word Count Gap
      if (comp.wordCount > mainScorecard.wordCount + 300) {
        gaps.push({
          title: `Content depth gap vs. ${compDomain}`,
          desc: `${compDomain} has ${comp.wordCount} words compared to your ${mainScorecard.wordCount}. Expanding your body content improves keyword rankings.`,
          type: "warning",
        });
      }
    }

    const beatsAllOverall = activeCards.every(c => mainScorecard.overallScore > c.overallScore);
    if (beatsAllOverall) {
      gaps.push({
        title: "Quality Leader in Niche!",
        desc: "Your overall quality scores exceed all tracked competitors. Run automated schedules to protect your rankings.",
        type: "success",
      });
    }

    if (gaps.length === 0) {
      gaps.push({
        title: "Technical Parity Reached",
        desc: "Your website matches or beats tracked competitors on all major checks.",
        type: "info",
      });
    }

    return gaps;
  };

  // Compute Keyword Gap report
  const getKeywordGaps = () => {
    if (!mainScorecard || activeCards.length === 0) return [];
    const mainKeywords = new Set((mainScorecard.topKeywords || []).map((k) => k.word.toLowerCase()));
    
    const gaps: { word: string; count: number; density: number; domain: string }[] = [];
    for (const card of activeCards) {
      const compDomain = new URL(card.url).hostname;
      const compKeywords = card.topKeywords || [];
      for (const kw of compKeywords.slice(0, 10)) {
        if (!mainKeywords.has(kw.word.toLowerCase())) {
          gaps.push({
            word: kw.word,
            count: kw.count,
            density: kw.density,
            domain: compDomain,
          });
        }
      }
    }
    return gaps.sort((a, b) => b.density - a.density);
  };

  const gapAnalysisList = generateGaps();
  const keywordGaps = getKeywordGaps();
  const selectedCompOutline = scorecards[selectedCompOutlineUrl] || activeCards[0] || null;

  return (
    <div className="space-y-6">
      {/* Input Form Banner */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-display font-bold text-slate-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Competitor Intelligence Centre
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Track and compare your performance, semantic keywords, headings structures, and checklist scores side-by-side against key competitors.
          </p>
        </div>

        <form onSubmit={handleAddCompetitor} className="flex gap-3 max-w-xl">
          <input
            type="text"
            placeholder="e.g. competitor.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 bg-ink-900 border border-ink-700/80 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={loadingUrl !== null}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-ink-800 text-ink-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:pointer-events-none active:scale-95"
          >
            {loadingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Competitor
          </button>
        </form>

        {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

        {competitorUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {competitorUrls.map((url) => {
              const isScanning = loadingUrl === url;
              return (
                <div key={url} className="flex items-center gap-2 bg-ink-900 border border-ink-800 rounded-xl px-3 py-1.5 text-[11px]">
                  <span className="font-mono text-slate-300 truncate max-w-[150px]">{new URL(url).hostname}</span>
                  <div className="flex items-center gap-1 shrink-0 pl-1.5">
                    <button
                      onClick={() => scanCompetitor(url)}
                      disabled={loadingUrl !== null}
                      className="p-1 rounded bg-ink-950 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20 transition-all"
                      title="Run Scan"
                    >
                      {isScanning ? (
                        <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCompetitor(url)}
                      className="p-1 rounded bg-ink-950 text-slate-400 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!mainScorecard ? (
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 text-center">
          <p className="text-xs text-slate-500 font-medium">Please perform an initial audit on your main domain first.</p>
        </div>
      ) : activeCards.length === 0 ? (
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-8 text-center space-y-2">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto opacity-35" />
          <h4 className="text-slate-200 font-semibold text-sm">Add tracked websites to start</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Enter competitor domains above to load side-by-side keyword analyses, structured outlines, and score benchmarks.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-ink-800 gap-2">
            {[
              { id: "scores", label: "Side-by-Side Scores", icon: Trophy },
              { id: "keywords", label: "Keyword Gap Analyzer", icon: Key },
              { id: "outlines", label: "Heading Outlines", icon: BookOpen },
              { id: "gaps", label: "Recommendations & Gaps", icon: List },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeSubTab === tab.id
                      ? "border-cyan-500 text-cyan-400 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub Tab Contents */}
          {activeSubTab === "scores" && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Score comparisons */}
              <div className="md:col-span-2 bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
                <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-cyan-400" />
                  Score Benchmarks
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-ink-800 text-slate-400 font-mono">
                        <th className="py-2.5 font-semibold">Crawl Metric</th>
                        <th className="py-2.5 font-semibold text-cyan-400">Main Website</th>
                        {activeCards.map((card) => (
                          <th key={card.url} className="py-2.5 font-semibold truncate max-w-[120px]" title={card.url}>
                            {new URL(card.url).hostname}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { label: "Overall Rating", key: "overallScore" },
                        { label: "SEO Audit Score", key: "seoScore" },
                        { label: "Performance CWV", key: "performanceScore" },
                        { label: "Accessibility Score", key: "accessibilityScore" },
                        { label: "Security Header Rating", key: "securityScore" },
                        { label: "Content Quality Index", key: "contentScore" },
                      ] as const).map((row) => {
                        const mainWinner = getWinner(row.key) === mainScorecard.url;
                        return (
                          <tr key={row.key} className="border-b border-ink-900/50 hover:bg-ink-900/10">
                            <td className="py-3 text-slate-300 font-medium">{row.label}</td>
                            <td className="py-3 font-mono">
                              <span className={`inline-flex items-center gap-1 font-bold ${
                                mainWinner ? "text-emerald-400" : "text-slate-100"
                              }`}>
                                {mainScorecard[row.key]}%
                                {mainWinner && <Crown className="w-3 h-3 text-emerald-400" />}
                              </span>
                            </td>
                            {activeCards.map((card) => {
                              const isWinner = getWinner(row.key) === card.url;
                              return (
                                <td key={card.url} className="py-3 font-mono text-slate-400">
                                  <span className={isWinner ? "text-emerald-400 font-semibold" : ""}>
                                    {card[row.key]}%
                                    {isWinner && <Crown className="w-3 h-3 text-emerald-400 inline ml-0.5" />}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technical features list */}
              <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
                <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Audit Specifications
                </h4>
                <div className="space-y-4">
                  {[
                    { label: "Word Count", value: (c: CompetitorScorecard) => `${c.wordCount.toLocaleString()} words` },
                    { label: "Latency (ms)", value: (c: CompetitorScorecard) => `${c.responseTimeMs} ms` },
                    { label: "Page Load (ms)", value: (c: CompetitorScorecard) => `${c.loadTimeMs} ms` },
                    { label: "Schema Org Markup", value: (c: CompetitorScorecard) => c.hasSchema ? "Active" : "Missing", isBoolean: true },
                    { label: "CSP Security Header", value: (c: CompetitorScorecard) => c.hasCsp ? "Yes" : "No", isBoolean: true },
                  ].map((row, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider">{row.label}</span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-ink-900 border border-ink-800 rounded-lg flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 truncate max-w-[80px]">Your site</span>
                          <span className={`font-mono font-bold ${
                            row.isBoolean && row.value(mainScorecard) !== "Missing" && row.value(mainScorecard) !== "No"
                              ? "text-emerald-400"
                              : row.isBoolean
                              ? "text-rose-400"
                              : "text-slate-100"
                          }`}>{row.value(mainScorecard)}</span>
                        </div>
                        {activeCards.slice(0, 1).map((comp) => (
                          <div key={comp.url} className="p-2 bg-ink-900 border border-ink-800 rounded-lg flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{new URL(comp.url).hostname}</span>
                            <span className={`font-mono ${
                              row.isBoolean && row.value(comp) !== "Missing" && row.value(comp) !== "No"
                                ? "text-emerald-400"
                                : row.isBoolean
                                ? "text-slate-500"
                                : "text-slate-300"
                            }`}>{row.value(comp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "keywords" && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Opportunities list */}
              <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
                <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <Key className="w-4 h-4 text-cyan-400" />
                  Keyword Opportunities
                </h4>
                <p className="text-xs text-slate-400">
                  Target keywords that competitors rank for or use frequently in their body copy, but your website is currently missing.
                </p>

                <div className="space-y-2.5 max-h-[400px] overflow-y-auto scrollbar-thin">
                  {keywordGaps.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No keyword gaps detected vs analysed competitors.
                    </div>
                  ) : (
                    keywordGaps.map((gap, idx) => (
                      <div key={idx} className="p-3 bg-ink-900 border border-ink-800 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-cyan-400 font-mono">"{gap.word}"</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Found on: {gap.domain}</p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xs font-semibold text-slate-300">{gap.count} times</span>
                          <span className="block text-[10px] text-slate-500">Density: {gap.density}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Share keywords */}
              <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
                <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Keyword Parity (Common Keywords)
                </h4>
                <p className="text-xs text-slate-400">
                  Semantic keywords shared between your landing page and competitor websites. Optimize densities to rank.
                </p>

                <div className="space-y-2.5">
                  {(mainScorecard.topKeywords || []).slice(0, 8).map((kw) => {
                    const competitorMatches = activeCards.map((c) => {
                      const match = (c.topKeywords || []).find((ck) => ck.word.toLowerCase() === kw.word.toLowerCase());
                      return { domain: new URL(c.url).hostname, match };
                    });

                    return (
                      <div key={kw.word} className="p-3 bg-ink-900 border border-ink-850 rounded-xl space-y-2">
                        <div className="flex justify-between items-center border-b border-ink-850 pb-1.5">
                          <span className="text-xs font-mono font-bold text-slate-100">"{kw.word}"</span>
                          <span className="text-[10px] text-slate-500 font-mono">Your site: {kw.count}x ({kw.density}%)</span>
                        </div>
                        <div className="space-y-1">
                          {competitorMatches.map((m, idx) => (
                            <div key={idx} className="flex justify-between text-[10px] text-slate-500">
                              <span>{m.domain}</span>
                              <span className="font-mono">
                                {m.match ? `${m.match.count}x (${m.match.density}%)` : "Not found"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "outlines" && (
            <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Side-by-Side Outline Hierarchy
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Select Competitor:</span>
                  <select
                    value={selectedCompOutlineUrl}
                    onChange={(e) => setSelectedCompOutlineUrl(e.target.value)}
                    className="bg-ink-900 border border-ink-700 text-slate-300 rounded px-2 py-1 text-xs"
                  >
                    {activeCards.map((card) => (
                      <option key={card.url} value={card.url}>
                        {new URL(card.url).hostname}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-2">
                {/* Main Site Outline */}
                <div className="space-y-3">
                  <div className="p-3 bg-ink-900 border border-ink-800 rounded-xl">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Your Website Outline</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1 truncate">{mainScorecard.title || "No Title tag"}</p>
                  </div>
                  <div className="p-4 bg-ink-900/40 border border-ink-850 rounded-xl max-h-[300px] overflow-y-auto scrollbar-thin space-y-2">
                    {(!mainScorecard.headings || mainScorecard.headings.length === 0) ? (
                      <p className="text-xs text-slate-500">No headings tags extracted.</p>
                    ) : (
                      mainScorecard.headings.map((h, i) => (
                        <div key={i} className={`text-xs ${
                          h.level === 1 ? "font-bold text-slate-200" : h.level === 2 ? "pl-3 text-slate-400 font-medium" : "pl-6 text-slate-500"
                        }`}>
                          H{h.level} &mdash; {h.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Competitor Outline */}
                {selectedCompOutline && (
                  <div className="space-y-3">
                    <div className="p-3 bg-ink-900 border border-ink-800 rounded-xl">
                      <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                        {new URL(selectedCompOutline.url).hostname} Outline
                      </span>
                      <p className="text-xs text-slate-300 font-semibold mt-1 truncate">{selectedCompOutline.title || "No Title tag"}</p>
                    </div>
                    <div className="p-4 bg-ink-900/40 border border-ink-850 rounded-xl max-h-[300px] overflow-y-auto scrollbar-thin space-y-2">
                      {(!selectedCompOutline.headings || selectedCompOutline.headings.length === 0) ? (
                        <p className="text-xs text-slate-500">No headings tags extracted.</p>
                      ) : (
                        selectedCompOutline.headings.map((h, i) => (
                          <div key={i} className={`text-xs ${
                            h.level === 1 ? "font-bold text-slate-200" : h.level === 2 ? "pl-3 text-slate-400 font-medium" : "pl-6 text-slate-500"
                          }`}>
                            H{h.level} &mdash; {h.text}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "gaps" && (
            <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
              <h4 className="font-display font-semibold text-slate-100 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Gap & Competitor Analysis Tasks
              </h4>
              <p className="text-xs text-slate-400">
                Actionable fixes generated by comparing your site structures against analyzed competitor profiles.
              </p>

              <div className="space-y-3 pt-2">
                {gapAnalysisList.map((gap, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex gap-3.5 items-start ${
                      gap.type === "warning"
                        ? "bg-rose-500/5 border-rose-500/20 text-rose-300"
                        : gap.type === "success"
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                        : "bg-cyan-500/5 border-cyan-500/20 text-cyan-300"
                    }`}
                  >
                    <div className="mt-0.5">
                      {gap.type === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-200">{gap.title}</div>
                      <p className="text-[11px] text-slate-400 leading-normal mt-1">{gap.desc}</p>
                    </div>
                  </div>
                ))}

                {keywordGaps.slice(0, 3).map((gap, idx) => (
                  <div key={idx} className="p-4 bg-ink-900 border border-ink-800 rounded-xl flex gap-3.5 items-start">
                    <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-xs text-slate-200">Integrate keyword "{gap.word}"</div>
                      <p className="text-[11px] text-slate-400 leading-normal mt-1">
                        Tracked competitor {gap.domain} places this keyword {gap.count} times ({gap.density}% density). Consider writing sections containing this keyword to establish content parity.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
