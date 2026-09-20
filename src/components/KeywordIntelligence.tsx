import { useState, useEffect } from "react";
import { Search, Globe, MapPin, Sparkles, Plus, Clock, FileText, CheckCircle2, AlertCircle, Loader2, Award, List, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Project } from "../types";

interface KeywordTarget {
  id: string;
  keyword: string;
  country: string;
  location: string;
  language: string;
  device: string;
  created_at: string;
  keyword_analysis_jobs?: {
    id: string;
    status: string;
    created_at: string;
    ranking_observations?: {
      observed_position: number | null;
    }[];
  }[];
}

interface KeywordJob {
  id: string;
  keyword_target_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

interface RankingObservation {
  id: string;
  observed_position: number | null;
  relevant_page_url: string | null;
  search_intent: string;
  ranking_opportunity: string;
  created_at: string;
}

interface SerpResult {
  id: string;
  position: number;
  url: string;
  domain: string;
  title: string;
  snippet: string | null;
}

interface KeywordIntelligenceProps {
  project: Project;
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "hi", name: "Hindi" },
];

export function KeywordIntelligence({ project }: KeywordIntelligenceProps) {
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("US");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("en");
  const [device, setDevice] = useState("desktop");
  
  const [targets, setTargets] = useState<KeywordTarget[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  
  // Job and observation results
  const [loading, setLoading] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<KeywordJob | null>(null);
  const [observation, setObservation] = useState<RankingObservation | null>(null);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch existing target keywords for the project
  const fetchTargets = async () => {
    try {
      const { data, error: err } = await supabase
        .from("keyword_targets")
        .select(`
          *,
          keyword_analysis_jobs (
            id,
            status,
            created_at,
            ranking_observations (
              observed_position
            )
          )
        `)
        .eq("project_id", project.id)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setTargets(data || []);
      
      // Auto-select first target if none is selected
      if (data && data.length > 0 && !selectedTargetId) {
        setSelectedTargetId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch targets:", err);
    }
  };

  const handleDeleteTarget = async (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this keyword target and all its observation history?")) return;

    try {
      const { error: deleteErr } = await supabase
        .from("keyword_targets")
        .delete()
        .eq("id", targetId);

      if (deleteErr) throw deleteErr;

      setSuccess("Keyword target deleted successfully.");
      if (selectedTargetId === targetId) {
        setSelectedTargetId(null);
      }
      await fetchTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete keyword target.");
    }
  };

  // Fetch analysis results for selected target
  const fetchAnalysisResults = async (targetId: string) => {
    try {
      // 1. Get latest job for target
      const { data: job, error: jobErr } = await supabase
        .from("keyword_analysis_jobs")
        .select("*")
        .eq("keyword_target_id", targetId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (jobErr) throw jobErr;
      
      setActiveJob(job);
      setObservation(null);
      setSerpResults([]);

      if (!job) return;

      if (job.status === "completed") {
        // 2. Fetch ranking observation
        const { data: obs, error: obsErr } = await supabase
          .from("ranking_observations")
          .select("*")
          .eq("job_id", job.id)
          .maybeSingle();

        if (obsErr) throw obsErr;
        setObservation(obs);

        // 3. Fetch SERP snapshot
        const { data: snapshot, error: snapErr } = await supabase
          .from("serp_snapshots")
          .select("id")
          .eq("job_id", job.id)
          .maybeSingle();

        if (snapErr) throw snapErr;

        if (snapshot) {
          // 4. Fetch results list
          const { data: results, error: resErr } = await supabase
            .from("serp_results")
            .select("*")
            .eq("snapshot_id", snapshot.id)
            .order("position", { ascending: true });

          if (resErr) throw resErr;
          setSerpResults(results || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch analysis details:", err);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [project.id]);

  useEffect(() => {
    if (selectedTargetId) {
      fetchAnalysisResults(selectedTargetId);
    } else {
      setActiveJob(null);
      setObservation(null);
      setSerpResults([]);
    }
  }, [selectedTargetId]);

  // Polling loop for active jobs
  useEffect(() => {
    if (!pollingJobId) return;

    const interval = setInterval(async () => {
      try {
        const { data: job, error: jobErr } = await supabase
          .from("keyword_analysis_jobs")
          .select("*")
          .eq("id", pollingJobId)
          .single();

        if (jobErr) throw jobErr;

        if (job) {
          setActiveJob(job);
          if (job.status === "completed" || job.status === "failed") {
            setPollingJobId(null);
            setLoading(false);
            if (selectedTargetId) {
              await fetchAnalysisResults(selectedTargetId);
            }
          }
        }
      } catch (err) {
        console.error("Polling failed:", err);
        setPollingJobId(null);
        setLoading(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingJobId, selectedTargetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setError("Please enter a target keyword.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setActiveJob(null);
    setObservation(null);
    setSerpResults([]);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("You must be logged in to configure keyword targets.");
      }

      // 1. Insert target configurations
      const { data: target, error: targetError } = await supabase
        .from("keyword_targets")
        .insert({
          project_id: project.id,
          user_id: userData.user.id,
          keyword: keyword.trim(),
          country,
          location: location.trim(),
          language,
          device,
        })
        .select()
        .single();

      if (targetError) {
        if (targetError.code === "23505") {
          throw new Error("This keyword target with the same search context is already configured.");
        }
        throw targetError;
      }

      // 2. Insert pending execution job
      const { data: job, error: jobError } = await supabase
        .from("keyword_analysis_jobs")
        .insert({
          keyword_target_id: target.id,
          status: "pending",
        })
        .select()
        .single();

      if (jobError || !job) throw jobError || new Error("Job registration failed.");

      // 3. Select target in UI list
      setSelectedTargetId(target.id);
      await fetchTargets();

      // 4. Trigger backend Edge Function
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-seo/analyze-keyword`;
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error status ${res.status}`);
      }

      setSuccess(`Analysis enqueued successfully.`);
      setKeyword("");
      setLocation("");
      setPollingJobId(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger analysis.");
      setLoading(false);
    }
  };

  const handleRerun = async (targetId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setActiveJob(null);
    setObservation(null);
    setSerpResults([]);

    try {
      // 1. Insert pending execution job
      const { data: job, error: jobError } = await supabase
        .from("keyword_analysis_jobs")
        .insert({
          keyword_target_id: targetId,
          status: "pending",
        })
        .select()
        .single();

      if (jobError || !job) throw jobError || new Error("Job registration failed.");

      // 2. Select target in UI list
      setSelectedTargetId(targetId);
      await fetchAnalysisResults(targetId);

      // 3. Trigger backend Edge Function
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-seo/analyze-keyword`;
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error status ${res.status}`);
      }

      setSuccess(`Analysis enqueued successfully.`);
      setPollingJobId(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger analysis.");
      setLoading(false);
      if (selectedTargetId) {
        await fetchAnalysisResults(selectedTargetId);
      }
    }
  };

  const selectedTarget = targets.find(t => t.id === selectedTargetId);

  // Calculate website-wide stats
  const totalKeywords = targets.length;
  let page1Count = 0;
  let page2to5Count = 0;
  let notObservedCount = 0;

  targets.forEach((t) => {
    const sortedJobs = t.keyword_analysis_jobs?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latestJob = sortedJobs?.[0];
    const obs = latestJob?.ranking_observations?.[0];
    const pos = obs?.observed_position;

    if (pos === null || pos === undefined) {
      notObservedCount++;
    } else if (pos <= 10) {
      page1Count++;
    } else if (pos <= 50) {
      page2to5Count++;
    } else {
      notObservedCount++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
        <h3 className="font-display font-semibold text-slate-100 text-lg flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          Keyword Ranking Intelligence
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Track observed positions and view actual search engine results lists (SERP) dynamically configured for device and country filters.
        </p>
      </div>

      {/* Website-Wide Insights Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Tracked</span>
          <span className="text-2xl font-display font-bold text-slate-100 mt-1">{totalKeywords}</span>
        </div>
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Page 1 (#1-10)</span>
          <span className="text-2xl font-display font-bold text-emerald-400 mt-1">{page1Count}</span>
        </div>
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Page 2-5 (#11-50)</span>
          <span className="text-2xl font-display font-bold text-cyan-400 mt-1">{page2to5Count}</span>
        </div>
        <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Not Observed</span>
          <span className="text-2xl font-display font-bold text-rose-400 mt-1">{notObservedCount}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Target config form */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-cyan-400" />
              Configure SERP Observation
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">
                  Target Keyword
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. app development company"
                  className="w-full bg-ink-950/60 border border-ink-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-ink-950/60 border border-ink-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-ink-950/60 border border-ink-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">
                  Specific Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Mumbai, New York"
                    className="w-full bg-ink-950/60 border border-ink-700 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">
                  Device
                </label>
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="w-full bg-ink-950/60 border border-ink-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400/50 transition-colors"
                >
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2 items-start text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2 items-start text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-ink-950 font-display font-semibold text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyze Keyword
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Targets List */}
          <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
            <h4 className="font-display font-semibold text-slate-200 text-sm mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              Observed Keywords
            </h4>

            {targets.length === 0 ? (
              <p className="text-xs text-slate-500">No keyword targets configured yet.</p>
            ) : (
              <div className="space-y-2">
                {targets.map((t) => {
                  const sortedJobs = t.keyword_analysis_jobs?.sort((a: any, b: any) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                  const latestJob = sortedJobs?.[0];
                  const obs = latestJob?.ranking_observations?.[0];
                  const pos = obs?.observed_position;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (!loading) setSelectedTargetId(t.id);
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedTargetId === t.id
                          ? "bg-ink-850/80 border-cyan-500/40 shadow-lg text-slate-100"
                          : "bg-ink-950/40 border-ink-800/40 hover:border-ink-700/60 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{t.keyword}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5 uppercase font-mono">
                          {t.country} / {t.device} {t.location && `(${t.location})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          pos !== null && pos !== undefined
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                        }`}>
                          {pos !== null && pos !== undefined ? `#${pos}` : "N/A"}
                        </span>
                        <button
                          onClick={(e) => handleDeleteTarget(t.id, e)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors"
                          title="Delete keyword"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Dashboard Report Panel */}
        <div className="lg:col-span-2 space-y-6">
          {activeJob && activeJob.status !== "completed" && activeJob.status !== "failed" ? (
            <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
              <h4 className="text-slate-200 font-semibold text-sm">Analyzing Search Engine Rankings</h4>
              <p className="text-xs text-slate-500 mt-2">
                Job status: <strong className="text-cyan-400 capitalize">{activeJob.status}</strong>. Fetching live Google SERP context...
              </p>
            </div>
          ) : activeJob && activeJob.status === "failed" ? (
            <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 space-y-4">
              <div className="flex gap-3 items-start bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">SERP Observation Failed</h4>
                  <p className="text-xs mt-1 text-rose-300">
                    {activeJob.error || "Upstream provider connection error or search request timed out."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => selectedTarget && handleRerun(selectedTarget.id)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Retry Analysis</span>
              </button>
            </div>
          ) : selectedTarget && activeJob?.status === "completed" ? (
            <>
              {/* Position Card */}
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Current Observed Position</h5>
                    <p className="text-2xl font-display font-bold text-slate-100 mt-1">
                      {observation?.observed_position !== null && observation?.observed_position !== undefined
                        ? `#${observation.observed_position}`
                        : "Not observed"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Checked depth: 100 organic positions
                    </p>
                  </div>
                </div>

                <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Search Context Target</h5>
                      <p className="text-sm font-semibold text-slate-200 mt-1 truncate max-w-[150px]">
                        {selectedTarget.keyword}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 capitalize">
                        Device: {selectedTarget.device} | Region: {selectedTarget.country}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRerun(selectedTarget.id)}
                    disabled={loading}
                    className="p-2.5 rounded-xl border border-ink-700 hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-400 hover:text-cyan-400 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                    title="Refresh Analysis"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Observed URL Alert */}
              {observation?.relevant_page_url && (
                <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-4 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Observed Ranking Page URL:</span>
                  <a
                    href={observation.relevant_page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-cyan-400 hover:underline truncate max-w-[320px]"
                  >
                    {observation.relevant_page_url}
                  </a>
                </div>
              )}

              {/* Results table */}
              <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6">
                <h4 className="font-display font-semibold text-slate-200 text-sm mb-4 flex items-center gap-1.5">
                  <List className="w-4 h-4 text-cyan-400" />
                  Organic SERP Snapshot Ranks
                </h4>

                {serpResults.length === 0 ? (
                  <p className="text-xs text-slate-500">No organic results stored for this snap.</p>
                ) : (
                  <div className="space-y-4">
                    {serpResults.map((result) => {
                      const isUserMatch = observation?.relevant_page_url === result.url;
                      return (
                        <div
                          key={result.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isUserMatch
                              ? "bg-cyan-500/10 border-cyan-500/30"
                              : "bg-ink-900/30 border-ink-800/80"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-sm font-mono font-bold text-slate-400 mt-0.5">
                                #{result.position}
                              </span>
                              <div className="min-w-0">
                                <h5 className="text-xs font-semibold text-slate-200 leading-snug">
                                  {result.title}
                                </h5>
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-slate-500 hover:text-cyan-400 truncate block mt-0.5 font-mono"
                                >
                                  {result.url}
                                </a>
                              </div>
                            </div>
                            {isUserMatch && (
                              <span className="shrink-0 inline-flex items-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/20">
                                Your Site
                              </span>
                            )}
                          </div>
                          {result.snippet && (
                            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                              {result.snippet}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-ink-850/40 glass border border-ink-700/50 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 text-slate-700 mb-4 opacity-40" />
              <h4 className="text-slate-200 font-semibold text-sm">No Keyword Selected</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Add target keywords on the left or select a keyword from the list to view its observed SERP snapshots.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
