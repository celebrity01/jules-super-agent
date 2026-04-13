"use client";

import { JulesSource, JulesSession, getSourceDisplayName, getGitHubUser, GitHubUser } from "@/lib/jules-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { getSupabaseClient, getSupabaseAccessToken, clearSupabaseAccessToken, saveSupabaseAccessToken, getSupabaseConfig } from "@/lib/supabase-client";
import { verifyAccessToken } from "@/lib/supabase-management";
import { SupabaseProjects } from "@/components/supabase-projects";
import { RenderPanel } from "@/components/render-panel";
import type { SavedSession } from "@/lib/supabase-data";
import type { User } from "@supabase/supabase-js";
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
  Globe,
  Lock,
  Database,
  Bookmark,
  Star,
  Trash2,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  Cloud,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";

type SidebarView = "sessions" | "sources" | "settings" | "bookmarks" | "supabase" | "render";

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
  supabaseUser: User | null;
  supabasePAT: string | null;
  onSupabasePATChange: (pat: string | null) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onResetSupabase: () => void;
  savedSessions: SavedSession[];
  renderApiKey: string | null;
  onRenderApiKeyChange: (key: string | null) => void;
  supabaseProjects?: Array<{ ref: string; name: string; status: string }>;
  julesApiKey?: string | null;
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
      return { color: "text-[#00a884]", bg: "bg-[rgba(0,168,132,0.1)] border-[rgba(0,168,132,0.2)]", label: "Running" };
    case "AWAITING_APPROVAL":
      return { color: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]", label: "Awaiting" };
    default:
      return { color: "text-[var(--wa-text-muted)]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]", label: "Unknown" };
  }
}

function getStateDotColor(state?: string): string {
  switch (state) {
    case "COMPLETED": return "bg-[#10b981]";
    case "FAILED": return "bg-[#ef4444]";
    case "ACTIVE":
    case "RUNNING": return "bg-[#00a884]";
    case "AWAITING_APPROVAL": return "bg-[#f59e0b]";
    default: return "bg-[var(--wa-text-muted)]";
  }
}

