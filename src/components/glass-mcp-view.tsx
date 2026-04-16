"use client";

import { JulesSource, getSourceDisplayName, getSourceBranch } from "@/lib/jules-client";
import {
  Cpu,
  Github,
  FolderPlus,
  RefreshCw,
  GitBranch,
  ExternalLink,
} from "lucide-react";

interface GlassMCPViewProps {
  sources: JulesSource[];
  isLoadingSources: boolean;
  onAddRepo: () => void;
  onRefresh: () => void;
}

export function GlassMCPView({
  sources,
  isLoadingSources,
  onAddRepo,
  onRefresh,
}: GlassMCPViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-16 glass-surface flex items-center justify-between px-5 glass-border-b shrink-0 z-30">
        <h1 className="text-2xl font-bold text-[#E0F7FA] tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          MCP
        </h1>
        <div className="flex gap-1.5 items-center">
          <button onClick={onRefresh} className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10" title="Refresh">
            <RefreshCw size={20} />
          </button>
          <button onClick={onAddRepo} className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10" title="Add Repository">
            <FolderPlus size={20} />
          </button>
        </div>
      </header>

      {/* Active Context Map */}
      <div className="glass-surface py-5 px-4 grid grid-cols-1 gap-3 shrink-0 glass-border-b z-20">
        <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
          <div className="w-10 h-10 bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center rounded-xl text-[#00E5FF]">
            <Github size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#E0F7FA]">Sources</p>
            <p className="text-[10px] font-mono text-[#547B88] uppercase tracking-widest">GitHub Repositories</p>
          </div>
          <span className={`text-[8px] font-mono font-bold px-2 py-1 rounded-full uppercase ${
            sources.length > 0
              ? "bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20"
              : "bg-white/5 text-[#547B88] border border-white/10"
          }`}>
            {isLoadingSources ? "..." : sources.length > 0 ? "Active" : "Idle"}
          </span>
        </div>
      </div>

      {/* Indexed Sources */}
      <div className="flex-1 overflow-y-auto p-5 pb-32">
        <div className="px-1 mb-3">
          <p className="text-[11px] font-mono text-[#547B88] uppercase tracking-[0.2em] font-bold">Indexed Sources</p>
        </div>

        {isLoadingSources ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-surface flex items-center gap-4 px-5 py-4 rounded-2xl">
                <div className="w-10 h-10 skeleton-shimmer rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton-shimmer rounded w-2/3" />
                  <div className="h-3 skeleton-shimmer rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Cpu className="h-12 w-12 text-[#547B88] opacity-20 mb-4" />
            <p className="text-[#547B88] text-sm">No sources connected</p>
            <p className="text-[#547B88] text-xs opacity-60 mt-1">Add a repository to get started</p>
            <button
              onClick={onAddRepo}
              className="mt-4 px-4 py-2 bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              <FolderPlus size={14} className="inline mr-1.5" /> Add Repository
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => {
              const displayName = getSourceDisplayName(source);
              const branch = getSourceBranch(source);
              return (
                <div key={source.name} className="glass-surface flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl text-[#00E5FF] shrink-0">
                    <GitBranch size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#E0F7FA] font-bold text-sm truncate font-mono">{displayName}</p>
                    <p className="text-[10px] text-[#547B88] font-mono uppercase tracking-widest">{branch}</p>
                  </div>
                  <a
                    href={`https://github.com/${displayName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#547B88] hover:text-[#00E5FF] transition-all"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
