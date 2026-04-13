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
        <div className="w-14 flex flex-col items-center py-4 border-r border-[rgba(255,255,255,0.04)]" style={{ background: "#08080d" }}>
          {/* Logo */}
          <div className="mb-6">
            <div className="h-9 w-9 rounded-xl bg-gradient-agent flex items-center justify-center shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Nav Icons */}
          <div className="flex flex-col items-center gap-1 flex-1">
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
          <div className="flex flex-col items-center gap-1">
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
          <div className="flex-1 flex flex-col items-center justify-center relative bg-grid-pattern">
            {/* Gradient orb */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
              style={{
                background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
              }}
            />

            <div className="flex flex-col items-center gap-6 max-w-md text-center relative z-10 animate-fade-in-up">
              {/* Agent avatar */}
              <div className="relative">
                <div className="h-24 w-24 rounded-3xl bg-gradient-agent flex items-center justify-center shadow-2xl animate-float">
                  <Bot className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -inset-3 rounded-3xl bg-gradient-agent opacity-15 animate-pulse-ring" />
                {/* Supabase badge */}
                {supabaseUser && (
                  <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center border-2 border-[#0a0a0f] shadow-md">
                    <Database className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready to assist</h3>
                <p className="text-sm text-[#94a3b8]">
                  {supabaseUser
                    ? `Welcome back, ${supabaseUser.email?.split("@")[0] || "Agent"}. Select a session or create a new mission.`
                    : "Select a session from the panel or create a new mission to get started with your AI agent."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge className="bg-[rgba(129,140,248,0.08)] text-[#818cf8] border-[rgba(129,140,248,0.15)] hover:bg-[rgba(129,140,248,0.12)] text-xs px-3 py-1">
                  {sessions.length} sessions
                </Badge>
                <Badge className="bg-[rgba(16,185,129,0.08)] text-[#10b981] border-[rgba(16,185,129,0.15)] hover:bg-[rgba(16,185,129,0.12)] text-xs px-3 py-1">
                  {sources.length} sources
                </Badge>
                {supabaseUser && (
                  <Badge className="bg-[rgba(245,158,11,0.08)] text-[#f59e0b] border-[rgba(245,158,11,0.15)] hover:bg-[rgba(245,158,11,0.12)] text-xs px-3 py-1">
                    {savedSessions.length} saved
                  </Badge>
                )}
              </div>

              {/* Supabase status */}
              {supabaseUser && !renderApiKey && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.08)]">
                  <div className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                  <span className="text-[11px] text-[#10b981] font-medium">Supabase synced — data persists across sessions</span>
                </div>
              )}

              {/* Service Mesh — all 3 connected */}
              {supabasePAT && renderApiKey && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[rgba(129,140,248,0.04)] border border-[rgba(129,140,248,0.1)]">
                    <Network className="h-4 w-4 text-[#818cf8]" />
                    <span className="text-[11px] text-[#818cf8] font-semibold">Service Mesh Active</span>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-[#818cf8]" />
                        <span className="text-[9px] text-[#818cf8]">Jules</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-[#10b981]" />
                        <span className="text-[9px] text-[#10b981]">Supabase</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-[#ff6b35]" />
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
              ? "bg-[rgba(129,140,248,0.12)] text-[#818cf8]"
              : "text-[#64748b] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.04)]"
          }`}
        >
          {active && (
            <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[#818cf8]" />
          )}
          {icon}
          {indicator && (
            <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#08080d] ${
              indicator === "green" ? "bg-[#10b981]" : "bg-[#f59e0b]"
            }`} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-[#1a1a2e] text-white border-[rgba(255,255,255,0.06)] text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
