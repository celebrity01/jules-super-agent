"use client";

import { JulesSession, JulesSource, getSourceDisplayName } from "@/lib/jules-client";
import {
  Terminal,
  MessageSquare,
  Github,
  Library,
  Search,
  FolderPlus,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

type ThreadsViewProps = {
  sessions: JulesSession[];
  sources: JulesSource[];
  isLoadingSessions: boolean;
  isLoadingSources: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewMission: () => void;
  onAddRepo: () => void;
  onRefresh: () => void;
};

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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getStateBadge(state?: string): { label: string; color: string; className: string } {
  switch (state) {
    case "COMPLETED":
      return { label: "COMPLETED", color: "#00E676", className: "status-badge-completed" };
    case "FAILED":
      return { label: "FAILED", color: "#FF2A5F", className: "status-badge-failed" };
    case "ACTIVE":
      return { label: "RUNNING", color: "#00E5FF", className: "status-badge-running" };
    case "AWAITING_APPROVAL":
      return { label: "AWAITING", color: "#B388FF", className: "status-badge-awaiting" };
    default:
      return { label: "UNKNOWN", color: "#547B88", className: "status-badge" };
  }
}

export function GlassThreadsView({
  sessions,
  sources,
  isLoadingSessions,
  isLoadingSources,
  onSelectSession,
  onNewMission,
  onAddRepo,
  onRefresh,
}: ThreadsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((s) =>
    !searchQuery || (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || (s.prompt || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-16 glass-surface flex items-center justify-between px-5 glass-border-b shrink-0 z-30">
        <h1 className="text-2xl font-bold text-[#E0F7FA] tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Jules lite
        </h1>
        <div className="flex gap-1.5 items-center">
          <button onClick={onRefresh} className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10" title="Refresh">
            <RefreshCw size={22} />
          </button>
          <button className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10" title="Search">
            <Search size={22} />
          </button>
          <button
            onClick={onAddRepo}
            className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10"
            title="Add Repository"
          >
            <FolderPlus size={22} />
          </button>
        </div>
      </header>

      {/* Quick Action Grid */}
      <div className="glass-surface py-5 px-4 grid grid-cols-3 gap-3 shrink-0 glass-border-b z-20">
        <button className="flex flex-col items-center gap-2 active:scale-95 transition-all group">
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#E0F7FA] group-hover:border-[#00E5FF] group-hover:bg-[#00E5FF]/10 transition-all">
            <MessageSquare size={22} />
          </div>
          <span className="text-[10px] font-mono text-[#547B88] uppercase tracking-tighter text-center leading-tight">
            {isLoadingSessions ? "..." : sessions.length} Sessions
          </span>
        </button>
        <button className="flex flex-col items-center gap-2 active:scale-95 transition-all group">
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#E0F7FA] group-hover:border-[#00E5FF] group-hover:bg-[#00E5FF]/10 transition-all">
            <Github size={22} />
          </div>
          <span className="text-[10px] font-mono text-[#547B88] uppercase tracking-tighter text-center leading-tight">
            {isLoadingSources ? "..." : sources.length} Repos
          </span>
        </button>
        <button className="flex flex-col items-center gap-2 active:scale-95 transition-all group">
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#E0F7FA] group-hover:border-[#00E5FF] group-hover:bg-[#00E5FF]/10 transition-all">
            <Library size={22} />
          </div>
          <span className="text-[10px] font-mono text-[#547B88] uppercase tracking-tighter text-center leading-tight">
            {isLoadingSources ? "..." : sources.length} Sources
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl flex items-center px-4 py-2.5">
          <Search size={16} className="text-[#547B88] mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm text-[#E0F7FA] placeholder-[#1A3540] font-mono"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-5 py-2">
          <p className="text-[11px] font-mono text-[#547B88] uppercase tracking-[0.2em] font-bold">Active Threads</p>
        </div>
        <div className="px-3 space-y-3">
          {isLoadingSessions ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="glass-surface flex items-start gap-4 px-5 py-5 rounded-2xl">
                <div className="w-12 h-12 skeleton-shimmer rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton-shimmer rounded w-2/3" />
                  <div className="h-3 skeleton-shimmer rounded w-full" />
                </div>
              </div>
            ))
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Terminal className="h-12 w-12 text-[#547B88] opacity-20 mb-4" />
              <p className="text-[#547B88] text-sm">No sessions yet</p>
              <p className="text-[#547B88] text-xs opacity-60 mt-1">Create a new mission to get started</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const sessionId = session.name.split("/").pop() || session.name;
              const badge = getStateBadge(session.state);
              const lastMsg = session.prompt || badge.label;

              return (
                <div
                  key={session.name}
                  onClick={() => onSelectSession(sessionId)}
                  className="glass-surface flex items-start gap-4 px-5 py-4 rounded-2xl active:scale-[0.98] transition-all cursor-pointer hover:bg-white/5"
                >
                  <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl text-[#00E5FF] shrink-0 shadow-lg">
                    <Terminal size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="text-[#E0F7FA] font-bold text-sm truncate leading-none">
                        {session.title || "Untitled Session"}
                      </h3>
                      <span className="text-[11px] text-[#547B88] font-mono shrink-0 ml-2">
                        {session.createTime ? formatTimeAgo(session.createTime) : ""}
                      </span>
                    </div>
                    <p className="text-[#547B88] text-xs line-clamp-1 opacity-80 mb-2.5">
                      {lastMsg.substring(0, 80)}{lastMsg.length > 80 ? "..." : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`font-mono text-[9px] px-2 py-0.5 border uppercase rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={onNewMission}
        className="fixed bottom-24 right-6 w-16 h-16 bg-[#00E5FF] flex items-center justify-center rounded-2xl shadow-[0_10px_40px_rgba(0,229,255,0.4)] active:scale-90 transition-all text-[#071115] z-40 border border-white/20"
      >
        <Plus size={36} strokeWidth={2.5} />
      </button>
    </div>
  );
}
