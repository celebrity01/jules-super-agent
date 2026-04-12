"use client";

import { useState, useEffect, useCallback } from "react";
import { JulesSource, JulesSession, listSources, listSessions } from "@/lib/jules-client";
import { Sidebar } from "@/components/sidebar";
import { SessionDetail } from "@/components/session-detail";
import { NewSessionDialog } from "@/components/new-session-dialog";
import { AddRepoDialog } from "@/components/add-repo-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Zap,
  FolderGit2,
  MessageSquare,
  Settings,
  Bot,
} from "lucide-react";

type SidebarView = "sessions" | "sources" | "settings";

const GITHUB_TOKEN_KEY = "github-token";

interface DashboardProps {
  apiKey: string;
  onDisconnect: () => void;
}

export function Dashboard({ apiKey, onDisconnect }: DashboardProps) {
  const [sources, setSources] = useState<JulesSource[]>([]);
  const [sessions, setSessions] = useState<JulesSession[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [showAddRepoDialog, setShowAddRepoDialog] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>("sessions");
  const [githubToken, setGithubToken] = useState<string | null>(null);

  const maskedKey = `••••••••${apiKey.slice(-4)}`;

  // Load GitHub token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(GITHUB_TOKEN_KEY);
    if (stored) {
      setGithubToken(stored);
    }
  }, []);

  const handleGithubTokenChange = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem(GITHUB_TOKEN_KEY, token);
      setGithubToken(token);
    } else {
      localStorage.removeItem(GITHUB_TOKEN_KEY);
      setGithubToken(null);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    setIsLoadingSources(true);
    try {
      const data = await listSources(apiKey);
      setSources(data.sources || []);
    } catch {
      // Error handled silently; sidebar shows empty state
    } finally {
      setIsLoadingSources(false);
    }
  }, [apiKey]);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await listSessions(apiKey);
      setSessions(data.sessions || []);
    } catch {
      // Error handled silently; sidebar shows empty state
    } finally {
      setIsLoadingSessions(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchSources();
    fetchSessions();
  }, [fetchSources, fetchSessions]);

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
          </div>

          {/* Bottom Icons */}
          <div className="flex flex-col items-center gap-1">
            <NavItem
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              active={activeView === "settings"}
              onClick={() => setActiveView("settings")}
            />
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
          onGitHubTokenChange={handleGithubTokenChange}
          onOpenAddRepo={() => setShowAddRepoDialog(true)}
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
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready to assist</h3>
                <p className="text-sm text-[#94a3b8]">
                  Select a session from the panel or create a new mission to get started with your AI agent.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge
                  className="bg-[rgba(129,140,248,0.08)] text-[#818cf8] border-[rgba(129,140,248,0.15)] hover:bg-[rgba(129,140,248,0.12)] text-xs px-3 py-1"
                >
                  {sessions.length} sessions
                </Badge>
                <Badge
                  className="bg-[rgba(16,185,129,0.08)] text-[#10b981] border-[rgba(16,185,129,0.15)] hover:bg-[rgba(16,185,129,0.12)] text-xs px-3 py-1"
                >
                  {sources.length} sources
                </Badge>
              </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
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
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-[#1a1a2e] text-white border-[rgba(255,255,255,0.06)] text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
