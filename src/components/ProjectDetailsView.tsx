import { useState, useEffect } from "react";
import { Plus, Globe, Play, Trash2, Loader2, Clock, Lock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { Project, WebsiteAudit } from "../types";
import { ScoreTrendChart } from "./ScoreTrendChart";
import { CompetitorPanel } from "./CompetitorPanel";
import { HistoryRegressionPanel } from "./HistoryRegressionPanel";
import { KeywordIntelligence } from "./KeywordIntelligence";
import { HistoricalAuditList } from "./HistoricalAuditList";
import { getTierLimits } from "../lib/subscription";
import { UpgradeModal } from "./UpgradeModal";

interface ProjectDetailsViewProps {
  onSelectAudit: (audit: WebsiteAudit) => void;
  onRunAudit: (url: string, projectId: string, siteWide?: boolean) => Promise<void>;
  loading: boolean;
}

export function ProjectDetailsView({
  onSelectAudit,
  onRunAudit,
  loading,
}: ProjectDetailsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDomain, setNewProjectDomain] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monitorInterval, setMonitorInterval] = useState<"manual" | "daily" | "weekly" | "monthly">("manual");
  const [activeTab, setActiveTab] = useState<"history" | "competitors" | "keywords">("history");
  const [siteWide, setSiteWide] = useState(false);

  const [userTier, setUserTier] = useState<string>("free");
  const [userId, setUserId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const limits = getTierLimits(userTier);

  // Fetch user profile tier
  useEffect(() => {
    (async () => {
      if (isSupabaseConfigured) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
            const { data } = await supabase
              .from("user_profiles")
              .select("subscription_tier")
              .eq("user_id", user.id)
              .maybeSingle();

            if (data?.subscription_tier) {
              setUserTier(data.subscription_tier);
            }
          }
        } catch (err) {
          console.error("Failed to load user tier:", err);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      const saved = localStorage.getItem(`monitor_interval_${selectedProjectId}`);
      setMonitorInterval((saved as any) || "manual");
    }
  }, [selectedProjectId]);

  const handleScheduleChange = (val: "manual" | "daily" | "weekly" | "monthly") => {
    if (val !== "manual" && userTier === "free") {
      setUpgradeReason("Automated recurring monitoring schedules require a Pro or Agency subscription.");
      setShowUpgradeModal(true);
      return;
    }
    setMonitorInterval(val);
    if (selectedProjectId) {
      localStorage.setItem(`monitor_interval_${selectedProjectId}`, val);
    }
  };

  const getNextRunText = () => {
    if (monitorInterval === "manual") return "Continuous monitoring paused. Crawl on demand only.";
    const now = new Date();
    if (monitorInterval === "daily") {
      now.setDate(now.getDate() + 1);
      return `Next auto-crawl: Tomorrow at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (monitorInterval === "weekly") {
      now.setDate(now.getDate() + 7);
      return `Next auto-crawl: ${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (monitorInterval === "monthly") {
      now.setDate(now.getDate() + 30);
      return `Next auto-crawl: ${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return "";
  };

  // Fetch Projects
  const fetchProjects = async () => {
    try {
      const { data, error: err } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  };

  // Fetch Audits for Selected Project
  const fetchAudits = async (projectId: string) => {
    try {
      const { data, error: err } = await supabase
        .from("website_audits")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setAudits(data || []);
    } catch (err) {
      console.error("Failed to fetch audits:", err);
    }
  };

  const handleDeleteAudits = async (auditIds: string[]) => {
    try {
      if (isSupabaseConfigured) {
        const { error: err } = await supabase
          .from("website_audits")
          .delete()
          .in("id", auditIds);
        if (err) throw err;
      }
      setAudits((prev) => prev.filter((a) => !auditIds.includes(a.id)));
    } catch (err) {
      console.error("Failed to delete audit records:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchAudits(selectedProjectId);
    } else {
      setAudits([]);
    }
  }, [selectedProjectId]);

  const handleOpenAddModal = () => {
    if (projects.length >= limits.maxProjects) {
      setUpgradeReason(`Your ${userTier.toUpperCase()} tier allows up to ${limits.maxProjects} project${limits.maxProjects > 1 ? "s" : ""}. Upgrade for more capacity.`);
      setShowUpgradeModal(true);
      return;
    }
    setShowAddModal(true);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let domain = newProjectDomain.trim().toLowerCase();
    if (!domain) return;

    // Normalize domain
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthenticated user");

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: newProjectName.trim() || domain,
          domain,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setProjects([data, ...projects]);
      setSelectedProjectId(data.id);
      setShowAddModal(false);
      setNewProjectName("");
      setNewProjectDomain("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project and all its audits?")) return;
    try {
      await supabase.from("projects").delete().eq("id", id);
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      if (selectedProjectId === id) {
        setSelectedProjectId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleToggleSiteWide = (checked: boolean) => {
    if (checked && !limits.canRunSiteWideCrawl) {
      setUpgradeReason("Site-wide multi-page crawling requires a Pro or Agency subscription.");
      setShowUpgradeModal(true);
      return;
    }
    setSiteWide(checked);
  };

  const handleRunAudit = async () => {
    const activeProject = projects.find((p) => p.id === selectedProjectId);
    if (!activeProject) return;

    const targetUrl = `https://${activeProject.domain}`;
    await onRunAudit(targetUrl, activeProject.id, siteWide);
    if (selectedProjectId) {
      fetchAudits(selectedProjectId);
    }
  };

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <>
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Project Selector Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Websites</h3>
            <button
              onClick={handleOpenAddModal}
              className="p-1 rounded-lg bg-ink-800 hover:bg-cyan-500/10 border border-ink-700/60 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-400 transition-all active:scale-95"
              title="Add Website"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {projects.length === 0 ? (
              <div className="text-center py-8 bg-ink-850/20 border border-ink-800/60 rounded-xl p-4">
                <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-40" />
                <p className="text-xs text-slate-500">No websites added yet.</p>
                <button
                  onClick={handleOpenAddModal}
                  className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Track a Website
                </button>
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${selectedProjectId === project.id
                      ? "bg-ink-850/80 border-cyan-500/40 shadow-lg shadow-cyan-950/20 text-slate-100"
                      : "bg-ink-950/40 border-ink-800/40 hover:border-ink-700/60 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <Globe className="w-4 h-4 shrink-0 text-cyan-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-snug">{project.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{project.domain}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Audits & Detail View */}
        <div className="min-w-0 space-y-6">
          {activeProject ? (
            <>
              {/* Project Header */}
              <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-50">{activeProject.name}</h2>
                  <a
                    href={`https://${activeProject.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-mono mt-1 inline-flex items-center gap-1 transition-colors"
                  >
                    {activeProject.domain}
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none mr-2 bg-ink-900/40 p-2 px-3 rounded-xl border border-ink-800 hover:border-ink-755 hover:bg-ink-900/60 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={siteWide}
                      onChange={(e) => handleToggleSiteWide(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer"
                    />
                    <span className="flex items-center gap-1">
                      Complete Site Crawl
                      {!limits.canRunSiteWideCrawl && <Lock className="w-3 h-3 text-cyan-400" />}
                    </span>
                  </label>

                  <button
                    onClick={() => handleDeleteProject(activeProject.id)}
                    className="p-2.5 rounded-xl border border-ink-700/60 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all active:scale-95"
                    title="Delete Website"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRunAudit}
                    disabled={loading}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 disabled:from-ink-800 disabled:to-ink-800 text-ink-950 disabled:text-slate-500 font-semibold text-sm px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 active:scale-95 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Auditing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Run Audit
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Continuous Monitoring Schedule Config */}
              <div className="bg-ink-850/60 glass border border-ink-700 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Continuous Audit Monitoring</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{getNextRunText()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-ink-950 p-1.5 rounded-xl border border-ink-800">
                  {(["manual", "daily", "weekly", "monthly"] as const).map((interval) => (
                    <button
                      key={interval}
                      onClick={() => handleScheduleChange(interval)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${monitorInterval === interval
                          ? "bg-cyan-500 text-ink-950 shadow-md font-bold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-ink-900/40"
                        }`}
                    >
                      {interval === "manual" ? "Paused" : interval}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Swapping Header */}
              <div className="flex border-b border-ink-800">
                <button
                  onClick={() => setActiveTab("history")}
                  className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${activeTab === "history"
                      ? "border-cyan-500 text-cyan-400 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Audit Records & Trends
                </button>
                <button
                  onClick={() => setActiveTab("competitors")}
                  className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${activeTab === "competitors"
                      ? "border-cyan-500 text-cyan-400 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Competitor Intelligence
                </button>
                <button
                  onClick={() => setActiveTab("keywords")}
                  className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${activeTab === "keywords"
                      ? "border-cyan-500 text-cyan-400 font-bold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Keyword Intelligence
                </button>
              </div>

              {activeTab === "history" ? (
                <>
                  {/* Score History Trends */}
                  {audits.length > 1 && (
                    <ScoreTrendChart audits={audits} />
                  )}

                  {/* Regression Detector */}
                  {audits.length > 1 && (
                    <HistoryRegressionPanel audits={audits} />
                  )}

                  {/* Audits List */}
                  <HistoricalAuditList
                    audits={audits}
                    onSelectAudit={onSelectAudit}
                    onDeleteAudits={handleDeleteAudits}
                    emptyMessage='No audits performed yet. Click "Run Audit" above to launch the first check.'
                  />
                </>
              ) : activeTab === "competitors" ? (
                <CompetitorPanel projectId={activeProject.id} latestAudit={audits[0] || null} />
              ) : (
                <KeywordIntelligence project={activeProject} />
              )}
            </>
          ) : (
            <div className="bg-ink-850/40 glass border border-ink-700/50 rounded-2xl p-12 text-center">
              <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-40 animate-pulse-soft" />
              <h2 className="text-lg font-display font-semibold text-slate-200">Start tracking website quality</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Add your domain name or website to SentinelQA to configure automated checks, audits, and health dashboards.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-semibold px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 active:scale-95"
              >
                Add Your First Site
              </button>
            </div>
          )}
        </div>

        {/* Add Project Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm no-print">
            <div className="bg-ink-850 border border-ink-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <h3 className="text-lg font-display font-bold text-slate-100 mb-2">Track a Website</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Enter your website domain to configure active quality tracking (SEO, accessibility checks, security standards, loading performance).
              </p>

              {error && (
                <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleAddProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Portfolio"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-ink-900 border border-ink-700 rounded-xl text-sm text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Website Domain
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. example.com"
                    value={newProjectDomain}
                    onChange={(e) => setNewProjectDomain(e.target.value)}
                    className="w-full px-4 py-2.5 bg-ink-900 border border-ink-700 rounded-xl text-sm text-slate-100 outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 text-ink-950 font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all active:scale-95"
                  >
                    Add Website
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userId={userId}
        reason={upgradeReason}
      />
    </>
  );
}
