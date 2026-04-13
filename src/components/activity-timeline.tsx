"use client";

import { JulesActivity } from "@/lib/jules-client";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Sparkles,
  Play,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";

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

export function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  const [userToggled, setUserToggled] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Compute auto-expanded items (items with bashOutput or codeChange diff)
  const autoExpanded = useMemo(() => {
    const expanded = new Set<string>();
    activities.forEach((activity) => {
      if (activity.bashOutput || activity.codeChange?.diff) {
        expanded.add(activity.name);
      }
    });
    return expanded;
  }, [activities]);

  // Effective expanded set = auto-expanded + user toggled
  const expandedItems = useMemo(() => {
    return new Set([...autoExpanded, ...userToggled]);
  }, [autoExpanded, userToggled]);

  // Scroll to bottom on new activities
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  const toggleExpand = (name: string) => {
    setUserToggled((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        // If it's auto-expanded, removing from userToggled won't collapse it
        // We need to track explicit collapses too
      } else {
        next.add(name);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.03)] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[rgba(255,255,255,0.03)] rounded w-1/3" />
              <div className="h-3 bg-[rgba(255,255,255,0.02)] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#4a4a5a]">
        <Bot className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm">No activities yet</p>
        <p className="text-xs opacity-60 mt-1">Activities will appear as the session progresses</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full dark-scrollbar">
      <div ref={scrollRef} className="p-5 space-y-1">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.name}
            activity={activity}
            isExpanded={expandedItems.has(activity.name)}
            onToggleExpand={() => toggleExpand(activity.name)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

/* Individual Activity Card - Chat Style */
function ActivityCard({
  activity,
  isExpanded,
  onToggleExpand,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const isAgent = activity.type !== "USER_MESSAGE";
  const hasExpandableContent =
    activity.bashOutput ||
    activity.codeChange?.diff ||
    activity.type === "PLAN_GENERATED";

  return (
    <div className={`animate-smooth-appear ${isAgent ? "" : "flex justify-end"}`}>
      <div className={`max-w-[85%] ${isAgent ? "" : ""}`}>
        {/* Activity header with avatar */}
        <div className={`flex items-start gap-2.5 ${!isAgent ? "flex-row-reverse" : ""}`}>
          {/* Avatar */}
          <div className="shrink-0 mt-0.5">
            <ActivityAvatar type={activity.type} />
          </div>

          {/* Content */}
          <div className={`flex-1 min-w-0 ${!isAgent ? "text-right" : ""}`}>
            {/* Name + Time */}
            <div className={`flex items-center gap-2 mb-1.5 ${!isAgent ? "flex-row-reverse" : ""}`}>
              <span className={`text-xs font-semibold tracking-wide ${isAgent ? "text-[#818cf8]" : "text-[#10b981]"}`}>
                {activity.type === "USER_MESSAGE" ? "You" : "Jules"}
              </span>
              {activity.createTime && (
                <span className="text-[10px] text-[#3a3a4a]">
                  {formatTime(activity.createTime)}
                </span>
              )}
            </div>

            {/* Activity Type Badge + Description */}
            <div className={`${!isAgent ? "text-left ml-auto" : ""}`}>
              <ActivityContent
                activity={activity}
                isExpanded={isExpanded}
                onToggleExpand={hasExpandableContent ? onToggleExpand : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Activity Avatar */
function ActivityAvatar({ type }: { type?: string }) {
  switch (type) {
    case "USER_MESSAGE":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center border border-[rgba(16,185,129,0.15)] shadow-sm">
          <User className="h-4 w-4 text-[#10b981]" />
        </div>
      );
    case "PLAN_GENERATED":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(245,158,11,0.1)] flex items-center justify-center border border-[rgba(245,158,11,0.15)] shadow-sm">
          <Lightbulb className="h-4 w-4 text-[#f59e0b]" />
        </div>
      );
    case "PLAN_APPROVED":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center border border-[rgba(16,185,129,0.15)] shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-[#10b981]" />
        </div>
      );
    case "BASH_OUTPUT":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(168,85,247,0.1)] flex items-center justify-center border border-[rgba(168,85,247,0.15)] shadow-sm">
          <Terminal className="h-4 w-4 text-[#a855f7]" />
        </div>
      );
    case "CODE_CHANGE":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(6,182,212,0.1)] flex items-center justify-center border border-[rgba(6,182,212,0.15)] shadow-sm">
          <FileCode2 className="h-4 w-4 text-[#06b6d4]" />
        </div>
      );
    case "SESSION_COMPLETED":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center border border-[rgba(16,185,129,0.15)] shadow-sm">
          <Sparkles className="h-4 w-4 text-[#10b981]" />
        </div>
      );
    case "PR_CREATED":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(129,140,248,0.1)] flex items-center justify-center border border-[rgba(129,140,248,0.15)] shadow-sm">
          <GitPullRequest className="h-4 w-4 text-[#818cf8]" />
        </div>
      );
    case "ERROR":
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center border border-[rgba(239,68,68,0.15)] shadow-sm">
          <AlertCircle className="h-4 w-4 text-[#ef4444]" />
        </div>
      );
    default:
      return (
        <div className="h-8 w-8 rounded-full bg-[rgba(129,140,248,0.1)] flex items-center justify-center border border-[rgba(129,140,248,0.15)] shadow-sm">
          <Bot className="h-4 w-4 text-[#818cf8]" />
        </div>
      );
  }
}

