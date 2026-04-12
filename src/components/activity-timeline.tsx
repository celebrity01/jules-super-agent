"use client";

import { JulesActivity } from "@/lib/jules-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Bot,
  User,
  CheckCircle2,
  ChevronDown,
  Terminal,
  FileCode2,
  Loader2,
  Lightbulb,
  GitPullRequest,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

interface ActivityTimelineProps {
  activities: JulesActivity[];
  isLoading: boolean;
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getActivityIcon(type?: string) {
  switch (type) {
    case "PLAN_GENERATED":
      return <Lightbulb className="h-4 w-4" />;
    case "PLAN_APPROVED":
      return <CheckCircle2 className="h-4 w-4" />;
    case "PROGRESS":
      return <Loader2 className="h-4 w-4" />;
    case "BASH_OUTPUT":
      return <Terminal className="h-4 w-4" />;
    case "CODE_CHANGE":
      return <FileCode2 className="h-4 w-4" />;
    case "SESSION_COMPLETED":
      return <CheckCircle2 className="h-4 w-4" />;
    case "PR_CREATED":
      return <GitPullRequest className="h-4 w-4" />;
    case "ERROR":
      return <AlertCircle className="h-4 w-4" />;
    case "USER_MESSAGE":
      return <User className="h-4 w-4" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
}

function getActivityColor(type?: string): string {
  if (type === "USER_MESSAGE") return "text-emerald-500";
  switch (type) {
    case "PLAN_GENERATED":
      return "text-amber-500";
    case "PLAN_APPROVED":
      return "text-emerald-500";
    case "SESSION_COMPLETED":
      return "text-emerald-500";
    case "PR_CREATED":
      return "text-[#4285F4]";
    case "ERROR":
      return "text-destructive";
    case "BASH_OUTPUT":
      return "text-purple-500";
    case "CODE_CHANGE":
      return "text-cyan-500";
    default:
      return "text-[#4285F4]";
  }
}

function getTimelineDotColor(type?: string): string {
  if (type === "USER_MESSAGE") return "bg-emerald-500";
  switch (type) {
    case "PLAN_GENERATED":
      return "bg-amber-500";
    case "PLAN_APPROVED":
      return "bg-emerald-500";
    case "SESSION_COMPLETED":
      return "bg-emerald-500";
    case "PR_CREATED":
      return "bg-[#4285F4]";
    case "ERROR":
      return "bg-destructive";
    default:
      return "bg-[#4285F4]";
  }
}

function getTypeLabel(type?: string): string {
  if (!type) return "Activity";
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Bot className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No activities yet</p>
        <p className="text-xs opacity-60">Activities will appear as the session progresses</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="relative p-4 space-y-0">
        {activities.map((activity, index) => {
          const isLast = index === activities.length - 1;
          const isExpanded = expandedItems.has(activity.name);
          const hasExpandableContent =
            activity.bashOutput ||
            activity.codeChange?.diff ||
            (activity.type === "PLAN_GENERATED");

          return (
            <div key={activity.name} className="relative flex gap-4 pb-6">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" />
              )}

              {/* Timeline dot */}
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm ${getTimelineDotColor(activity.type)}`}
              >
                <div className="text-white">{getActivityIcon(activity.type)}</div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 -mt-0.5">
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => hasExpandableContent && toggleExpand(activity.name)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <CollapsibleTrigger asChild={!!hasExpandableContent}>
                      <div
                        className={`flex items-center gap-2 ${hasExpandableContent ? "cursor-pointer hover:opacity-80" : ""}`}
                      >
                        <span className={`text-sm font-medium ${getActivityColor(activity.type)}`}>
                          {getTypeLabel(activity.type)}
                        </span>
                        {hasExpandableContent && (
                          <ChevronDown
                            className={`h-3 w-3 text-muted-foreground transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    {activity.createTime && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(activity.createTime)}
                      </span>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {activity.description}
                    </p>
                  )}

                  <CollapsibleContent>
                    {/* Bash Output */}
                    {activity.bashOutput && (
                      <div className="mt-2 rounded-lg bg-slate-900 text-slate-100 p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-all">{activity.bashOutput}</pre>
                      </div>
                    )}

                    {/* Code Change Diff */}
                    {activity.codeChange?.diff && (
                      <div className="mt-2 rounded-lg bg-slate-900 text-slate-100 p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                        <div className="mb-1 text-slate-400 text-[10px] uppercase tracking-wider">
                          {activity.codeChange.file || "Code Change"}
                        </div>
                        <pre className="whitespace-pre-wrap break-all">{activity.codeChange.diff}</pre>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Progress indicator */}
                {activity.progress && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {activity.progress}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
