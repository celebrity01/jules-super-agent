"use client";

import { useState } from "react";
import {
  Rocket,
  X,
  ChevronDown,
  Sliders,
  GitPullRequest,
  Loader2,
  GitBranch,
} from "lucide-react";
import { JulesSource, createSession, getSourceDisplayName, AutomationMode } from "@/lib/jules-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GlassNewMissionModalProps {
  open: boolean;
  onClose: () => void;
  sources: JulesSource[];
  apiKey: string;
  onSessionCreated: (sessionId: string) => void;
}

export function GlassNewMissionModal({
  open,
  onClose,
  sources,
  apiKey,
  onSessionCreated,
}: GlassNewMissionModalProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [branch, setBranch] = useState("main");
  const [automationMode, setAutomationMode] = useState<AutomationMode | "none">("none");
  const [requireApproval, setRequireApproval] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!prompt.trim()) { setError("Objective is required"); return; }
    if (!selectedSource) { setError("Select a repository"); return; }

    setIsLoading(true);
    setError(null);

    try {
      const session = await createSession(apiKey, {
        prompt: prompt.trim(),
        title: title.trim() || undefined,
        sourceContext: {
          source: selectedSource,
          githubRepoContext: { startingBranch: branch.trim() || "main" },
        },
        automationMode: automationMode === "none" ? undefined : automationMode as AutomationMode,
        requirePlanApproval: requireApproval,
      });
      const sessionId = session.name.split("/").pop() || session.name;
      onSessionCreated(sessionId);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mission");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle(""); setPrompt(""); setSelectedSource(""); setBranch("main");
    setAutomationMode("none"); setRequireApproval(true); setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={handleClose} />
      <div className="w-full max-w-xl glass-surface-heavy border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00E676]/20 rounded-2xl flex items-center justify-center text-[#00E676] border border-[#00E676]/30 shadow-lg">
              <Rocket size={24} />
            </div>
            <div>
              <h2 className="text-[#E0F7FA] font-bold text-xl tracking-tight leading-none mb-1.5">New Mission</h2>
              <p className="text-[#547B88] text-xs font-mono uppercase tracking-widest">Core Command Input</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-[#547B88] hover:text-[#E0F7FA] transition-all rounded-full hover:bg-white/5">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Mission Identifier</label>
            <input
              type="text"
              placeholder="e.g., matrix-auth-hardening"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl outline-none text-[#E0F7FA] placeholder-[#1A3540] focus:border-[#00E676]/40 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Objective Parameters *</label>
            <textarea
              rows={4}
              placeholder="Describe terminal goal state..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl outline-none text-[#E0F7FA] placeholder-[#547B88] resize-none focus:border-[#00E676]/40 transition-all leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Context Target</label>
              <Select value={selectedSource} onValueChange={setSelectedSource} disabled={isLoading || sources.length === 0}>
                <SelectTrigger className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl text-[#E0F7FA] h-auto hover:bg-white/10 transition-all">
                  <SelectValue placeholder={sources.length === 0 ? "No sources" : "Select repository"} />
                </SelectTrigger>
                <SelectContent className="bg-[#0a1419] border-white/10">
                  {sources.map((source) => (
                    <SelectItem key={source.name} value={source.name} className="text-[#E0F7FA] focus:bg-white/5 focus:text-[#E0F7FA]">
                      <span className="font-mono">{getSourceDisplayName(source)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Branch Vector</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl outline-none text-[#E0F7FA] font-mono focus:border-[#00E676]/40 transition-all"
              />
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
              <Sliders size={12} /> Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAutomationMode("none")}
                className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all ${
                  automationMode === "none"
                    ? "bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]"
                    : "bg-white/5 border-white/10 text-[#547B88] hover:border-white/20"
                }`}
              >
                <Sliders size={18} />
                <span className="text-[11px] font-bold mt-1">Manual</span>
              </button>
              <button
                type="button"
                onClick={() => setAutomationMode("AUTO_CREATE_PR")}
                className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all ${
                  automationMode === "AUTO_CREATE_PR"
                    ? "bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]"
                    : "bg-white/5 border-white/10 text-[#547B88] hover:border-white/20"
                }`}
              >
                <GitPullRequest size={18} />
                <span className="text-[11px] font-bold mt-1">Auto PR</span>
              </button>
            </div>
          </div>

          {/* Approval Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
            <span className="text-sm font-medium text-[#E0F7FA]">Require Plan Approval</span>
            <button
              onClick={() => setRequireApproval(!requireApproval)}
              className={`w-12 h-6 rounded-full relative flex items-center px-1 cursor-pointer transition-all ${requireApproval ? "bg-[#00E676]" : "bg-white/10"}`}
            >
              <div className={`w-4 h-4 bg-[#071115] rounded-full shadow-sm transition-all ${requireApproval ? "ml-auto" : "ml-0"}`} />
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-[rgba(255,42,95,0.08)] border border-[rgba(255,42,95,0.15)] px-4 py-3 text-sm text-[#FF2A5F]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 glass-surface flex gap-4 pb-safe glass-border-t">
          <button onClick={handleClose} disabled={isLoading} className="flex-1 py-4 text-sm font-bold text-[#547B88] hover:text-[#E0F7FA] active:scale-95 transition-all rounded-2xl font-mono uppercase tracking-widest">
            Abort
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || !prompt.trim() || !selectedSource}
            className="flex-[2] flex items-center justify-center gap-3 py-4 bg-[#00E676] text-[#071115] rounded-2xl font-bold text-sm shadow-[0_10px_30px_rgba(0,230,118,0.3)] active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket size={20} />}
            <span className="uppercase tracking-widest">Execute Mission</span>
          </button>
        </div>
      </div>
    </div>
  );
}