/* Activity Content Renderer */
function ActivityContent({
  activity,
  isExpanded,
  onToggleExpand,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
}) {
  switch (activity.type) {
    case "PLAN_GENERATED":
      return <PlanCard activity={activity} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />;
    case "PLAN_APPROVED":
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.1)]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
          <span className="text-xs text-[#10b981] font-medium">Plan Approved</span>
        </div>
      );
    case "BASH_OUTPUT":
      return <TerminalCard activity={activity} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />;
    case "CODE_CHANGE":
      return <DiffCard activity={activity} isExpanded={isExpanded} onToggleExpand={onToggleExpand} />;
    case "SESSION_COMPLETED":
      return <CompletionCard activity={activity} />;
    case "PR_CREATED":
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(129,140,248,0.06)] border border-[rgba(129,140,248,0.1)]">
          <GitPullRequest className="h-3.5 w-3.5 text-[#818cf8]" />
          <span className="text-xs text-[#818cf8] font-medium">Pull Request Created</span>
        </div>
      );
    case "ERROR":
      return (
        <div className="rounded-lg bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.08)] px-3 py-2">
          <p className="text-xs text-[#ef4444]">{activity.description || "An error occurred"}</p>
        </div>
      );
    case "USER_MESSAGE":
      return (
        <div className="inline-block bubble-user px-3.5 py-2">
          <p className="text-sm text-[#e2e8f0] leading-relaxed">{activity.description}</p>
        </div>
      );
    default:
      return (
        <div className="bubble-agent px-3.5 py-2">
          {activity.description && (
            <p className="text-sm text-[#94a3b8] leading-relaxed">{activity.description}</p>
          )}
          {activity.progress && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 text-[#818cf8] animate-spin" />
              <span className="text-[10px] text-[#64748b]">{activity.progress}</span>
            </div>
          )}
        </div>
      );
  }
}