/* Generate a consistent avatar color from the session title — WhatsApp-style colored avatars */
function getSessionAvatarColor(title: string): string {
  const colors = [
    "#00a884", "#25D366", "#10b981", "#059669",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#ef4444", "#f97316",
    "#eab308", "#84cc16", "#14b8a6", "#06b6d4",
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
  supabaseUser,
  supabasePAT,
  onSupabasePATChange,
  onSignIn,
  onSignOut,
  onResetSupabase,
  savedSessions,
  renderApiKey,
  onRenderApiKeyChange,
  supabaseProjects,
  julesApiKey,
}: SidebarProps) {
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(maskedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch GitHub user when token exists
  useEffect(() => {
    if (!githubToken) return;
    let cancelled = false;
    getGitHubUser(githubToken)
      .then((user) => { if (!cancelled) setGithubUser(user); })
      .catch(() => { if (!cancelled) setGithubUser(null); });
    return () => { cancelled = true; };
  }, [githubToken]);

  return (
    <div className="w-[300px] flex flex-col h-full bg-[var(--wa-sidebar-bg)] border-r border-[var(--wa-border)]">
      {/* WhatsApp-style header with user avatar + status */}
      <div className="p-3 border-b border-[var(--wa-border)] bg-[var(--wa-header)]">
        <div className="flex items-center gap-3">
          {supabaseUser ? (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {(supabaseUser.email || "U")[0].toUpperCase()}
            </div>
          ) : githubToken && githubUser ? (
            <img
              src={githubUser.avatar_url}
              alt={githubUser.login}
              className="h-10 w-10 rounded-full border border-[var(--wa-border)]"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-agent flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-[var(--wa-text)] truncate">
                {supabaseUser
                  ? supabaseUser.email?.split("@")[0] || "Agent"
                  : githubToken && githubUser
                  ? githubUser.name || githubUser.login
                  : "Jules Agent"}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <div className="status-dot status-dot-online" />
                <span className="text-[10px] text-[#10b981] font-medium">Online</span>
              </div>
            </div>
            {supabaseUser && (
              <span className="text-[10px] text-[#10b981] font-mono flex items-center gap-1 mt-0.5">
                <Database className="h-2.5 w-2.5" />
                Synced
              </span>
            )}
            {!supabaseUser && githubToken && githubUser && (
              <span className="text-[10px] text-[var(--wa-text-muted)] font-mono mt-0.5">@{githubUser.login}</span>
            )}
          </div>
          {/* Header action icons like WhatsApp */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyKey}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
              title="Copy API Key"
            >
              {copied ? <Check className="h-4 w-4 text-[#10b981]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Quick badges row — WhatsApp pills */}
        <div className="flex items-center gap-2 mt-2.5 px-0.5">
          {githubToken && githubUser && (
            <div className="glass-pill glass-pill-accent flex-1 px-2.5 py-1">
              <Github className="h-3 w-3" />
              <span>GitHub</span>
            </div>
          )}
          {(supabaseUser || supabasePAT || getSupabaseConfig()) && (
            <div className="glass-pill glass-pill-success flex-1 px-2.5 py-1">
              <Database className="h-3 w-3" />
              <span>Supabase</span>
            </div>
          )}
          {renderApiKey && (
            <div className="glass-pill glass-pill-orange flex-1 px-2.5 py-1">
              <Cloud className="h-3 w-3" />
              <span>Render</span>
            </div>
          )}
          {!supabaseUser && !supabasePAT && !getSupabaseConfig() && !githubToken && (
            <div className="glass-pill glass-pill-warning flex-1 px-2.5 py-1">
              <Shield className="h-3 w-3" />
              <span>Local only</span>
            </div>
          )}
          {(githubToken || supabaseUser) && (
            <button
              onClick={onOpenAddRepo}
              className="h-6 px-2 rounded-lg flex items-center justify-center gap-1 bg-[rgba(0,168,132,0.08)] border border-[rgba(0,168,132,0.12)] text-[#00a884] hover:bg-[rgba(0,168,132,0.15)] transition-all duration-200"
              title="Add Repository"
            >
              <Plus className="h-3 w-3" />
              <span className="text-[9px] font-medium">Repo</span>
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp-style search bar */}
      <div className="wa-search-container">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--wa-text-muted)]" />
          <input
            type="text"
            placeholder="Search or start new mission"
            className="wa-search-input pl-8 h-8 text-[13px]"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 custom-scrollbar">
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
        {activeView === "bookmarks" && (
          <BookmarksView
            savedSessions={savedSessions}
            onSelectSession={onSelectSession}
          />
        )}
        {activeView === "supabase" && (
          <SupabaseProjects onPATChange={onSupabasePATChange} renderApiKey={renderApiKey} />
        )}
        {activeView === "render" && (
          <RenderPanel renderApiKey={renderApiKey} onApiKeyChange={onRenderApiKeyChange} supabasePAT={supabasePAT} supabaseProjects={supabaseProjects} julesApiKey={julesApiKey} />
        )}
        {activeView === "settings" && (
          <SettingsView
            onDisconnect={onDisconnect}
            onRefresh={onRefresh}
            githubToken={githubToken}
            onGitHubTokenChange={onGitHubTokenChange}
            supabaseUser={supabaseUser}
            supabasePAT={supabasePAT}
            onSupabasePATChange={onSupabasePATChange}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            onResetSupabase={onResetSupabase}
            renderApiKey={renderApiKey}
            onRenderApiKeyChange={onRenderApiKeyChange}
          />
        )}
      </ScrollArea>

      {/* Bottom Action Bar — WhatsApp style */}
      <div className="p-3 border-t border-[var(--wa-border)] bg-[var(--wa-sidebar-bg)] space-y-2">
        {activeView === "sessions" && (
          <div className="flex gap-2">
            {githubToken && (
              <Button
                onClick={onOpenAddRepo}
                variant="outline"
                className="flex-1 bg-[var(--wa-hover-bg)] border-[var(--wa-border)] text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-search-bg)] gap-1.5 h-9 rounded-lg text-xs font-medium transition-all duration-200"
                size="sm"
              >
                <Github className="h-3.5 w-3.5" />
                Add Repo
              </Button>
            )}
            <Button
              onClick={onNewSession}
              className={`${githubToken ? 'flex-1' : 'w-full'} bg-gradient-premium text-white gap-1.5 h-9 rounded-lg font-medium text-sm interaction-scale`}
              size="sm"
            >
              <Plus className="h-4 w-4" />
              New Mission
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Sessions View — WhatsApp chat list style */
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
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleSources}
            className="flex items-center gap-1.5 group"
          >
            {sourcesExpanded ? (
              <ChevronDown className="h-3 w-3 text-[var(--wa-text-muted)]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[var(--wa-text-muted)]" />
            )}
            <FolderGit2 className="h-3.5 w-3.5 text-[var(--wa-text-muted)]" />
            <span className="text-[10px] font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">Connected Repos</span>
          </button>
          <div className="flex items-center gap-1">
            <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(0,168,132,0.08)] text-[#00a884] border-[rgba(0,168,132,0.12)] hover:bg-[rgba(0,168,132,0.12)]">
              {sources.length}
            </Badge>
            {githubToken && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenAddRepo(); }}
                className="h-4 w-4 rounded flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[#00a884] hover:bg-[rgba(0,168,132,0.08)] transition-colors"
                title="Add Repository"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {sourcesExpanded && (
          <div className="mt-1.5 ml-1">
            {isLoadingSources ? (
              <div className="space-y-1.5">
                <Skeleton className="h-6 bg-[var(--wa-skeleton-bg)]" />
                <Skeleton className="h-6 bg-[var(--wa-skeleton-bg)]" />
              </div>
            ) : sources.length === 0 ? (
              <div className="px-2 py-2">
                <p className="text-[10px] text-[var(--wa-text-muted)] mb-2">No sources connected</p>
                {githubToken && (
                  <button
                    onClick={onOpenAddRepo}
                    className="flex items-center gap-1.5 text-[10px] text-[#00a884] hover:text-[#008069] transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Create a new repo
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-0.5">
                {sources.map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[var(--wa-text-muted)] hover:bg-[var(--wa-hover-bg)] hover:text-[var(--wa-text)] transition-all duration-200"
                  >
                    <GitBranch className="h-3 w-3 text-[var(--wa-text-muted)] shrink-0" />
                    <span className="truncate text-xs font-mono">{getSourceDisplayName(source)}</span>
                  </div>
                ))}
                {githubToken && (
                  <button
                    onClick={onOpenAddRepo}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[var(--wa-text-muted)] hover:text-[#00a884] hover:bg-[rgba(0,168,132,0.04)] transition-all duration-200"
                  >
                    <Plus className="h-3 w-3 shrink-0" />
                    <span className="text-xs">Add repository</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="divider-refined mx-3 my-2" />

      {/* Sessions — WhatsApp chat list style */}
      <div className="px-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-[var(--wa-text-muted)]" />
            <span className="text-[10px] font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">Sessions</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(0,168,132,0.08)] text-[#00a884] border-[rgba(0,168,132,0.12)] hover:bg-[rgba(0,168,132,0.12)]">
              {sessions.length}
            </Badge>
            <button
              onClick={onRefresh}
              className="h-5 w-5 rounded flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {isLoadingSessions ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 bg-[var(--wa-skeleton-bg)] rounded-lg" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-[var(--wa-text-muted)] opacity-30 mx-auto mb-2" />
            <p className="text-xs text-[var(--wa-text-muted)]">No sessions yet</p>
            <Button
              onClick={onNewSession}
              variant="ghost"
              size="sm"
              className="mt-2 text-[#00a884] hover:text-[#008069] hover:bg-[rgba(0,168,132,0.08)] text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Mission
            </Button>
          </div>
        ) : (
          <div className="space-y-0">
            {sessions.map((session) => {
              const sessionId = session.name.split("/").pop() || session.name;
              const isSelected = selectedSessionId === sessionId;
              const stateConfig = getStateConfig(session.state);
              const avatarColor = getSessionAvatarColor(session.title || "Untitled");
              const initial = (session.title || "U")[0].toUpperCase();

              return (
                <button
                  key={session.name}
                  onClick={() => onSelectSession(sessionId)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 transition-all duration-150 ${
                    isSelected
                      ? "bg-[var(--wa-hover-bg)]"
                      : "hover:bg-[var(--wa-hover-bg)]"
                  }`}
                >
                  {/* Circular avatar like WhatsApp */}
                  <div className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: avatarColor }}>
                    {initial}
                  </div>

                  {/* Chat content */}
                  <div className="flex-1 min-w-0 border-b border-[var(--wa-border)] pb-2.5">
                    {/* Title row with timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[15px] truncate leading-tight ${
                        isSelected ? "text-[var(--wa-text)] font-semibold" : "text-[var(--wa-text)] font-medium"
                      }`}>
                        {session.title || "Untitled Session"}
                      </span>
                      <span className={`text-[12px] shrink-0 ${
                        session.state === "ACTIVE" || session.state === "RUNNING" || session.state === "AWAITING_APPROVAL"
                          ? "text-[#00a884]"
                          : "text-[var(--wa-text-muted)]"
                      }`}>
                        {session.createTime ? formatTimeAgo(session.createTime) : ""}
                      </span>
                    </div>

                    {/* Preview row with status */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Status icon / double check for completed */}
                      {session.state === "COMPLETED" && (
                        <svg className="h-4 w-3.5 text-[#53bdeb] shrink-0" viewBox="0 0 16 11" fill="none">
                          <path d="M11.07 0L5.51 5.56L3.93 3.98L2.51 5.4L5.51 8.4L12.49 1.42L11.07 0Z" fill="currentColor"/>
                          <path d="M14.07 0L8.51 5.56L7.72 4.77L6.3 6.19L8.51 8.4L15.49 1.42L14.07 0Z" fill="currentColor"/>
                        </svg>
                      )}
                      {session.state === "FAILED" && (
                        <div className="h-3.5 w-3.5 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                        </div>
                      )}
                      {(session.state === "ACTIVE" || session.state === "RUNNING") && (
                        <Loader2 className="h-3 w-3 text-[#00a884] animate-spin shrink-0" />
                      )}
                      {session.state === "AWAITING_APPROVAL" && (
                        <div className="h-3.5 w-3.5 rounded-full bg-[rgba(245,158,11,0.15)] flex items-center justify-center shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                        </div>
                      )}
                      <span className={`text-[13px] truncate leading-relaxed ${
                        session.state === "COMPLETED" ? "text-[var(--wa-text-muted)]" :
                        session.state === "ACTIVE" || session.state === "RUNNING" ? "text-[var(--wa-text-muted)]" :
                        session.state === "AWAITING_APPROVAL" ? "text-[#f59e0b]" :
                        session.state === "FAILED" ? "text-[#ef4444]" :
                        "text-[var(--wa-text-muted)]"
                      }`}>
                        {session.prompt
                          ? session.prompt.substring(0, 50) + (session.prompt.length > 50 ? "..." : "")
                          : stateConfig.label}
                      </span>
                      {/* Unread badge for active sessions */}
                      {(session.state === "AWAITING_APPROVAL") && (
                        <span className="wa-unread-badge ml-auto shrink-0">!</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* Bookmarks View */
function BookmarksView({
  savedSessions,
  onSelectSession,
}: {
  savedSessions: SavedSession[];
  onSelectSession: (id: string) => void;
}) {
  const allSaved = savedSessions;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          Saved Sessions
        </h3>
        <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(245,158,11,0.08)] text-[#f59e0b] border-[rgba(245,158,11,0.12)]">
          {allSaved.length}
        </Badge>
      </div>

      {allSaved.length === 0 ? (
        <div className="text-center py-8">
          <Bookmark className="h-8 w-8 text-[var(--wa-text-muted)] opacity-30 mx-auto mb-2" />
          <p className="text-xs text-[var(--wa-text-muted)]">No saved sessions yet</p>
          <p className="text-[10px] text-[var(--wa-text-muted)] opacity-60 mt-1">
            Sessions are auto-saved when Supabase is connected
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {allSaved.map((saved) => (
            <button
              key={saved.id}
              onClick={() => onSelectSession(saved.session_id)}
              className="w-full text-left glass-card-hover rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[var(--wa-text)] truncate">
                  {saved.session_title || saved.session_id}
                </span>
                {saved.bookmarked && (
                  <Star className="h-3.5 w-3.5 text-[#f59e0b] shrink-0 fill-[#f59e0b]" />
                )}
              </div>
              {saved.source_name && (
                <div className="flex items-center gap-1.5 mt-1">
                  <GitBranch className="h-3 w-3 text-[var(--wa-text-muted)]" />
                  <span className="text-[10px] text-[var(--wa-text-muted)] font-mono truncate">{saved.source_name}</span>
                </div>
              )}
              {saved.prompt && (
                <p className="text-[10px] text-[var(--wa-text-muted)] mt-1 truncate">{saved.prompt}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                {saved.session_state && (
                  <span className={`text-[9px] font-medium ${getStateConfig(saved.session_state).color}`}>
                    {getStateConfig(saved.session_state).label}
                  </span>
                )}
                <span className="text-[9px] text-[var(--wa-text-muted)] opacity-60">
                  {formatTimeAgo(saved.updated_at)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
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
        <h3 className="text-xs font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">Repositories</h3>
        <div className="flex items-center gap-1">
          {githubToken && (
            <button
              onClick={onOpenAddRepo}
              className="h-6 px-2 rounded-lg flex items-center justify-center gap-1 bg-[rgba(0,168,132,0.08)] border border-[rgba(0,168,132,0.12)] text-[#00a884] hover:bg-[rgba(0,168,132,0.15)] transition-all duration-200"
              title="Add Repository"
            >
              <Plus className="h-3 w-3" />
              <span className="text-[9px] font-medium">New</span>
            </button>
          )}
          <button
            onClick={onRefresh}
            className="h-6 w-6 rounded-lg flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {githubToken && sources.length === 0 && !isLoadingSources && (
        <div className="mb-4 rounded-xl bg-[rgba(0,168,132,0.04)] border border-[rgba(0,168,132,0.08)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Github className="h-4 w-4 text-[#00a884]" />
            <span className="text-sm font-medium text-[var(--wa-text)]">Create your first repo</span>
          </div>
          <p className="text-xs text-[var(--wa-text-muted)] mb-3 leading-relaxed">
            You&apos;re connected to GitHub! Create a new repository to get started with Jules.
          </p>
          <Button
            onClick={onOpenAddRepo}
            className="w-full bg-gradient-agent hover:brightness-110 text-white h-8 rounded-lg font-medium text-xs transition-all duration-200 gap-1.5"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Repository
          </Button>
        </div>
      )}

      {isLoadingSources ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 bg-[var(--wa-skeleton-bg)] rounded-lg" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-8">
          <FolderGit2 className="h-8 w-8 text-[var(--wa-text-muted)] opacity-30 mx-auto mb-2" />
          <p className="text-xs text-[var(--wa-text-muted)]">No sources connected</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.name}
              className="glass-card-hover rounded-lg px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[rgba(0,168,132,0.08)] flex items-center justify-center shrink-0">
                  <GitBranch className="h-4 w-4 text-[#00a884]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-[var(--wa-text)] truncate">{getSourceDisplayName(source)}</p>
                  <p className="text-[10px] text-[var(--wa-text-muted)] truncate">{source.id || source.name}</p>
                </div>
                <a
                  href={`https://github.com/${getSourceDisplayName(source)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[#00a884] hover:bg-[rgba(0,168,132,0.08)] transition-colors shrink-0"
                  title="Open on GitHub"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}

          {githubToken && (
            <button
              onClick={onOpenAddRepo}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-dashed border-[var(--wa-border)] text-[var(--wa-text-muted)] hover:text-[#00a884] hover:border-[rgba(0,168,132,0.15)] hover:bg-[rgba(0,168,132,0.03)] transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs font-medium">Add Repository</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* Settings View — enhanced with Supabase */
function SettingsView({
  onDisconnect,
  onRefresh,
  githubToken,
  onGitHubTokenChange,
  supabaseUser,
  supabasePAT,
  onSupabasePATChange,
  onSignIn,
  onSignOut,
  onResetSupabase,
  renderApiKey,
  onRenderApiKeyChange,
}: {
  onDisconnect: () => void;
  onRefresh: () => void;
  githubToken: string | null;
  onGitHubTokenChange: (token: string | null) => void;
  supabaseUser: User | null;
  supabasePAT: string | null;
  onSupabasePATChange: (pat: string | null) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onResetSupabase: () => void;
  renderApiKey: string | null;
  onRenderApiKeyChange: (key: string | null) => void;
}) {
  const [tokenInput, setTokenInput] = useState("");
  const [patInput, setPatInput] = useState("");
  const [renderKeyInput, setRenderKeyInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectingPAT, setIsConnectingPAT] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [patError, setPatError] = useState<string | null>(null);
  const [renderKeyError, setRenderKeyError] = useState<string | null>(null);
  const [isConnectingRender, setIsConnectingRender] = useState(false);

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

  const handleConnectPAT = async () => {
    if (!patInput.trim()) {
      setPatError("Please enter your Supabase access token");
      return;
    }
    setIsConnectingPAT(true);
    setPatError(null);
    try {
      const valid = await verifyAccessToken(patInput.trim());
      if (!valid) {
        setPatError("Invalid access token. Please check and try again.");
        return;
      }
      saveSupabaseAccessToken(patInput.trim());
      onSupabasePATChange(patInput.trim());
      setPatInput("");
    } catch (err) {
      setPatError(err instanceof Error ? err.message : "Failed to verify token");
    } finally {
      setIsConnectingPAT(false);
    }
  };

  const handleDisconnectPAT = () => {
    clearSupabaseAccessToken();
    onSupabasePATChange(null);
    setPatInput("");
    setPatError(null);
  };

  const handleConnectRender = async () => {
    if (!renderKeyInput.trim()) {
      setRenderKeyError("Please enter your Render API key");
      return;
    }
    setIsConnectingRender(true);
    setRenderKeyError(null);
    try {
      const { verifyApiKey } = await import("@/lib/render-api");
      const valid = await verifyApiKey(renderKeyInput.trim());
      if (!valid) {
        setRenderKeyError("Invalid API key. Please check and try again.");
        return;
      }
      onRenderApiKeyChange(renderKeyInput.trim());
      setRenderKeyInput("");
    } catch (err) {
      setRenderKeyError(err instanceof Error ? err.message : "Failed to verify API key");
    } finally {
      setIsConnectingRender(false);
    }
  };

  const handleDisconnectRender = () => {
    onRenderApiKeyChange(null);
    setRenderKeyInput("");
    setRenderKeyError(null);
  };

  // Check if project config exists
  const supabaseConfig = typeof window !== "undefined" ? getSupabaseConfig() : null;

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider mb-4">Settings</h3>

      <div className="space-y-4">
        {/* Refresh Data */}
        <button
          onClick={onRefresh}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-all duration-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm">Refresh Data</span>
        </button>

        <Separator className="bg-[var(--wa-border)]" />

        {/* Supabase Account Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#10b981]" />
            <h4 className="text-xs font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">Supabase</h4>
          </div>

          {/* Project Client Status */}
          {supabaseConfig && (
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-[rgba(16,185,129,0.1)] flex items-center justify-center shrink-0">
                  <Database className="h-3 w-3 text-[#10b981]" />
                </div>
                <span className="text-[11px] font-medium text-[var(--wa-text)]">Project Client</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                  <span className="text-[9px] text-[#10b981] font-medium">Configured</span>
                </div>
              </div>
              <code className="text-[9px] font-mono text-[var(--wa-text-muted)] truncate block">{supabaseConfig.url}</code>
            </div>
          )}

          {/* Auth Account Status */}
          {supabaseUser ? (
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(supabaseUser.email || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--wa-text)] truncate">
                    {supabaseUser.email}
                  </p>
                  <p className="text-[10px] text-[#10b981] flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                    Authenticated &amp; Syncing
                  </p>
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-2 rounded-lg text-[10px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all duration-200"
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </button>
            </div>
          ) : supabaseConfig ? (
            <div className="rounded-lg bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.1)] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Database className="h-3.5 w-3.5 text-[var(--wa-text-muted)]" />
                <span className="text-[11px] font-medium text-[var(--wa-text-muted)]">Auth Account</span>
              </div>
              <p className="text-[10px] text-[var(--wa-text-muted)] mb-2">
                Sign in to sync your API keys, sessions, and settings across devices.
              </p>
              <Button
                onClick={onSignIn}
                className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 text-white h-7 rounded-lg font-medium text-[11px] transition-all duration-200 gap-1.5"
              >
                <UserIcon className="h-3 w-3" />
                Sign In
              </Button>
            </div>
          ) : null}

          {/* Management API (PAT) Status */}
          {supabasePAT ? (
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-[rgba(16,185,129,0.1)] flex items-center justify-center shrink-0">
                  <Shield className="h-3 w-3 text-[#10b981]" />
                </div>
                <span className="text-[11px] font-medium text-[var(--wa-text)]">Management API</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                  <span className="text-[9px] text-[#10b981] font-medium">Connected</span>
                </div>
              </div>
              <p className="text-[9px] text-[var(--wa-text-muted)] mb-2">
                Manage projects, organizations, API keys, and more via the Supabase Management API.
              </p>
              <button
                onClick={handleDisconnectPAT}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all duration-200"
              >
                <Unplug className="h-3 w-3" />
                Disconnect Management API
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.1)] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="h-3.5 w-3.5 text-[var(--wa-text-muted)]" />
                <span className="text-[11px] font-medium text-[var(--wa-text-muted)]">Management API</span>
              </div>
              <p className="text-[10px] text-[var(--wa-text-muted)] mb-2">
                Enter your Personal Access Token to manage projects, API keys, and organizations.
              </p>
              <div className="space-y-1.5">
                <Input
                  type="password"
                  placeholder="sbp_xxxxxxxxxxxxxxxxxxxx"
                  value={patInput}
                  onChange={(e) => { setPatInput(e.target.value); setPatError(null); }}
                  disabled={isConnectingPAT}
                  className="input-refined border-[var(--wa-input-border)] text-[var(--wa-text)] placeholder:text-[var(--wa-text-muted)] focus:border-[rgba(16,185,129,0.3)] h-8 rounded-lg text-[11px] font-mono"
                />
                <Button
                  onClick={handleConnectPAT}
                  disabled={isConnectingPAT || !patInput.trim()}
                  className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 text-white h-8 rounded-lg font-medium text-[11px] transition-all duration-200 disabled:opacity-50 gap-1.5"
                >
                  {isConnectingPAT ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3 w-3" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
              {patError && (
                <p className="mt-1.5 text-[10px] text-[#ef4444]">{patError}</p>
              )}
            </div>
          )}
        </div>

        <Separator className="bg-[var(--wa-border)]" />

        {/* GitHub Token Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-[#00a884]" />
            <h4 className="text-xs font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">GitHub</h4>
          </div>

          {githubToken && githubUser ? (
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center gap-3">
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="h-8 w-8 rounded-full border border-[var(--wa-border)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--wa-text)] truncate">{githubUser.name || githubUser.login}</p>
                  <p className="text-[10px] text-[var(--wa-text-muted)] font-mono">@{githubUser.login}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-2 rounded-lg text-[10px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all duration-200"
              >
                <Unplug className="h-3 w-3" />
                Disconnect GitHub
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-[rgba(0,168,132,0.04)] border border-[rgba(0,168,132,0.1)] p-3">
              <p className="text-[10px] text-[var(--wa-text-muted)] mb-2">
                Connect your GitHub account to create repositories and add sources.
              </p>
              <div className="space-y-1.5">
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => { setTokenInput(e.target.value); setConnectError(null); }}
                  disabled={isConnecting}
                  className="input-refined border-[var(--wa-input-border)] text-[var(--wa-text)] placeholder:text-[var(--wa-text-muted)] focus:border-[rgba(0,168,132,0.3)] h-8 rounded-lg text-[11px] font-mono"
                />
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !tokenInput.trim()}
                  className="w-full bg-gradient-to-r from-[#00a884] to-[#008069] hover:brightness-110 text-white h-8 rounded-lg font-medium text-[11px] transition-all duration-200 disabled:opacity-50 gap-1.5"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Github className="h-3 w-3" />
                      Connect GitHub
                    </>
                  )}
                </Button>
              </div>
              {connectError && (
                <p className="mt-1.5 text-[10px] text-[#ef4444]">{connectError}</p>
              )}
            </div>
          )}
        </div>

        <Separator className="bg-[var(--wa-border)]" />

        {/* Render Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#ff6b35]" />
            <h4 className="text-xs font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">Render</h4>
          </div>

          {renderApiKey ? (
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-[rgba(255,107,53,0.1)] flex items-center justify-center shrink-0">
                  <Cloud className="h-3 w-3 text-[#ff6b35]" />
                </div>
                <span className="text-[11px] font-medium text-[var(--wa-text)]">Render API</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                  <span className="text-[9px] text-[#10b981] font-medium">Connected</span>
                </div>
              </div>
              <button
                onClick={handleDisconnectRender}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all duration-200"
              >
                <Unplug className="h-3 w-3" />
                Disconnect Render
              </button>
            </div>
          ) : (
            <div className="rounded-lg bg-[rgba(255,107,53,0.04)] border border-[rgba(255,107,53,0.1)] p-3">
              <p className="text-[10px] text-[var(--wa-text-muted)] mb-2">
                Connect your Render account to manage services, databases, and deploys.
              </p>
              <div className="space-y-1.5">
                <Input
                  type="password"
                  placeholder="rnd_xxxxxxxxxxxxxxxxxxxx"
                  value={renderKeyInput}
                  onChange={(e) => { setRenderKeyInput(e.target.value); setRenderKeyError(null); }}
                  disabled={isConnectingRender}
                  className="input-refined border-[var(--wa-input-border)] text-[var(--wa-text)] placeholder:text-[var(--wa-text-muted)] focus:border-[rgba(255,107,53,0.3)] h-8 rounded-lg text-[11px] font-mono"
                />
                <Button
                  onClick={handleConnectRender}
                  disabled={isConnectingRender || !renderKeyInput.trim()}
                  className="w-full bg-gradient-to-r from-[#ff6b35] to-[#e55a2b] hover:brightness-110 text-white h-8 rounded-lg font-medium text-[11px] transition-all duration-200 disabled:opacity-50 gap-1.5"
                >
                  {isConnectingRender ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3 w-3" />
                      Connect Render
                    </>
                  )}
                </Button>
              </div>
              {renderKeyError && (
                <p className="mt-1.5 text-[10px] text-[#ef4444]">{renderKeyError}</p>
              )}
            </div>
          )}
        </div>

        <Separator className="bg-[var(--wa-border)]" />

        {/* Disconnect Jules */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#00a884]" />
            <h4 className="text-xs font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">Jules Agent</h4>
          </div>
          <button
            onClick={onDisconnect}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all duration-200"
          >
            <Unplug className="h-4 w-4" />
            <span className="text-sm">Disconnect Agent</span>
          </button>
        </div>

        {/* Reset Supabase */}
        {supabaseConfig && (
          <>
            <Separator className="bg-[var(--wa-border)]" />
            <button
              onClick={onResetSupabase}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[var(--wa-text-muted)] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)] transition-all duration-200"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Reset Supabase Config</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
