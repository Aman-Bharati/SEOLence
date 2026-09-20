import React, { useState } from "react";
import { Globe, History, LogOut, Menu, X, Sparkles } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface DashboardLayoutProps {
  user: User | null;
  activeTab: "projects" | "history" | "methodology";
  setActiveTab: (tab: "projects" | "history" | "methodology") => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  user,
  activeTab,
  setActiveTab,
  onSignOut,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: "projects", label: "My Websites", icon: Globe },
    { id: "history", label: "All Audit History", icon: History },
  ] as const;

  return (
    <div className="min-h-screen bg-ink-900 text-slate-200 flex relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-ink-950/80 border-r border-ink-800/60 glass shrink-0 relative z-20">
        {/* Brand */}
        <div className="p-6 border-b border-ink-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-ink-950" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-slate-50 leading-none">
              Sentinel<span className="gradient-text">QA</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Web Quality Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                    ? "bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-ink-800/40 border border-transparent"
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Profile / Sign Out */}
        <div className="p-4 border-t border-ink-800/50 bg-ink-950/40">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-ink-800 flex items-center justify-center font-display font-bold text-xs text-slate-300 uppercase">
              {user?.email?.slice(0, 2) || "US"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-500">Developer Plan</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all border border-transparent hover:border-rose-500/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-ink-950 border-r border-ink-800/60 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="p-5 border-b border-ink-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-ink-950" />
            </div>
            <h1 className="font-display font-bold text-base text-slate-50">SentinelQA</h1>
          </div>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                    ? "bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-ink-800/40 border border-transparent"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-ink-800/60">
          <button
            onClick={() => {
              onSignOut();
              setMobileOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Navbar */}
        <header className="h-16 border-b border-ink-800/50 bg-ink-950/20 glass flex items-center justify-between px-6 md:px-8 relative z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-ink-800/40 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>SentinelQA Workspace</span>
              <span>/</span>
              <span className="text-slate-400 capitalize">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-ink-850 border border-ink-800 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              Service Status: Operational
            </span>
          </div>
        </header>

        {/* Dashboard Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
