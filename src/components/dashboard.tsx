"use client";

import { useState, useEffect, useCallback } from "react";
import { JulesSource, JulesSession, listSources, listSessions } from "@/lib/jules-client";
import { Sidebar } from "@/components/sidebar";
import { SessionDetail } from "@/components/session-detail";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { AddRepoDialog } from "@/components/add-repo-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSupabaseClient, getSupabaseConfig } from "@/lib/supabase-client";
import {
  loadSavedSessions,
  saveSession,
  subscribeToSessionUpdates,
  type SavedSession,
} from "@/lib/supabase-data";
import type { User } from "@supabase/supabase-js";
import {
  Zap,
  FolderGit2,
  MessageSquare,
  Settings,
  Bot,
  Database,
  User as UserIcon,
  LogOut,
  Bookmark,
  Cloud,
  Network,
} from "lucide-react";

type SidebarView = "sessions" | "sources" | "settings" | "bookmarks" | "supabase" | "render";

interface DashboardProps {
  apiKey: string;
  onDisconnect: () => void;
  githubToken: string | null;
  onGithubTokenChange: (token: string | null) => void;
  supabaseUser: User | null;
  supabasePAT: string | null;
  onSupabasePATChange: (pat: string | null) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onResetSupabase: () => void;
  renderApiKey: string | null;
  onRenderApiKeyChange: (key: string | null) => void;
}

