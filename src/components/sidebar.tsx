"use client";

import { JulesSource, JulesSession, getSourceDisplayName, getGitHubUser, GitHubUser } from "@/lib/jules-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  GitBranch,
  MessageSquare,
  Plus,
  RefreshCw,
  FolderGit2,
  LogOut,
  Key,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Settings,
  Zap,
  Github,
  Link2,
  ExternalLink,
  Loader2,
  Unplug,
} from "lucide-react";
import { useState, useEffect } from "react";

type SidebarView = "sessions" | "sources" | "settings";

interface SidebarProps {
  sources: JulesSource[];
  sessions: JulesSession[];
  selectedSessionId: string | null;
  isLoadingSources: boolean;
  isLoadingSessions: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
  maskedKey: string;
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  githubToken: string | null;
  onGitHubTokenChange: (token: string | null) => void;
  onOpenAddRepo: () => void;
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

function getStateConfig(state?: string): { color: string; bg: string; label: string } {
  switch (state) {
    case "COMPLETED":
      return { color: "text-[#10b981]", bg: "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]", label: "Completed" };
    case "FAILED":
      return { color: "text-[#ef4444]", bg: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]", label: "Failed" };
    case "ACTIVE":
    case "RUNNING":
      return { color: "text-[#818cf8]", bg: "bg-[rgba(129,140,248,0.1)] border-[rgba(129,140,248,0.2)]", label: "Running" };
    case "AWAITING_APPROVAL":
      return { color: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]", label: "Awaiting" };
    default:
      return { color: "text-[#64748b]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]", label: "Unknown" };
  }
}

function getStateDotColor(state?: string): string {
  switch (state) {
    case "COMPLETED":
      return "bg-[#10b981]";
    case "FAILED":
      return "bg-[#ef4444]";
    case "ACTIVE":
    case "RUNNING":
      return "bg-[#818cf8]";
    case "AWAITING_APPROVAL":
      return "bg-[#f59e0b]";
    default:
      return "bg-[#64748b]";
  }
}

export function Sidebar({
  sources,
  sessions,
  selectedSessionId,
  isLoadingSources,
  isLoadingSessions,
  onSelectSession,
  onNewSession,
  onRefresh,
  onDisconnect,
  maskedKey,
  activeView,
  githubToken,
  onGitHubTokenChange,
  onOpenAddRepo,
}: SidebarProps) {
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(maskedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-[300px] flex flex-col h-full border-r border-[rgba(255,255,255,0.04)]" style={{ background: "#0c0c14" }}>
      {/* Agent Status Card */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-agent flex items-center justify-center shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Jules Agent</span>
              <div className="flex items-center gap-1">
                <div className="status-dot status-dot-online" />
                <span className="text-[10px] text-[#10b981] font-medium">Online</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
            <Key className="h-3 w-3 text-[#64748b]" />
            <code className="text-[10px] font-mono text-[#64748b] flex-1">{maskedKey}</code>
          </div>
          <button
            onClick={handleCopyKey}
            className="h-7 w-7 rounded-md flex items-center justify-center text-[#64748b] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-[#10b981]" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 dark-scrollbar">
        {activeView === "sessions" && (
          <SessionsView
            sessions={sessions}
            sources={sources}
            selectedSessionId={selectedSessionId}
            isLoadingSessions={isLoadingSessions}
            isLoadingSources={isLoadingSources}
            onSelectSession={onSelectSession}
            onNewSession={onNewSession}
            onRefresh={onRefresh}
            sourcesExpanded={sourcesExpanded}
            onToggleSources={() => setSourcesExpanded(!sourcesExpanded)}
            githubToken={githubToken}
            onOpenAddRepo={onOpenAddRepo}
          />
        )}
        {activeView === "sources" && (
          <SourcesView
            sources={sources}
            isLoadingSources={isLoadingSources}
            onRefresh={onRefresh}
            githubToken={githubToken}
            onOpenAddRepo={onOpenAddRepo}
          />
        )}
        {activeView === "settings" && (
          <SettingsView
            onDisconnect={onDisconnect}
            onRefresh={onRefresh}
            githubToken={githubToken}
            onGitHubTokenChange={onGitHubTokenChange}
          />
        )}
      </ScrollArea>

      {/* Bottom: New Session + Disconnect */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.04)] space-y-2">
        {activeView === "sessions" && (
          <Button
            onClick={onNewSession}
            className="w-full bg-gradient-agent hover:brightness-115 text-white gap-2 h-9 rounded-lg font-medium text-sm transition-all duration-200"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            New Mission
          </Button>
        )}
      </div>
    </div>
  );
}

/* Sessions View */
function SessionsView({
  sessions,
  sources,
  selectedSessionId,
  isLoadingSessions,
  isLoadingSources,
  onSelectSession,
  onNewSession,
  onRefresh,
  sourcesExpanded,
  onToggleSources,
  githubToken,
  onOpenAddRepo,
}: {
  sessions: JulesSession[];
  sources: JulesSource[];
  selectedSessionId: string | null;
  isLoadingSessions: boolean;
  isLoadingSources: boolean;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onRefresh: () => void;
  sourcesExpanded: boolean;
  onToggleSources: () => void;
  githubToken: string | null;
  onOpenAddRepo: () => void;
}) {
  return (
    <div className="py-2">
      {/* Connected Repos */}
      <div className="px-3 mb-2">
        <button
          onClick={onToggleSources}
          className="flex items-center justify-between w-full group"
        >
          <div className="flex items-center gap-1.5">
            {sourcesExpanded ? (
              <ChevronDown className="h-3 w-3 text-[#64748b]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[#64748b]" />
            )}
            <FolderGit2 className="h-3.5 w-3.5 text-[#64748b]" />
            <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Connected Repos</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(129,140,248,0.08)] text-[#818cf8] border-[rgba(129,140,248,0.12)] hover:bg-[rgba(129,140,248,0.12)]">
              {sources.length}
            </Badge>
            {githubToken && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenAddRepo(); }}
                className="h-4 w-4 rounded flex items-center justify-center text-[#4a4a5a] hover:text-[#818cf8] hover:bg-[rgba(129,140,248,0.08)] transition-colors"
                title="Add Repository"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </button>

        {sourcesExpanded && (
          <div className="mt-1.5 ml-1">
            {isLoadingSources ? (
              <div className="space-y-1.5">
                <Skeleton className="h-6 bg-[rgba(255,255,255,0.03)]" />
                <Skeleton className="h-6 bg-[rgba(255,255,255,0.03)]" />
              </div>
            ) : sources.length === 0 ? (
              <p className="text-[10px] text-[#4a4a5a] px-2 py-1">No sources connected</p>
            ) : (
              <div className="space-y-0.5">
                {sources.map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[#94a3b8] hover:bg-[rgba(255,255,255,0.03)] hover:text-white transition-all duration-200"
                  >
                    <GitBranch className="h-3 w-3 text-[#4a4a5a] shrink-0" />
                    <span className="truncate text-xs font-mono">{getSourceDisplayName(source)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Separator className="bg-[rgba(255,255,255,0.04)] mx-3 my-2" />

      {/* Sessions */}
      <div className="px-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-[#64748b]" />
            <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Sessions</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(129,140,248,0.08)] text-[#818cf8] border-[rgba(129,140,248,0.12)] hover:bg-[rgba(129,140,248,0.12)]">
              {sessions.length}
            </Badge>
            <button
              onClick={onRefresh}
              className="h-5 w-5 rounded flex items-center justify-center text-[#4a4a5a] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {isLoadingSessions ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 bg-[rgba(255,255,255,0.03)] rounded-lg" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-[#2a2a3a] mx-auto mb-2" />
            <p className="text-xs text-[#4a4a5a]">No sessions yet</p>
            <Button
              onClick={onNewSession}
              variant="ghost"
              size="sm"
              className="mt-2 text-[#818cf8] hover:text-[#6366f1] hover:bg-[rgba(129,140,248,0.08)] text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Mission
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map((session) => {
              const sessionId = session.name.split("/").pop() || session.name;
              const isSelected = selectedSessionId === sessionId;
              const stateConfig = getStateConfig(session.state);

              return (
                <button
                  key={session.name}
                  onClick={() => onSelectSession(sessionId)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isSelected
                      ? "bg-[rgba(129,140,248,0.08)] border-l-2 border-l-[#818cf8]"
                      : "hover:bg-[rgba(255,255,255,0.03)] border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-white truncate leading-tight">
                      {session.title || "Untitled Session"}
                    </span>
                    <div className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${getStateDotColor(session.state)}`} />
                  </div>
                  {/* Status pill */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded border ${stateConfig.bg} ${stateConfig.color}`}>
                      {stateConfig.label}
                    </span>
                    {session.createTime && (
                      <span className="text-[10px] text-[#4a4a5a]">
                        {formatTimeAgo(session.createTime)}
                      </span>
                    )}
                  </div>
                  {/* Prompt preview */}
                  {session.prompt && (
                    <p className="text-[11px] text-[#4a4a5a] mt-1.5 truncate leading-relaxed">
                      {session.prompt}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* Sources View */
function SourcesView({
  sources,
  isLoadingSources,
  onRefresh,
  githubToken,
  onOpenAddRepo,
}: {
  sources: JulesSource[];
  isLoadingSources: boolean;
  onRefresh: () => void;
  githubToken: string | null;
  onOpenAddRepo: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Connected Repositories</h3>
        <div className="flex items-center gap-1">
          {githubToken && (
            <button
              onClick={onOpenAddRepo}
              className="h-6 w-6 rounded-md flex items-center justify-center text-[#4a4a5a] hover:text-[#818cf8] hover:bg-[rgba(129,140,248,0.08)] transition-colors"
              title="Add Repository"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onRefresh}
            className="h-6 w-6 rounded-md flex items-center justify-center text-[#4a4a5a] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isLoadingSources ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 bg-[rgba(255,255,255,0.03)] rounded-lg" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-8">
          <FolderGit2 className="h-8 w-8 text-[#2a2a3a] mx-auto mb-2" />
          <p className="text-xs text-[#4a4a5a]">No sources connected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.name}
              className="glass-card-hover rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-[rgba(129,140,248,0.08)] flex items-center justify-center shrink-0">
                  <GitBranch className="h-4 w-4 text-[#818cf8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-mono text-white truncate">{getSourceDisplayName(source)}</p>
                  <p className="text-[10px] text-[#4a4a5a] truncate">{source.id || source.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Settings View */
function SettingsView({
  onDisconnect,
  onRefresh,
  githubToken,
  onGitHubTokenChange,
}: {
  onDisconnect: () => void;
  onRefresh: () => void;
  githubToken: string | null;
  onGitHubTokenChange: (token: string | null) => void;
}) {
  const [tokenInput, setTokenInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Fetch GitHub user when token exists
  useEffect(() => {
    if (githubToken) {
      setIsLoadingUser(true);
      getGitHubUser(githubToken)
        .then((user) => setGithubUser(user))
        .catch(() => setGithubUser(null))
        .finally(() => setIsLoadingUser(false));
    } else {
      setGithubUser(null);
    }
  }, [githubToken]);

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setConnectError("Please enter a GitHub token");
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    try {
      const user = await getGitHubUser(tokenInput.trim());
      onGitHubTokenChange(tokenInput.trim());
      setGithubUser(user);
      setTokenInput("");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to connect to GitHub");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onGitHubTokenChange(null);
    setGithubUser(null);
    setTokenInput("");
    setConnectError(null);
  };

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-4">Settings</h3>

      <div className="space-y-4">
        {/* Refresh Data */}
        <button
          onClick={onRefresh}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.03)] transition-all duration-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm">Refresh Data</span>
        </button>

        <Separator className="bg-[rgba(255,255,255,0.04)]" />

        {/* GitHub Connection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-[#818cf8]" />
            <h4 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">GitHub Connection</h4>
          </div>

          {githubToken && githubUser ? (
            /* Connected state */
            <div className="space-y-3">
              <div className="glass-card rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {isLoadingUser ? (
                    <Skeleton className="h-9 w-9 rounded-full bg-[rgba(255,255,255,0.03)]" />
                  ) : (
                    <img
                      src={githubUser.avatar_url}
                      alt={githubUser.login}
                      className="h-9 w-9 rounded-full border border-[rgba(255,255,255,0.08)]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {githubUser.name || githubUser.login}
                    </p>
                    <p className="text-[11px] text-[#64748b] truncate">@{githubUser.login}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-[#10b981] shrink-0" title="Connected" />
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all duration-200 text-sm"
              >
                <Unplug className="h-4 w-4" />
                Disconnect GitHub
              </button>
            </div>
          ) : (
            /* Disconnected state */
            <div className="space-y-3">
              <p className="text-xs text-[#64748b] leading-relaxed">
                Connect your GitHub account to create repositories directly from the agent.
              </p>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => { setTokenInput(e.target.value); setConnectError(null); }}
                  disabled={isConnecting}
                  className="bg-[#0d1117] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#3a3a4a] focus:border-[rgba(129,140,248,0.3)] input-glow h-9 rounded-lg text-xs font-mono transition-all duration-200"
                />
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !tokenInput.trim()}
                  className="w-full bg-gradient-agent hover:brightness-115 text-white h-9 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" />
                      Connect GitHub
                    </>
                  )}
                </Button>
              </div>
              {connectError && (
                <div className="rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-xs text-[#f87171] animate-fade-in">
                  {connectError}
                </div>
              )}
              <div className="space-y-1.5">
                <p className="text-[10px] text-[#4a4a5a]">
                  Requires <code className="text-[#64748b] bg-[rgba(255,255,255,0.03)] px-1 rounded">repo</code> scope
                </p>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#818cf8] hover:text-[#6366f1] transition-colors"
                >
                  Create a token on GitHub
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        <Separator className="bg-[rgba(255,255,255,0.04)]" />

        {/* Disconnect Jules */}
        <button
          onClick={onDisconnect}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Disconnect Jules</span>
        </button>
      </div>
    </div>
  );
}
