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
            <div className="w-8 h-8 rounded-full bg-[var(--wa-skeleton-bg)] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--wa-skeleton-bg)] rounded w-1/3" />
              <div className="h-3 bg-[var(--wa-skeleton-bg)] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--wa-text-muted)]">
        <Bot className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm">No activities yet</p>
        <p className="text-xs opacity-60 mt-1">Activities will appear as the session progresses</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full custom-scrollbar">
      <div ref={scrollRef} className="p-4 space-y-2">
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

/* Individual Activity Card - WhatsApp Chat Bubble Style */
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

  return (
    <div className={`flex ${!isAgent ? "justify-end" : "justify-start"} animate-smooth-appear`}>
      <div className="max-w-[85%]">
        <ActivityContent
          activity={activity}
          isExpanded={isExpanded}
          onToggleExpand={hasExpandableContent(activity) ? onToggleExpand : undefined}
        />
      </div>
    </div>
  );
}

function hasExpandableContent(activity: JulesActivity): boolean {
  return !!(
    activity.bashOutput ||
    activity.codeChange?.diff ||
    activity.type === "PLAN_GENERATED"
  );
}

/* Activity Content Renderer - WhatsApp Bubble Style */
function ActivityContent({
  activity,
  isExpanded,
  onToggleExpand,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
}) {
  const isAgent = activity.type !== "USER_MESSAGE";
  const timeStr = activity.createTime ? formatTime(activity.createTime) : "";

  switch (activity.type) {
    case "PLAN_GENERATED":
      return <PlanCard activity={activity} isExpanded={isExpanded} onToggleExpand={onToggleExpand} timeStr={timeStr} />;
    case "PLAN_APPROVED":
      return (
        <div className="wa-bubble-in px-3.5 py-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
            <span className="text-xs text-[#10b981] font-medium">Plan Approved</span>
          </div>
          {timeStr && <span className="wa-msg-time">{timeStr}</span>}
        </div>
      );
    case "BASH_OUTPUT":
      return <TerminalCard activity={activity} isExpanded={isExpanded} onToggleExpand={onToggleExpand} timeStr={timeStr} />;
    case "CODE_CHANGE":
      return <DiffCard activity={activity} isExpanded={isExpanded} onToggleExpand={onToggleExpand} timeStr={timeStr} />;
    case "SESSION_COMPLETED":
      return <CompletionCard activity={activity} timeStr={timeStr} />;
    case "PR_CREATED":
      return (
        <div className="wa-bubble-in px-3.5 py-2">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-[#00a884]" />
            <span className="text-sm text-[#00a884] font-medium">Pull Request Created</span>
          </div>
          {timeStr && <span className="wa-msg-time">{timeStr}</span>}
        </div>
      );
    case "ERROR":
      return (
        <div className="wa-bubble-in px-3.5 py-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-[#ef4444]" />
            <p className="text-sm text-[#ef4444]">{activity.description || "An error occurred"}</p>
          </div>
          {timeStr && <span className="wa-msg-time">{timeStr}</span>}
        </div>
      );
    case "USER_MESSAGE":
      return (
        <div className="wa-bubble-out px-3.5 py-2">
          <p className="text-sm text-[var(--wa-text)] leading-relaxed">{activity.description}</p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {timeStr && <span className="wa-msg-time">{timeStr}</span>}
            {/* WhatsApp double check */}
            <svg className="h-4 w-3.5 text-[#53bdeb]" viewBox="0 0 16 11" fill="none">
              <path d="M11.07 0L5.51 5.56L3.93 3.98L2.51 5.4L5.51 8.4L12.49 1.42L11.07 0Z" fill="currentColor"/>
              <path d="M14.07 0L8.51 5.56L7.72 4.77L6.3 6.19L8.51 8.4L15.49 1.42L14.07 0Z" fill="currentColor"/>
            </svg>
          </div>
        </div>
      );
    default:
      return (
        <div className="wa-bubble-in px-3.5 py-2">
          {activity.description && (
            <p className="text-sm text-[var(--wa-text)] leading-relaxed">{activity.description}</p>
          )}
          {activity.progress && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 text-[#00a884] animate-spin" />
              <span className="text-[10px] text-[var(--wa-text-muted)]">{activity.progress}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-1 mt-0.5">
            {timeStr && <span className="wa-msg-time">{timeStr}</span>}
          </div>
        </div>
      );
  }
}

/* Plan Card - WhatsApp themed */
function PlanCard({
  activity,
  isExpanded,
  onToggleExpand,
  timeStr,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
  timeStr: string;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="wa-bubble-in px-0 py-0 overflow-hidden">
        {/* Plan header */}
        <div
          className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-[var(--wa-hover-bg)] transition-colors"
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-xs font-semibold text-[#f59e0b]">Plan</span>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-[var(--wa-text-muted)] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        {activity.description && !isExpanded && (
          <div className="px-3.5 pb-2.5">
            <p className="text-xs text-[var(--wa-text-muted)] line-clamp-2">{activity.description}</p>
          </div>
        )}

        <CollapsibleContent>
          <div className="px-3.5 pb-3 border-t border-[var(--wa-border)] pt-2.5">
            {activity.description && (
              <p className="text-sm text-[var(--wa-text)] mb-3 leading-relaxed">{activity.description}</p>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--wa-text-muted)]">
              <Play className="h-3 w-3" />
              <span>Expand to view full plan details</span>
            </div>
          </div>
        </CollapsibleContent>

        {/* Timestamp */}
        <div className="px-3.5 pb-2 flex items-center justify-end gap-1">
          {timeStr && <span className="wa-msg-time">{timeStr}</span>}
        </div>
      </div>
    </Collapsible>
  );
}

/* Terminal Card - WhatsApp themed */
function TerminalCard({
  activity,
  isExpanded,
  onToggleExpand,
  timeStr,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
  timeStr: string;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="wa-bubble-in px-0 py-0 overflow-hidden">
        {/* Terminal header */}
        <div
          className="flex items-center gap-2 px-3.5 py-2 cursor-pointer hover:bg-[var(--wa-hover-bg)] transition-colors"
          onClick={onToggleExpand}
        >
          <Terminal className="h-3.5 w-3.5 text-[var(--wa-text-muted)]" />
          <span className="text-[10px] text-[var(--wa-text-muted)] font-mono">bash</span>
          <ChevronDown className={`h-3 w-3 text-[var(--wa-text-muted)] ml-auto transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        <CollapsibleContent>
          <div className="terminal-card border-0 rounded-none custom-scrollbar max-h-64 overflow-y-auto">
            <div className="terminal-body">
              {activity.description && (
                <div className="mb-2">
                  <span className="text-[#10b981] font-semibold">$</span>{" "}
                  <span className="text-[var(--wa-text-muted)]">{activity.description}</span>
                </div>
              )}
              {activity.bashOutput && (
                <pre className="text-[var(--wa-text)] whitespace-pre-wrap break-all leading-relaxed text-[11px]">{activity.bashOutput}</pre>
              )}
            </div>
          </div>
        </CollapsibleContent>

        {!isExpanded && activity.description && (
          <div className="px-3.5 py-2">
            <span className="text-[10px] font-mono text-[#10b981]">$</span>{" "}
            <span className="text-[10px] font-mono text-[var(--wa-text-muted)]">{activity.description}</span>
          </div>
        )}

        {/* Timestamp */}
        <div className="px-3.5 pb-2 flex items-center justify-end gap-1">
          {timeStr && <span className="wa-msg-time">{timeStr}</span>}
        </div>
      </div>
    </Collapsible>
  );
}

/* Diff Card - WhatsApp themed */
function DiffCard({
  activity,
  isExpanded,
  onToggleExpand,
  timeStr,
}: {
  activity: JulesActivity;
  isExpanded: boolean;
  onToggleExpand?: () => void;
  timeStr: string;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="wa-bubble-in px-0 py-0 overflow-hidden">
        {/* File header */}
        <div
          className="flex items-center gap-2 px-3.5 py-2 cursor-pointer hover:bg-[var(--wa-hover-bg)] transition-colors"
          onClick={onToggleExpand}
        >
          <FileCode2 className="h-3.5 w-3.5 text-[#06b6d4]" />
          <span className="text-[10px] text-[var(--wa-text-muted)] font-mono truncate">
            {activity.codeChange?.file || "Code Change"}
          </span>
          <ChevronDown className={`h-3 w-3 text-[var(--wa-text-muted)] ml-auto shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
        </div>

        <CollapsibleContent>
          <div className="terminal-card border-0 rounded-none custom-scrollbar max-h-64 overflow-y-auto">
            <div className="terminal-body">
              {activity.codeChange?.description && (
                <p className="text-[10px] text-[var(--wa-text-muted)] mb-2">{activity.codeChange.description}</p>
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
                            : "text-[var(--wa-text)]"
                      }
                    >
                      {line}
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
        </CollapsibleContent>

        {!isExpanded && activity.codeChange?.description && (
          <div className="px-3.5 py-2">
            <p className="text-[10px] text-[var(--wa-text-muted)] truncate">{activity.codeChange.description}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="px-3.5 pb-2 flex items-center justify-end gap-1">
          {timeStr && <span className="wa-msg-time">{timeStr}</span>}
        </div>
      </div>
    </Collapsible>
  );
}

/* Completion Card - WhatsApp green themed */
function CompletionCard({ activity, timeStr }: { activity: JulesActivity; timeStr: string }) {
  return (
    <div className="wa-bubble-in px-3.5 py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-[#10b981]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#10b981]">Mission Completed</p>
          {activity.description && (
            <p className="text-xs text-[var(--wa-text-muted)] mt-0.5">{activity.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-1">
        {timeStr && <span className="wa-msg-time">{timeStr}</span>}
      </div>
    </div>
  );
}
