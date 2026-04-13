"use client";

import { useMemo } from "react";
import {
  Bell,
  Search,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface GlassPingsViewProps {
  sessions: { name: string; title?: string; state?: string; createTime?: string }[];
  onAddRepo: () => void;
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  } catch {
    return dateStr;
  }
}

export function GlassPingsView({ sessions, onAddRepo }: GlassPingsViewProps) {
  // Derive pings from session states
  const pings = useMemo(() =>
    sessions
      .map((s) => {
        const sessionId = s.name.split("/").pop() || s.name;
        if (s.state === "COMPLETED") {
          return {
            time: s.createTime ? formatTime(s.createTime) : "--:--:--",
            type: "success" as const,
            msg: `Mission Complete: ${s.title || sessionId}`,
          };
        }
        if (s.state === "FAILED") {
          return {
            time: s.createTime ? formatTime(s.createTime) : "--:--:--",
            type: "error" as const,
            msg: `Mission Failed: ${s.title || sessionId}`,
          };
        }
        if (s.state === "AWAITING_APPROVAL") {
          return {
            time: s.createTime ? formatTime(s.createTime) : "--:--:--",
            type: "warning" as const,
            msg: `Approval Required: ${s.title || sessionId}`,
          };
        }
        if (s.state === "ACTIVE" || s.state === "RUNNING") {
          return {
            time: s.createTime ? formatTime(s.createTime) : "--:--:--",
            type: "info" as const,
            msg: `Mission Active: ${s.title || sessionId}`,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ time: string; type: "success" | "error" | "warning" | "info"; msg: string }>,
    [sessions]
  );

  const systemPings = useMemo(() => [
    { time: "--:--:--", type: "info" as const, msg: "System initialized — Jules Lite Agent online" },
  ], []);

  const allPings = useMemo(() => [...systemPings, ...pings], [systemPings, pings]);

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 glass-surface flex items-center justify-between px-5 glass-border-b shrink-0 z-30">
        <h1 className="text-2xl font-bold text-[#E0F7FA] tracking-tight">Pings</h1>
        <div className="flex gap-1.5 items-center">
          <button className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10"><Search size={20} /></button>
          <button onClick={onAddRepo} className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10"><FolderPlus size={20} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 pb-32 relative z-10">
        {allPings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-[#547B88] opacity-20 mb-4" />
            <p className="text-[#547B88] text-sm">No pings yet</p>
            <p className="text-[#547B88] text-xs opacity-60 mt-1">System events will appear here</p>
          </div>
        ) : (
          allPings.map((ping, i) => (
            <div key={i} className="glass-surface p-5 flex flex-col gap-3 rounded-3xl hover:bg-white/10 transition-all cursor-pointer">
              <div className="flex justify-between items-center opacity-50 text-[10px] font-mono uppercase tracking-widest">
                <span>[{ping.time}]</span>
                <span className={
                  ping.type === "error" ? "text-[#FF2A5F]" :
                  ping.type === "warning" ? "text-[#B388FF]" :
                  ping.type === "success" ? "text-[#00E676]" :
                  "text-[#00E5FF]"
                }>
                  {ping.type === "error" ? "CRIT_FAIL" :
                   ping.type === "warning" ? "WARN_ALERT" :
                   ping.type === "success" ? "SYS_OK" :
                   "SYS_INFO"}
                </span>
              </div>
              <div className="flex items-start gap-3">
                {ping.type === "error" ? <XCircle size={16} className="text-[#FF2A5F] shrink-0 mt-0.5" /> :
                 ping.type === "warning" ? <AlertTriangle size={16} className="text-[#B388FF] shrink-0 mt-0.5" /> :
                 ping.type === "success" ? <CheckCircle2 size={16} className="text-[#00E676] shrink-0 mt-0.5" /> :
                 <AlertCircle size={16} className="text-[#00E5FF] shrink-0 mt-0.5" />}
                <span className="text-[#E0F7FA] text-sm leading-relaxed font-mono opacity-90">{ping.msg}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
