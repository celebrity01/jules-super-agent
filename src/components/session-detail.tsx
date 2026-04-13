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
      return { label: "Running", color: "text-[#818cf8]", bg: "bg-[rgba(129,140,248,0.1)] border-[rgba(129,140,248,0.2)]" };
    case "AWAITING_APPROVAL":
      return { label: "Awaiting Approval", color: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]" };
    default:
      return { label: "Unknown", color: "text-[#64748b]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]" };
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
      <div className="flex-1 p-6 space-y-4" style={{ background: "#0a0a0f" }}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg bg-[rgba(255,255,255,0.03)]" />
          <Skeleton className="h-6 w-48 bg-[rgba(255,255,255,0.03)]" />
        </div>
        <Skeleton className="h-4 w-72 bg-[rgba(255,255,255,0.03)]" />
        <div className="border-t border-[rgba(255,255,255,0.04)] pt-4 space-y-3">
          <Skeleton className="h-6 w-36 bg-[rgba(255,255,255,0.03)]" />
          <Skeleton className="h-4 w-full bg-[rgba(255,255,255,0.03)]" />
          <Skeleton className="h-4 w-3/4 bg-[rgba(255,255,255,0.03)]" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <p className="text-[#64748b]">Session not found</p>
      </div>
    );
  }

  const sourceRepo = session.sourceContext?.source
    ?.replace("sources/", "")
    .replace("https://github.com/", "");
  const branch = session.sourceContext?.githubRepoContext?.startingBranch || "main";
  const stateConfig = getStateBadgeConfig(session.state);
  const isCompleted = session.state === "COMPLETED" || session.state === "FAILED";

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "#0a0a0f" }}>
      {/* Session Header */}
      <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.04)] relative" style={{ background: "rgba(12,12,20,0.8)" }}>
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(129, 140, 248, 0.2) 50%, transparent 100%)" }} />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-agent flex items-center justify-center shrink-0">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white truncate tracking-tight">
                {session.title || "Untitled Session"}
              </h2>
              <span className={`status-chip ${stateConfig.bg} ${stateConfig.color}`}>
                {stateConfig.label}
              </span>
            </div>
            {session.prompt && (
              <p className="text-xs text-[#64748b] line-clamp-1 ml-10">
                {session.prompt}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 ml-10 text-xs text-[#4a4a5a]">
              {sourceRepo && (
                <span className="flex items-center gap-1.5">
                  <Github className="h-3 w-3 text-[#64748b]" />
                  <span className="font-mono">{sourceRepo}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3 w-3 text-[#64748b]" />
                <span className="font-mono">{branch}</span>
              </span>
              {session.createTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-[#64748b]" />
                  {formatFullDate(session.createTime)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Approve Plan Button */}
            {session.state === "AWAITING_APPROVAL" && (
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 text-white gap-1.5 h-8 rounded-lg text-xs font-medium shadow-md transition-all duration-200 interaction-scale animate-subtle-pulse"
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
                className="inline-flex items-center gap-1.5 text-[11px] text-[#818cf8] hover:text-[#6366f1] transition-colors px-2.5 py-1.5 rounded-md glass-card-refined hover-lift"
              >
                View PR <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Output Summary */}
        {session.output?.summary && (
          <div className="mt-3 ml-10 p-3 rounded-lg bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.08)]">
            <p className="text-xs text-[#10b981]">{session.output.summary}</p>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ActivityTimeline
          activities={activities}
          isLoading={isLoadingActivities}
        />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.04)] relative" style={{ background: "rgba(12,12,20,0.8)" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(129, 140, 248, 0.1) 50%, transparent 100%)" }} />
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Input
              placeholder={isCompleted ? "Session completed" : "Send instruction to Jules..."}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || isCompleted}
              className="input-refined text-white placeholder:text-[#3a3a4a] h-10 rounded-2xl pr-10 text-sm disabled:opacity-50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Zap className="h-4 w-4 text-[#2a2a3a]" />
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !messageInput.trim() || isCompleted}
            size="icon"
            className="bg-gradient-agent hover:brightness-115 text-white shrink-0 h-10 w-10 rounded-xl shadow-md hover-lift disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
