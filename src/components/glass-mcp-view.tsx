"use client";

import { JulesSource, getSourceDisplayName, getSourceBranch } from "@/lib/jules-client";
import {
  Library,
  Database,
  Server,
  Search,
  FolderPlus,
  ExternalLink,
  GitBranch,
} from "lucide-react";

interface GlassMCPViewProps {
  sources: JulesSource[];
  isLoadingSources: boolean;
  hasSupabasePAT: boolean;
  hasRenderKey: boolean;
  onAddRepo: () => void;
  onRefresh: () => void;
}

// Use the shared getSourceDisplayName from jules-client

export function GlassMCPView({
  sources,
  isLoadingSources,
  hasSupabasePAT,
  hasRenderKey,
  onAddRepo,
  onRefresh,
}: GlassMCPViewProps) {
  const mcpConnectors = [
    {
      id: "sources",
      name: "Sources",
      desc: "Local and remote codebase indexing",
      status: sources.length > 0 ? "Active" : "Idle",
      icon: <Library size={24} />,
      color: "#00E5FF",
    },
    {
      id: "supabase",
      name: "Supabase",
      desc: "Real-time database context & schema maps",
      status: hasSupabasePAT ? "Connected" : "Idle",
      icon: <Database size={24} />,
      color: "#00E676",
    },
    {
      id: "render",
      name: "Render",
      desc: "Deployment logs & infrastructure status",
      status: hasRenderKey ? "Connected" : "Idle",
      icon: <Server size={24} />,
      color: "#B388FF",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 glass-surface flex items-center justify-between px-5 glass-border-b shrink-0 z-30">
        <h1 className="text-2xl font-bold text-[#E0F7FA] tracking-tight">MCP</h1>
        <div className="flex gap-1.5 items-center">
          <button className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10"><Search size={20} /></button>
          <button onClick={onAddRepo} className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10"><FolderPlus size={20} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">
        {/* Active Context Map */}
        <div className="glass-surface p-6 rounded-3xl shadow-xl">
          <p className="text-[#547B88] font-mono text-[11px] uppercase mb-6 tracking-[0.2em] font-bold opacity-60">Active Context Map</p>
          <div className="space-y-4">
            {mcpConnectors.map((mcp) => (
              <div key={mcp.id} className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all cursor-pointer">
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 shadow-lg"
                  style={{ color: mcp.color, backgroundColor: `${mcp.color}15` }}
                >
                  {mcp.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-[#E0F7FA] font-bold text-sm tracking-tight truncate">{mcp.name}</h3>
                    <span
                      className="text-[9px] font-mono px-2 py-0.5 border rounded-full uppercase"
                      style={{
                        borderColor: mcp.status === "Connected" || mcp.status === "Active" ? `${mcp.color}44` : "rgba(255,255,255,0.1)",
                        color: mcp.status === "Connected" || mcp.status === "Active" ? mcp.color : "#547B88",
                        backgroundColor: mcp.status === "Connected" || mcp.status === "Active" ? `${mcp.color}11` : "transparent",
                      }}
                    >
                      {mcp.status}
                    </span>
                  </div>
                  <p className="text-[#547B88] text-xs leading-relaxed line-clamp-1">{mcp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sources List */}
        <div>
          <p className="text-[#547B88] font-mono text-[11px] uppercase mb-4 tracking-[0.2em] font-bold opacity-60">Indexed Sources</p>
          {isLoadingSources ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="glass-surface p-4 rounded-2xl skeleton-shimmer h-16" />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="glass-surface-heavy p-6 rounded-3xl text-center">
              <Library className="h-10 w-10 text-[#547B88] opacity-20 mx-auto mb-3" />
              <p className="text-[#547B88] text-sm">No sources indexed</p>
              <button onClick={onAddRepo} className="mt-3 text-[#00E5FF] text-xs font-bold hover:underline flex items-center gap-1 mx-auto">
                <FolderPlus size={14} /> Add Repository
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <div key={source.name} className="glass-surface flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="w-10 h-10 bg-[#00E5FF]/10 flex items-center justify-center rounded-xl text-[#00E5FF] shrink-0">
                    <GitBranch size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-[#E0F7FA] truncate">{getSourceDisplayName(source)}</p>
                    <p className="text-[10px] text-[#547B88] font-mono truncate">{source.id || source.name}</p>
                  </div>
                  <a
                    href={`https://github.com/${getSourceDisplayName(source)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#547B88] hover:text-[#00E5FF] rounded-lg hover:bg-white/5 transition-all shrink-0"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
