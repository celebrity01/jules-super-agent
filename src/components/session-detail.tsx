"use client";

import { useState, useEffect, useCallback } from "react";
import { JulesSession, JulesActivity, getSession, listActivities, approvePlan, sendMessage } from "@/lib/jules-client";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Bot,
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

function getStateBadgeVariant(state?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "COMPLETED":
      return "default";
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStateLabel(state?: string): string {
  if (!state) return "Unknown";
  return state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Separator />
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Session not found</p>
      </div>
    );
  }

  const sourceRepo = session.sourceContext?.source
    ?.replace("sources/", "")
    .replace("https://github.com/", "");
  const branch = session.sourceContext?.githubRepoContext?.startingBranch || "main";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Session Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold truncate">
                {session.title || "Untitled Session"}
              </h2>
              <Badge variant={getStateBadgeVariant(session.state)}>
                {getStateLabel(session.state)}
              </Badge>
            </div>
            {session.prompt && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {session.prompt}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {sourceRepo && (
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {sourceRepo}
                </span>
              )}
              <span className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                {branch}
              </span>
              {session.createTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatFullDate(session.createTime)}
                </span>
              )}
            </div>
          </div>

          {/* Approve Plan Button */}
          {session.state === "AWAITING_APPROVAL" && (
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0"
              size="sm"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve Plan
            </Button>
          )}

          {/* Output Links */}
          {session.output && (
            <div className="flex items-center gap-2 shrink-0">
              {session.output.pullRequestUrl && (
                <a
                  href={session.output.pullRequestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#4285F4] hover:underline"
                >
                  View PR <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Session Output Summary */}
        {session.output?.summary && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-sm text-emerald-800">{session.output.summary}</p>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 min-h-0 overflow-hidden bg-slate-50">
        <ActivityTimeline
          activities={activities}
          isLoading={isLoadingActivities}
        />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Send a follow-up message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="pr-10"
            />
            <Bot className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !messageInput.trim()}
            size="icon"
            className="bg-[#4285F4] hover:bg-[#3367D6] text-white shrink-0"
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
