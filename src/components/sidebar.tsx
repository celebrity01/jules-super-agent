"use client";

import { JulesSource, JulesSession } from "@/lib/jules-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, MessageSquare, Plus, RefreshCw, FolderGit2 } from "lucide-react";

interface SidebarProps {
  sources: JulesSource[];
  sessions: JulesSession[];
  selectedSessionId: string | null;
  isLoadingSources: boolean;
  isLoadingSessions: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onRefresh: () => void;
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

function getStateColor(state?: string): string {
  switch (state) {
    case "COMPLETED":
      return "bg-emerald-500";
    case "FAILED":
      return "bg-red-500";
    case "ACTIVE":
    case "RUNNING":
      return "bg-[#4285F4]";
    case "AWAITING_APPROVAL":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

function getStateLabel(state?: string): string {
  if (!state) return "Unknown";
  return state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
}: SidebarProps) {
  return (
    <div className="w-72 bg-slate-900 text-white flex flex-col h-full border-r border-slate-700">
      {/* New Session Button */}
      <div className="p-3">
        <Button
          onClick={onNewSession}
          className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* Sources Section */}
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5" />
              Sources
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>

          {isLoadingSources ? (
            <div className="space-y-2">
              <Skeleton className="h-8 bg-slate-800" />
              <Skeleton className="h-8 bg-slate-800" />
            </div>
          ) : sources.length === 0 ? (
            <p className="text-xs text-slate-500 px-2">No sources connected</p>
          ) : (
            <div className="space-y-1">
              {sources.map((source) => {
                const repoUri = source.githubRepoContext?.repoUri || source.name;
                const parts = repoUri.replace("https://github.com/", "").split("/");
                const displayName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : repoUri.split("/").pop() || source.name;

                return (
                  <div
                    key={source.name}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <GitBranch className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate text-xs font-mono">{displayName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="bg-slate-700 mx-3" />

        {/* Sessions Section */}
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <MessageSquare className="h-3.5 w-3.5" />
            Sessions
          </h3>

          {isLoadingSessions ? (
            <div className="space-y-2">
              <Skeleton className="h-16 bg-slate-800" />
              <Skeleton className="h-16 bg-slate-800" />
              <Skeleton className="h-16 bg-slate-800" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-500 px-2">No sessions yet</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => {
                const sessionId = session.name.split("/").pop() || session.name;
                const isSelected = selectedSessionId === sessionId;

                return (
                  <button
                    key={session.name}
                    onClick={() => onSelectSession(sessionId)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[#4285F4]/20 text-white border border-[#4285F4]/30"
                        : "hover:bg-slate-800 text-slate-300 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium truncate leading-tight">
                        {session.title || "Untitled Session"}
                      </span>
                      <div className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${getStateColor(session.state)}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 bg-slate-700 text-slate-400 hover:bg-slate-700"
                      >
                        {getStateLabel(session.state)}
                      </Badge>
                      {session.createTime && (
                        <span className="text-[10px] text-slate-500">
                          {formatTimeAgo(session.createTime)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
