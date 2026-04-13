"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { JulesSession, JulesActivity, getSession, listActivities, approvePlan, sendMessage } from "@/lib/jules-client";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Zap,
  Github,
  Smile,
  MoreVertical,
  Search,
} from "lucide-react";

interface SessionDetailProps {
  sessionId: string;
  apiKey: string;
}

function formatFullDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getStateBadgeConfig(state?: string): { label: string; color: string; bg: string } {
  switch (state) {
    case "COMPLETED":
      return { label: "Completed", color: "text-[#10b981]", bg: "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]" };
    case "FAILED":
      return { label: "Failed", color: "text-[#ef4444]", bg: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]" };
    case "ACTIVE":
    case "RUNNING":
      return { label: "Running", color: "text-[#00a884]", bg: "bg-[rgba(0,168,132,0.1)] border-[rgba(0,168,132,0.2)]" };
    case "AWAITING_APPROVAL":
      return { label: "Awaiting Approval", color: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]" };
    default:
      return { label: "Unknown", color: "text-[var(--wa-text-muted)]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]" };
  }
}

function isActiveState(state?: string): boolean {
  return state === "ACTIVE" || state === "RUNNING" || state === "AWAITING_APPROVAL";
}

export function SessionDetail({ sessionId, apiKey }: SessionDetailProps) {
  const [session, setSession] = useState<JulesSession | null>(null);
  const [activities, setActivities] = useState<JulesActivity[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const data = await getSession(apiKey, sessionId);
      setSession(data);
    } catch {
      // Silently fail on poll
    } finally {
      setIsLoadingSession(false);
    }
  }, [apiKey, sessionId]);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await listActivities(apiKey, sessionId);
      setActivities(data.activities || []);
    } catch {
      // Silently fail on poll
    } finally {
      setIsLoadingActivities(false);
    }
  }, [apiKey, sessionId]);

  useEffect(() => {
    setIsLoadingSession(true);
    setIsLoadingActivities(true);
    fetchSession();
    fetchActivities();
  }, [fetchSession, fetchActivities]);

  // Poll for updates when session is active
  useEffect(() => {
    if (!session || !isActiveState(session.state)) return;

    const interval = setInterval(() => {
      fetchSession();
      fetchActivities();
    }, 5000);

    return () => clearInterval(interval);
  }, [session, fetchSession, fetchActivities]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approvePlan(apiKey, sessionId);
      await fetchSession();
      await fetchActivities();
    } catch (err) {
      console.error("Failed to approve plan:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    setIsSending(true);
    try {
      await sendMessage(apiKey, sessionId, messageInput.trim());
      setMessageInput("");
      await fetchSession();
      await fetchActivities();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex-1 p-6 space-y-4 bg-[var(--wa-bg)]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full bg-[var(--wa-skeleton-bg)]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48 bg-[var(--wa-skeleton-bg)]" />
            <Skeleton className="h-3 w-24 bg-[var(--wa-skeleton-bg)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--wa-bg)]">
        <p className="text-[var(--wa-text-muted)]">Session not found</p>
      </div>
    );
  }

  const sourceRepo = session.sourceContext?.source
    ?.replace("sources/", "")
    .replace("https://github.com/", "");
  const branch = session.sourceContext?.githubRepoContext?.startingBranch || "main";
  const stateConfig = getStateBadgeConfig(session.state);
  const isCompleted = session.state === "COMPLETED" || session.state === "FAILED";
  const avatarColor = getSessionAvatarColor(session.title || "Untitled");

  return (
    <div className="wa-main">
      {/* Session Header — WhatsApp contact header style */}
      <div className="wa-header">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar like WhatsApp chat header */}
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0" style={{ backgroundColor: avatarColor }}>
            {(session.title || "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-[var(--wa-text)] truncate">
              {session.title || "Untitled Session"}
            </h2>
            <div className="flex items-center gap-2 text-[12px] text-[var(--wa-text-muted)]">
              <span className={`status-chip ${stateConfig.bg} ${stateConfig.color}`}>
                {stateConfig.label}
              </span>
              {sourceRepo && (
                <span className="flex items-center gap-1">
                  <Github className="h-2.5 w-2.5" />
                  <span className="font-mono">{sourceRepo}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <GitBranch className="h-2.5 w-2.5" />
                <span className="font-mono">{branch}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Search icon */}
            <button className="h-9 w-9 rounded-full flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors">
              <Search className="h-5 w-5" />
            </button>
            {/* More options */}
            <button className="h-9 w-9 rounded-full flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
            {/* Approve Plan Button — WhatsApp green */}
            {session.state === "AWAITING_APPROVAL" && (
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white gap-1.5 h-8 rounded-lg text-xs font-medium shadow-md transition-all duration-200 interaction-scale animate-subtle-pulse"
                size="sm"
              >
                {isApproving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Approve Plan
              </Button>
            )}

            {/* PR Link */}
            {session.output?.pullRequestUrl && (
              <a
                href={session.output.pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-[#00a884] hover:text-[#008069] transition-colors px-2.5 py-1.5 rounded-lg glass-card-refined hover-lift"
              >
                View PR <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline — chat area with wallpaper */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ActivityTimeline
          activities={activities}
          isLoading={isLoadingActivities}
        />
      </div>

      {/* Message Input — WhatsApp-style input bar */}
      <div className="wa-chat-input-container">
        <div className="flex gap-2 items-center w-full">
          {/* Emoji icon */}
          <button className="h-10 w-10 rounded-full flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors shrink-0">
            <Smile className="h-6 w-6" />
          </button>
          {/* Input field */}
          <div className="flex-1 relative">
            <Input
              placeholder={isCompleted ? "Session completed" : "Type a message..."}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || isCompleted}
              className="wa-chat-input h-10 rounded-2xl px-4 text-sm disabled:opacity-50"
            />
          </div>
          {/* Send / Mic button — WhatsApp green circle */}
          {messageInput.trim() ? (
            <Button
              onClick={handleSendMessage}
              disabled={isSending || isCompleted}
              size="icon"
              className="bg-[#00a884] hover:bg-[#008069] text-white shrink-0 h-10 w-10 rounded-full shadow-md hover-lift disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <button className="h-10 w-10 rounded-full flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors shrink-0">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* Generate a consistent avatar color from the session title */
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
