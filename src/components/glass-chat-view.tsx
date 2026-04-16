"use client";

import {
  JulesSession,
  JulesActivity,
  getActivityType,
  isUserActivity,
  getBashArtifact,
  getChangeSetArtifact,
  getSession,
  listActivities,
  approvePlan,
  sendMessage,
} from "@/lib/jules-client";
import {
  ArrowLeft,
  Bot,
  Send,
  MoreVertical,
  FolderPlus,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Terminal,
  FileCode2,
  Lightbulb,
  AlertCircle,
  Sparkles,
  GitPullRequest,
  ChevronDown,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GlassChatViewProps {
  sessionId: string;
  apiKey: string;
  onBack: () => void;
  onAddRepo: () => void;
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

function getStateInfo(state?: string): { label: string; color: string } {
  switch (state) {
    case "COMPLETED": return { label: "Completed", color: "#00E676" };
    case "FAILED": return { label: "Failed", color: "#FF2A5F" };
    case "ACTIVE":
    case "RUNNING": return { label: "Running", color: "#00E5FF" };
    case "AWAITING_APPROVAL": return { label: "Awaiting Approval", color: "#B388FF" };
    case "AWAITING_PLAN_APPROVAL": return { label: "Awaiting Plan Approval", color: "#B388FF" };
    default: return { label: "Unknown", color: "#547B88" };
  }
}

function isActiveState(state?: string): boolean {
  return state === "ACTIVE" || state === "RUNNING" || state === "AWAITING_APPROVAL" || state === "AWAITING_PLAN_APPROVAL";
}

function isAwaitingApproval(state?: string): boolean {
  return state === "AWAITING_APPROVAL" || state === "AWAITING_PLAN_APPROVAL";
}

export function GlassChatView({ sessionId, apiKey, onBack, onAddRepo }: GlassChatViewProps) {
  const [session, setSession] = useState<JulesSession | null>(null);
  const [activities, setActivities] = useState<JulesActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [sessionData, activityData] = await Promise.all([
        getSession(apiKey, sessionId),
        listActivities(apiKey, sessionId),
      ]);
      setSession(sessionData);
      setActivities(activityData.activities || []);
    } catch (err) {
      console.error("Failed to fetch session data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh for active sessions
  useEffect(() => {
    if (!session || !isActiveState(session.state)) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [session?.state, fetchData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approvePlan(apiKey, sessionId);
      await fetchData();
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleSend = async () => {
    if (!messageInput.trim()) return;
    const msg = messageInput.trim();
    setIsSending(true);
    setSendError(null);
    try {
      await sendMessage(apiKey, sessionId, msg);
      setMessageInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      // Refresh data to show the new message
      await fetchData();
    } catch (err) {
      console.error("Failed to send:", err);
      setSendError(err instanceof Error ? err.message : "Failed to send message");
      // Keep the message in input so user doesn't lose it
      setMessageInput(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyId(id);
      setTimeout(() => setCopyId(null), 2000);
    });
  };

  // Get PR URL from session outputs
  const pullRequestUrl = session?.outputs?.find(o => o.pullRequest)?.pullRequest?.url;
  const commitUrl = session?.outputs?.find(o => o.commitUrl)?.commitUrl;

  // Check if there's a PLAN_GENERATED activity that hasn't been approved yet
  const hasPendingPlan = activities.some(a => getActivityType(a) === "PLAN_GENERATED") &&
    !activities.some(a => getActivityType(a) === "PLAN_APPROVED");
  const needsApproval = isAwaitingApproval(session?.state) || hasPendingPlan;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="h-16 glass-surface flex items-center px-3 glass-border-b z-30">
          <button onClick={onBack} className="p-3 text-[#547B88]"><ArrowLeft size={26} /></button>
          <div className="flex-1 space-y-2 ml-3">
            <div className="h-4 w-32 skeleton-shimmer rounded" />
            <div className="h-2 w-20 skeleton-shimmer rounded" />
          </div>
        </header>
        <div className="flex-1 p-5 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] h-20 skeleton-shimmer rounded-2xl w-64" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[#547B88]">
        <Bot size={48} className="opacity-20 mb-4" />
        <p className="text-sm">Session not found</p>
        <button onClick={onBack} className="mt-4 text-[#00E5FF] text-sm">Go back</button>
      </div>
    );
  }

  const stateInfo = getStateInfo(session.state);
  const isCompleted = session.state === "COMPLETED" || session.state === "FAILED";

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="h-16 glass-surface flex items-center px-3 glass-border-b sticky top-0 z-30">
        <button onClick={onBack} className="p-3 text-[#547B88] active:scale-90 transition-all rounded-full hover:bg-white/5">
          <ArrowLeft size={26} />
        </button>
        <div className="flex-1 flex items-center gap-3 ml-1">
          <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl text-[#00E5FF] shadow-lg">
            <Bot size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[#E0F7FA] font-bold text-sm truncate leading-tight">
              {session.title || "Untitled Session"}
            </h2>
            <p className="text-[10px] uppercase font-mono tracking-wider" style={{ color: stateInfo.color }}>
              {stateInfo.label}
              {isActiveState(session.state) && <span className="animate-subtle-pulse ml-1">●</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {needsApproval && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-4 py-2 bg-[#B388FF] text-[#071115] rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_4px_15px_rgba(179,136,255,0.3)]"
            >
              {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Approve Plan
            </button>
          )}
          {pullRequestUrl && (
            <a
              href={pullRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 text-[#00E676] hover:bg-white/5 rounded-full transition-all"
              title="View Pull Request"
            >
              <GitPullRequest size={20} />
            </a>
          )}
          {session.url && (
            <a
              href={session.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 text-[#00E5FF] hover:bg-white/5 rounded-full transition-all"
              title="View on Jules"
            >
              <ExternalLink size={20} />
            </a>
          )}
          <button onClick={onAddRepo} className="p-2.5 text-[#E0F7FA] hover:bg-white/5 rounded-full transition-all">
            <FolderPlus size={20} />
          </button>
          <button className="p-2.5 text-[#547B88] hover:bg-white/5 rounded-full transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 pb-40 z-10">
        {activities.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 glass-surface flex items-center justify-center rounded-2xl text-[#00E5FF] mb-8 shadow-[0_0_50px_rgba(0,229,255,0.1)] border border-white/10">
              <Bot size={48} />
            </div>
            <h3 className="text-[#E0F7FA] text-2xl font-bold mb-3 tracking-tight">System Initialization</h3>
            <p className="text-[#547B88] text-sm max-w-xs font-mono leading-relaxed opacity-60">
              Session established. Context matrix is ready for input.
            </p>
          </div>
        )}

        {activities.map((activity, index) => (
          <ActivityMessage
            key={activity.name}
            activity={activity}
            isLastActivity={index === activities.length - 1}
            needsApproval={needsApproval}
            isApproving={isApproving}
            onApprove={handleApprove}
            copyId={copyId}
            onCopy={copyToClipboard}
          />
        ))}
      </div>

      {/* Approval Banner - shows prominently when plan needs approval */}
      {needsApproval && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-20">
          <div className="bg-[#B388FF]/10 border border-[#B388FF]/30 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md shadow-[0_10px_30px_rgba(179,136,255,0.15)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#B388FF]/20 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-[#B388FF]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#B388FF]">Plan Awaiting Approval</p>
                <p className="text-[10px] text-[#547B88] font-mono">Jules needs your approval to proceed</p>
              </div>
            </div>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-5 py-3 bg-[#B388FF] text-[#071115] rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center gap-2 shadow-[0_4px_20px_rgba(179,136,255,0.4)] disabled:opacity-50"
            >
              {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Approve
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl glass-surface p-4 glass-border-t z-30 pb-safe">
        {/* Error message */}
        {sendError && (
          <div className="mb-3 px-4 py-2 bg-[#FF2A5F]/10 border border-[#FF2A5F]/20 rounded-xl text-xs text-[#FF2A5F] flex items-center justify-between">
            <span>{sendError}</span>
            <button onClick={() => setSendError(null)} className="text-[#FF2A5F] ml-2 font-bold">✕</button>
          </div>
        )}
        <div className="flex gap-3 items-end max-w-3xl mx-auto">
          <div className="flex-1 bg-white/5 border border-white/10 px-5 py-3 flex items-center rounded-2xl focus-within:border-[#00E5FF]/40 transition-all shadow-inner">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={isCompleted ? "Session completed" : needsApproval ? "Reply or approve plan..." : "Send message to Jules..."}
              value={messageInput}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={isSending || isCompleted}
              className="bg-transparent border-none outline-none w-full text-[15px] text-[#E0F7FA] placeholder-[#1A3540] font-mono resize-none max-h-40 leading-relaxed disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isSending || isCompleted || !messageInput.trim()}
            className="bg-[#00E5FF] text-[#071115] w-14 h-14 flex items-center justify-center rounded-2xl active:scale-90 transition-all shrink-0 shadow-[0_0_20px_rgba(0,229,255,0.3)] disabled:opacity-40 disabled:shadow-none"
          >
            {isSending ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Individual Activity Message Bubble */
function ActivityMessage({
  activity,
  isLastActivity,
  needsApproval,
  isApproving,
  onApprove,
  copyId,
  onCopy,
}: {
  activity: JulesActivity;
  isLastActivity: boolean;
  needsApproval: boolean;
  isApproving: boolean;
  onApprove: () => void;
  copyId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const type = getActivityType(activity);
  const isUser = isUserActivity(activity);
  const timeStr = activity.createTime ? formatTime(activity.createTime) : "";

  // Get artifacts
  const bashArtifact = getBashArtifact(activity);
  const changeSetArtifact = getChangeSetArtifact(activity);

  const [isExpanded, setIsExpanded] = useState(
    !!(bashArtifact || changeSetArtifact?.gitPatch?.unidiffPatch)
  );

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-in`}>
      <div
        className={`max-w-[88%] p-4 text-[14px] leading-relaxed rounded-2xl border shadow-xl
          ${isUser
            ? "glass-surface border-[#00E5FF]/30 text-[#E0F7FA]"
            : "glass-surface-heavy border-white/5 text-[#E0F7FA]"}`}
      >
        {/* Agent Message */}
        {type === "AGENT_MESSAGED" && activity.agentMessaged?.agentMessage && (
          <div className="flex items-start gap-3">
            <Bot size={16} className="text-[#00E5FF] shrink-0 mt-0.5" />
            <div>
              <p className="whitespace-pre-wrap">{activity.agentMessaged.agentMessage}</p>
              {timeStr && <span className="block mt-2 text-[10px] text-[#547B88] font-mono text-right opacity-40">{timeStr}</span>}
            </div>
          </div>
        )}

        {/* User Message */}
        {type === "USER_MESSAGED" && (
          <>
            <p>{activity.userMessaged?.userMessage || activity.description}</p>
            {timeStr && (
              <div className="mt-2 text-[10px] text-[#547B88] font-mono text-right tracking-widest uppercase opacity-40">
                {timeStr}
              </div>
            )}
          </>
        )}

        {/* Plan Generated */}
        {type === "PLAN_GENERATED" && (
          <div>
            <PlanContent
              plan={activity.planGenerated?.plan}
              description={activity.description}
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
              timeStr={timeStr}
            />
            {/* Inline Approve button right after the plan */}
            {needsApproval && (
              <div className="mt-4 pt-3 border-t border-[#B388FF]/20">
                <button
                  onClick={onApprove}
                  disabled={isApproving}
                  className="w-full py-3 bg-[#B388FF] text-[#071115] rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(179,136,255,0.3)] disabled:opacity-50"
                >
                  {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Approve This Plan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Plan Approved */}
        {type === "PLAN_APPROVED" && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#00E676]" />
            <span className="text-sm text-[#00E676] font-medium">Plan Approved</span>
            {activity.planApproved?.planId && (
              <span className="text-[10px] text-[#547B88] font-mono">#{activity.planApproved.planId}</span>
            )}
            {timeStr && <span className="ml-auto text-[10px] text-[#547B88] font-mono opacity-40">{timeStr}</span>}
          </div>
        )}

        {/* Progress Updated */}
        {type === "PROGRESS_UPDATED" && (
          <div className="flex items-start gap-3">
            <Loader2 className="h-4 w-4 text-[#00E5FF] animate-spin shrink-0 mt-0.5" />
            <div>
              {activity.progressUpdated?.title && (
                <p className="text-sm font-medium text-[#E0F7FA]">{activity.progressUpdated.title}</p>
              )}
              {activity.progressUpdated?.description && (
                <p className="text-xs text-[#547B88] mt-1">{activity.progressUpdated.description}</p>
              )}
              {timeStr && <span className="block mt-2 text-[10px] text-[#547B88] font-mono text-right opacity-40">{timeStr}</span>}
            </div>
          </div>
        )}

        {/* Session Completed */}
        {type === "SESSION_COMPLETED" && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(0,230,118,0.1)] flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[#00E676]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#00E676]">Mission Completed</p>
              {activity.description && <p className="text-xs text-[#547B88] mt-0.5">{activity.description}</p>}
            </div>
            {timeStr && <span className="ml-auto text-[10px] text-[#547B88] font-mono opacity-40">{timeStr}</span>}
          </div>
        )}

        {/* Session Failed */}
        {type === "SESSION_FAILED" && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(255,42,95,0.1)] flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-[#FF2A5F]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#FF2A5F]">Mission Failed</p>
              {activity.sessionFailed?.reason && <p className="text-xs text-[#547B88] mt-0.5">{activity.sessionFailed.reason}</p>}
            </div>
            {timeStr && <span className="ml-auto text-[10px] text-[#547B88] font-mono opacity-40">{timeStr}</span>}
          </div>
        )}

        {/* Bash Output Artifact */}
        {bashArtifact && (
          <TerminalContent
            command={bashArtifact.command || ""}
            output={bashArtifact.output || ""}
            exitCode={bashArtifact.exitCode}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
            timeStr={timeStr}
            activityName={activity.name}
            copyId={copyId}
            onCopy={onCopy}
          />
        )}

        {/* Code Change Artifact */}
        {changeSetArtifact?.gitPatch?.unidiffPatch && (
          <DiffContent
            patch={changeSetArtifact.gitPatch.unidiffPatch}
            source={changeSetArtifact.source || ""}
            suggestedMessage={changeSetArtifact.gitPatch.suggestedCommitMessage}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
            timeStr={timeStr}
          />
        )}

        {/* Fallback for unknown types */}
        {type === "UNKNOWN" && activity.description && (
          <div className="flex items-start gap-3">
            <MessageSquare size={16} className="text-[#547B88] shrink-0 mt-0.5" />
            <div>
              <p>{activity.description}</p>
              {timeStr && <span className="block mt-2 text-[10px] text-[#547B88] font-mono text-right opacity-40">{timeStr}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Plan Card */
function PlanContent({ plan, description, isExpanded, onToggle, timeStr }: {
  plan?: { id?: string; steps?: Array<{ id?: string; title?: string; description?: string; index?: number }>; createTime?: string };
  description?: string;
  isExpanded: boolean;
  onToggle: () => void;
  timeStr: string;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-[#B388FF]" />
          <span className="text-xs font-bold text-[#B388FF]">Plan</span>
          {plan?.steps && (
            <span className="text-[10px] text-[#547B88] font-mono">{plan.steps.length} steps</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-[#547B88] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </div>
      {!isExpanded && description && (
        <p className="text-xs text-[#547B88] mt-2 line-clamp-2">{description}</p>
      )}
      <CollapsibleContent>
        {description && (
          <p className="text-sm text-[#E0F7FA] mt-3 leading-relaxed">{description}</p>
        )}
        {plan?.steps && plan.steps.length > 0 && (
          <div className="mt-3 space-y-2">
            {plan.steps
              .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
              .map((step, i) => (
                <div key={step.id || i} className="flex items-start gap-3 p-2 bg-white/5 rounded-lg">
                  <span className="text-[10px] font-mono text-[#B388FF] shrink-0 mt-0.5">{(step.index ?? i) + 1}.</span>
                  <div>
                    {step.title && <p className="text-sm font-medium text-[#E0F7FA]">{step.title}</p>}
                    {step.description && <p className="text-xs text-[#547B88] mt-0.5">{step.description}</p>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CollapsibleContent>
      {timeStr && <span className="block mt-2 text-[10px] text-[#547B88] font-mono text-right opacity-40">{timeStr}</span>}
    </Collapsible>
  );
}

/* Terminal Card */
function TerminalContent({ command, output, exitCode, isExpanded, onToggle, timeStr, activityName, copyId, onCopy }: {
  command: string;
  output: string;
  exitCode?: number;
  isExpanded: boolean;
  onToggle: () => void;
  timeStr: string;
  activityName: string;
  copyId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#547B88]" />
          <span className="text-[10px] font-mono text-[#547B88]">bash</span>
          {exitCode !== undefined && (
            <span className={`text-[9px] font-mono ${exitCode === 0 ? "text-[#00E676]" : "text-[#FF2A5F]"}`}>
              exit {exitCode}
            </span>
          )}
        </div>
        <ChevronDown className={`h-3 w-3 text-[#547B88] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </div>
      <CollapsibleContent>
        <div className="mt-3 relative">
          <button
            onClick={() => onCopy(output || command, activityName)}
            className="absolute right-2 top-2 p-1.5 bg-black/40 border border-white/10 text-[#547B88] hover:text-[#00E5FF] rounded-lg transition-all z-10"
          >
            {copyId === activityName ? <Check size={14} className="text-[#00E676]" /> : <Copy size={14} />}
          </button>
          <pre className="bg-[#04090B]/60 p-4 rounded-xl font-mono text-[12px] overflow-x-auto text-[#00E5FF]/80 leading-6 border border-white/5 backdrop-blur-sm max-h-64 overflow-y-auto">
            {command && (
              <div className="mb-2">
                <span className="text-[#00E676] font-semibold">$</span>{" "}
                <span className="text-[#547B88]">{command}</span>
              </div>
            )}
            {output && <code>{output}</code>}
          </pre>
        </div>
      </CollapsibleContent>
      {!isExpanded && command && (
        <div className="mt-2">
          <span className="text-[10px] font-mono text-[#00E676]">$</span>{" "}
          <span className="text-[10px] font-mono text-[#547B88]">{command}</span>
        </div>
      )}
      {timeStr && <span className="block mt-2 text-[10px] text-[#547B88] font-mono text-right opacity-40">{timeStr}</span>}
    </Collapsible>
  );
}

/* Diff Card */
function DiffContent({ patch, source, suggestedMessage, isExpanded, onToggle, timeStr }: {
  patch: string;
  source: string;
  suggestedMessage?: string;
  isExpanded: boolean;
  onToggle: () => void;
  timeStr: string;
}) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <FileCode2 size={14} className="text-[#00E5FF]" />
          <span className="text-[10px] font-mono text-[#547B88] truncate max-w-[200px]">
            {source ? source.replace("sources/", "") : "Code Change"}
          </span>
        </div>
        <ChevronDown className={`h-3 w-3 text-[#547B88] shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </div>
      <CollapsibleContent>
        <div className="mt-3 bg-[#04090B]/60 p-4 rounded-xl font-mono text-[12px] overflow-x-auto leading-6 border border-white/5 backdrop-blur-sm max-h-64 overflow-y-auto">
          {patch.split("\n").map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith("+") ? "text-[#00E676] bg-[rgba(0,230,118,0.06)] border-l-2 border-[#00E676] px-2" :
                line.startsWith("-") ? "text-[#FF2A5F] bg-[rgba(255,42,95,0.06)] border-l-2 border-[#FF2A5F] px-2" :
                "text-[#E0F7FA]/60"
              }
            >
              {line}
            </div>
          ))}
        </div>
        {suggestedMessage && (
          <p className="text-[10px] text-[#547B88] mt-2 italic">Suggested: {suggestedMessage}</p>
        )}
      </CollapsibleContent>
      {timeStr && <span className="block mt-2 text-[10px] text-[#547B88] font-mono text-right opacity-40">{timeStr}</span>}
    </Collapsible>
  );
}