/* Plan Card */
function PlanCard({
  activity,
  isExpanded,
  onToggleExpand,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        className="rounded-xl bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.08)] border-l-[3px] border-l-[rgba(245,158,11,0.3)] overflow-hidden cursor-pointer hover:bg-[rgba(245,158,11,0.06)] transition-all duration-200"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-xs font-semibold text-[#f59e0b]">Plan</span>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-[#64748b] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        {activity.description && !isExpanded && (
          <div className="px-3.5 pb-2.5">
            <p className="text-xs text-[#94a3b8] line-clamp-2">{activity.description}</p>
          </div>
        )}

        <CollapsibleContent>
          <div className="px-3.5 pb-3 border-t border-[rgba(245,158,11,0.06)] pt-2.5">
            {activity.description && (
              <p className="text-sm text-[#94a3b8] mb-3 leading-relaxed">{activity.description}</p>
            )}
            {/* Plan steps would be rendered here if available from session.latestPlan */}
            <div className="flex items-center gap-1.5 text-[10px] text-[#64748b]">
              <Play className="h-3 w-3" />
              <span>Expand to view full plan details</span>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* Terminal Card */
function TerminalCard({
  activity,
  isExpanded,
  onToggleExpand,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="terminal-card">
        {/* Terminal header */}
        <div
          className="terminal-header cursor-pointer glass-card-refined"
          onClick={onToggleExpand}
        >
          <div className="terminal-dot" style={{ background: "#ff5f57" }} />
          <div className="terminal-dot" style={{ background: "#febc2e" }} />
          <div className="terminal-dot" style={{ background: "#28c840" }} />
          <span className="text-[10px] text-[#4a4a5a] ml-2 font-mono">bash</span>
          <ChevronDown className={`h-3 w-3 text-[#4a4a5a] ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        <CollapsibleContent>
          <div className="terminal-body dark-scrollbar max-h-64 overflow-y-auto">
            {activity.description && (
              <div className="mb-2">
                <span className="text-[#10b981] font-semibold">$</span>{" "}
                <span className="text-[#94a3b8]">{activity.description}</span>
              </div>
            )}
            {activity.bashOutput && (
              <pre className="text-[#c9d1d9] whitespace-pre-wrap break-all leading-relaxed text-[11px]">{activity.bashOutput}</pre>
            )}
          </div>
        </CollapsibleContent>

        {!isExpanded && activity.description && (
          <div className="px-3 py-2">
            <span className="text-[10px] font-mono text-[#10b981]">$</span>{" "}
            <span className="text-[10px] font-mono text-[#4a4a5a]">{activity.description}</span>
          </div>
        )}
      </div>
    </Collapsible>
  );
}

/* Diff Card */
function DiffCard({
  activity,
  isExpanded,
  onToggleExpand,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="terminal-card">
        {/* File header */}
        <div
          className="terminal-header cursor-pointer"
          onClick={onToggleExpand}
        >
          <FileCode2 className="h-3.5 w-3.5 text-[#06b6d4]" />
          <span className="text-[10px] text-[#94a3b8] font-mono ml-1 truncate">
            {activity.codeChange?.file || "Code Change"}
          </span>
          <ChevronDown className={`h-3 w-3 text-[#4a4a5a] ml-auto shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        <CollapsibleContent>
          <div className="terminal-body dark-scrollbar max-h-64 overflow-y-auto">
            {activity.codeChange?.description && (
              <p className="text-[10px] text-[#64748b] mb-2">{activity.codeChange.description}</p>
            )}
            {activity.codeChange?.diff && (
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {activity.codeChange.diff.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.startsWith("+")
                        ? "diff-line-added text-[#7ee787]"
                        : line.startsWith("-")
                          ? "diff-line-removed text-[#ffa198]"
                          : "text-[#c9d1d9]"
                    }
                  >
                    {line}
                  </div>
                ))}
              </pre>
            )}
          </div>
        </CollapsibleContent>

        {!isExpanded && activity.codeChange?.description && (
          <div className="px-3 py-2">
            <p className="text-[10px] text-[#4a4a5a] truncate">{activity.codeChange.description}</p>
          </div>
        )}
      </div>
    </Collapsible>
  );
}

/* Completion Card */
function CompletionCard({ activity }: { activity: JulesActivity }) {
  return (
    <div className="rounded-xl bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.08)] border-l-[3px] border-l-[#10b981] px-4 py-3 glow-success animate-smooth-appear" style={{ animation: "smooth-appear 0.5s cubic-bezier(0.16, 1, 0.3, 1), subtle-pulse 2s ease-in-out 1" }}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-[#10b981]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#10b981]">Mission Completed</p>
          {activity.description && (
            <p className="text-xs text-[#64748b] mt-0.5">{activity.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