export function Dashboard({
  apiKey,
  onDisconnect,
  githubToken,
  onGithubTokenChange,
  supabaseUser,
  supabasePAT,
  onSupabasePATChange,
  onSignIn,
  onSignOut,
  onResetSupabase,
  renderApiKey,
  onRenderApiKeyChange,
}: DashboardProps) {
  const [sources, setSources] = useState<JulesSource[]>([]);
  const [sessions, setSessions] = useState<JulesSession[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [showAddRepoDialog, setShowAddRepoDialog] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("sessions");

  // Cross-service: Supabase projects for cross-service actions
  const [supabaseProjects, setSupabaseProjects] = useState<Array<{ ref: string; name: string; status: string }>>([]);

  useEffect(() => {
    if (!supabasePAT) { setSupabaseProjects([]); return; }
    let cancelled = false;
    import("@/lib/supabase-management").then(({ listProjects }) =>
      listProjects(supabasePAT)
        .then((projects) => { if (!cancelled) setSupabaseProjects(projects.map((p: { ref: string; name: string; status: string }) => ({ ref: p.ref, name: p.name, status: p.status }))); })
        .catch(() => { if (!cancelled) setSupabaseProjects([]); })
    );
    return () => { cancelled = true; };
  }, [supabasePAT]);

  const maskedKey = `••••••••${apiKey.slice(-4)}`;

  const fetchSources = useCallback(async () => {
    setIsLoadingSources(true);
    try {
      const data = await listSources(apiKey);
      setSources(data.sources || []);
    } catch {
      // Error handled silently
    } finally {
      setIsLoadingSources(false);
    }
  }, [apiKey]);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await listSessions(apiKey);
      setSessions(data.sessions || []);

      // Auto-save sessions to Supabase if logged in
      if (supabaseUser && data.sessions) {
        for (const session of data.sessions) {
          const sessionId = session.name.split("/").pop() || session.name;
          try {
            await saveSession(supabaseUser.id, sessionId, {
              sessionTitle: session.title || undefined,
              sessionState: session.state || undefined,
              sourceName: session.sourceContext?.source?.replace("sources/", "") || undefined,
              prompt: session.prompt || undefined,
            });
          } catch {
            // Silently fail — Supabase tables may not be set up
          }
        }

        // Reload saved sessions
        try {
          const saved = await loadSavedSessions(supabaseUser.id);
          setSavedSessions(saved);
        } catch {
          // Silently fail
        }
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoadingSessions(false);
    }
  }, [apiKey, supabaseUser]);

  useEffect(() => {
    fetchSources();
    fetchSessions();
  }, [fetchSources, fetchSessions]);

  // Subscribe to realtime updates if Supabase is configured
  useEffect(() => {
    if (!supabaseUser) return;

    const unsubscribe = subscribeToSessionUpdates(
      supabaseUser.id,
      (updatedSession) => {
        setSavedSessions((prev) =>
          prev.map((s) =>
            s.session_id === updatedSession.session_id ? updatedSession : s
          )
        );
      },
      (deletedSessionId) => {
        setSavedSessions((prev) =>
          prev.filter((s) => s.session_id !== deletedSessionId)
        );
      }
    );

    // Load saved sessions
    loadSavedSessions(supabaseUser.id)
      .then(setSavedSessions)
      .catch(() => {});

    return unsubscribe;
  }, [supabaseUser]);

  const handleRefresh = () => {
    fetchSources();
    fetchSessions();
  };

  const handleSessionCreated = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    fetchSessions();
  };

  const handleRepoCreated = () => {
    fetchSources();
  };

  return (
    <div className="h-screen flex" style={{ background: "#0a0a0f" }}>
      <TooltipProvider delayDuration={300}>
        {/* Column 1: Icon Rail */}
        <div className="w-[60px] flex flex-col items-center py-4 border-r border-[rgba(255,255,255,0.04)] icon-rail-bg">
          {/* Logo */}
          <div className="mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-agent flex items-center justify-center shadow-lg" style={{ boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)" }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -inset-1 rounded-xl bg-gradient-agent opacity-0 hover:opacity-15 transition-opacity duration-300" style={{ boxShadow: "0 0 24px rgba(129, 140, 248, 0.2)" }} />
          </div>

          {/* Nav Icons */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <NavItem
              icon={<MessageSquare className="h-5 w-5" />}
              label="Sessions"
              active={activeView === "sessions"}
              onClick={() => setActiveView("sessions")}
            />
            <NavItem
              icon={<FolderGit2 className="h-5 w-5" />}
              label="Sources"
              active={activeView === "sources"}
              onClick={() => setActiveView("sources")}
            />
            {/* Bookmarks — only show when Supabase is connected */}
            {supabaseUser && (
              <NavItem
                icon={<Bookmark className="h-5 w-5" />}
                label="Bookmarks"
                active={activeView === "bookmarks"}
                onClick={() => setActiveView("bookmarks")}
              />
            )}
            {/* Supabase */}
            <NavItem
              icon={<Database className="h-5 w-5" />}
              label="Supabase"
              active={activeView === "supabase"}
              onClick={() => setActiveView("supabase")}
              indicator={supabasePAT || getSupabaseConfig() ? "green" : undefined}
            />
            {/* Render */}
            <NavItem
              icon={<Cloud className="h-5 w-5" />}
              label="Render"
              active={activeView === "render"}
              onClick={() => setActiveView("render")}
              indicator={renderApiKey ? "green" : undefined}
            />
          </div>

          {/* Bottom Icons */}
          <div className="flex flex-col items-center gap-2">
            <NavItem
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              active={activeView === "settings"}
              onClick={() => setActiveView("settings")}
            />
            {/* User avatar */}
            {supabaseUser ? (
              <NavItem
                icon={
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-[9px] font-bold text-white overflow-hidden">
                    {(supabaseUser.email || "U")[0].toUpperCase()}
                  </div>
                }
                label={`Signed in as ${supabaseUser.email}`}
                active={false}
                onClick={onSignOut}
              />
            ) : (
              <NavItem
                icon={<UserIcon className="h-5 w-5" />}
                label="Sign In"
                active={false}
                onClick={onSignIn}
              />
            )}
          </div>
        </div>

        {/* Column 2: Sessions Panel */}
        <Sidebar
          sources={sources}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          isLoadingSources={isLoadingSources}
          isLoadingSessions={isLoadingSessions}
          onSelectSession={setSelectedSessionId}
          onNewSession={() => setIsNewSessionOpen(true)}
          onRefresh={handleRefresh}
          onDisconnect={onDisconnect}
          maskedKey={maskedKey}
          activeView={activeView}
          onViewChange={setActiveView}
          githubToken={githubToken}
          onGitHubTokenChange={onGithubTokenChange}
          onOpenAddRepo={() => setShowAddRepoDialog(true)}
          supabaseUser={supabaseUser}
          supabasePAT={supabasePAT}
          onSupabasePATChange={onSupabasePATChange}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          onResetSupabase={onResetSupabase}
          savedSessions={savedSessions}
          renderApiKey={renderApiKey}
          onRenderApiKeyChange={onRenderApiKeyChange}
          supabaseProjects={supabaseProjects}
          julesApiKey={apiKey}
        />

        {/* Column 3: Main Agent View */}
        {selectedSessionId ? (
          <SessionDetail
            sessionId={selectedSessionId}
            apiKey={apiKey}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative bg-grid-animated overflow-hidden">
            {/* Gradient orb */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
              style={{
                background: "radial-gradient(circle, #6366f1 0%, #818cf8 30%, transparent 70%)",
              }}
            />

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
              <div className="particle" />
            </div>

            <div className="flex flex-col items-center gap-6 max-w-md text-center relative z-10 animate-fade-in-up">
              {/* Agent avatar */}
              <div className="relative">
                <div className="h-28 w-28 rounded-3xl bg-gradient-agent flex items-center justify-center shadow-2xl" style={{ boxShadow: "0 8px 40px rgba(99, 102, 241, 0.3)" }}>
                  <Bot className="h-14 w-14 text-white" />
                </div>
                <div className="absolute -inset-3 rounded-3xl bg-gradient-agent opacity-15 animate-pulse-ring" />
                {/* Rotating ring */}
                <div className="absolute -inset-5 rounded-3xl border border-[rgba(129,140,248,0.1)] animate-spin-slow" />
                <div className="absolute -inset-7 rounded-3xl border border-dashed border-[rgba(129,140,248,0.05)]" style={{ animation: "spin-slow 12s linear infinite reverse" }} />
                {/* Supabase badge */}
                {supabaseUser && (
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center border-2 border-[#0a0a0f] shadow-md" style={{ boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)" }}>
                    <Database className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-2 gradient-text">Ready to assist</h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {supabaseUser
                    ? `Welcome back, ${supabaseUser.email?.split("@")[0] || "Agent"}. Select a session or create a new mission.`
                    : "Select a session from the panel or create a new mission to get started with your AI agent."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="badge-refined bg-[rgba(129,140,248,0.08)] text-[#818cf8] border-[rgba(129,140,248,0.15)]">
                  {sessions.length} sessions
                </span>
                <span className="badge-refined bg-[rgba(16,185,129,0.08)] text-[#10b981] border-[rgba(16,185,129,0.15)]">
                  {sources.length} sources
                </span>
                {supabaseUser && (
                  <span className="badge-refined bg-[rgba(245,158,11,0.08)] text-[#f59e0b] border-[rgba(245,158,11,0.15)]">
                    {savedSessions.length} saved
                  </span>
                )}
              </div>

              {/* Supabase status */}
              {supabaseUser && !renderApiKey && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.1)] animate-fade-in">
                  <div className="h-2 w-2 rounded-full bg-[#10b981] animate-subtle-pulse" style={{ boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)" }} />
                  <span className="text-[11px] text-[#10b981] font-medium">Supabase synced — data persists across sessions</span>
                </div>
              )}

              {/* Service Mesh — all 3 connected */}
              {supabasePAT && renderApiKey && (
                <div className="flex flex-col gap-2 w-full animate-smooth-appear">
                  <div className="glass-card-glow flex items-center gap-2 px-3 py-2.5 rounded-lg">
                    <Network className="h-4 w-4 text-[#818cf8]" />
                    <span className="text-[11px] text-[#818cf8] font-semibold">Service Mesh Active</span>
                    <div className="ml-auto flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="connection-dot connection-dot-green h-2 w-2 dot-pulse-1" style={{ background: "#818cf8", boxShadow: "0 0 8px rgba(129, 140, 248, 0.5)" }} />
                        <span className="text-[9px] text-[#818cf8]">Jules</span>
                      </div>
                      <div className="mesh-connection relative h-px w-4" />
                      <div className="flex items-center gap-1.5">
                        <div className="connection-dot connection-dot-green dot-pulse-2" />
                        <span className="text-[9px] text-[#10b981]">Supabase</span>
                      </div>
                      <div className="mesh-connection relative h-px w-4" />
                      <div className="flex items-center gap-1.5">
                        <div className="connection-dot h-2 w-2 dot-pulse-3" style={{ background: "#ff6b35", boxShadow: "0 0 8px rgba(255, 107, 53, 0.5)" }} />
                        <span className="text-[9px] text-[#ff6b35]">Render</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#64748b] text-center">
                    All services connected — Jules can query Supabase and deploy to Render
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </TooltipProvider>

      {/* New Session Dialog */}
      <NewSessionDialog
        open={isNewSessionOpen}
        onOpenChange={setIsNewSessionOpen}
        sources={sources}
        apiKey={apiKey}
        onSessionCreated={handleSessionCreated}
      />

      {/* Add Repository Dialog */}
      <AddRepoDialog
        open={showAddRepoDialog}
        onOpenChange={setShowAddRepoDialog}
        githubToken={githubToken || ""}
        onRepoCreated={handleRepoCreated}
      />
    </div>
  );
}

/* Icon Rail Nav Item */
function NavItem({
  icon,
  label,
  active,
  onClick,
  indicator,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  indicator?: "green" | "yellow";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            active
              ? "bg-[rgba(129,140,248,0.1)] text-[#818cf8] shadow-sm scale-105"
              : "text-[#64748b] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.04)] hover:scale-105"
          }`}
          style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {active && (
            <div className="icon-rail-active-refined" />
          )}
          {icon}
          {indicator && (
            <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#08080d] animate-subtle-pulse ${
              indicator === "green" ? "bg-[#10b981]" : "bg-[#f59e0b]"
            }`} style={indicator === "green" ? { boxShadow: "0 0 6px rgba(16, 185, 129, 0.4)" } : { boxShadow: "0 0 6px rgba(245, 158, 11, 0.4)" }} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-[#1a1a2e] text-white border-[rgba(255,255,255,0.08)] text-xs shadow-xl px-3 py-1.5 rounded-lg">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
