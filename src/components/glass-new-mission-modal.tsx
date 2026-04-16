"use client";

import { useState, useRef, useEffect } from "react";
import {
  Rocket,
  X,
  Sliders,
  GitPullRequest,
  Loader2,
  GitBranch,
  Check,
  ChevronDown,
  FolderPlus,
  Search,
  Github,
} from "lucide-react";
import { JulesSource, createSession, getSourceDisplayName, getSourceBranch, AutomationMode } from "@/lib/jules-client";

interface GlassNewMissionModalProps {
  open: boolean;
  onClose: () => void;
  sources: JulesSource[];
  apiKey: string;
  onSessionCreated: (sessionId: string) => void;
  onAddRepo?: () => void;
}

export function GlassNewMissionModal({
  open,
  onClose,
  sources,
  apiKey,
  onSessionCreated,
  onAddRepo,
}: GlassNewMissionModalProps) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedSourceDisplay, setSelectedSourceDisplay] = useState("");
  const [branch, setBranch] = useState("main");
  const [automationMode, setAutomationMode] = useState<AutomationMode | "none">("none");
  const [requireApproval, setRequireApproval] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      if (searchInputRef.current) searchInputRef.current.focus();
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  if (!open) return null;

  const filteredSources = sources.filter((s) => {
    const name = getSourceDisplayName(s).toLowerCase();
    return !searchFilter || name.includes(searchFilter.toLowerCase());
  });

  const handleSelectSource = (source: JulesSource) => {
    setSelectedSource(source.name);
    setSelectedSourceDisplay(getSourceDisplayName(source));
    setBranch(getSourceBranch(source));
    setDropdownOpen(false);
    setSearchFilter("");
  };

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
    setTitle(""); setPrompt(""); setSelectedSource(""); setSelectedSourceDisplay("");
    setBranch("main"); setAutomationMode("none"); setRequireApproval(true);
    setError(null); setDropdownOpen(false); setSearchFilter("");
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
            {/* Context Target - Custom Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
                <GitBranch size={12} /> Context Target
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl text-left hover:bg-white/10 transition-all flex items-center justify-between gap-2 disabled:opacity-50"
                >
                  <span className={selectedSourceDisplay ? "text-[#E0F7FA] font-mono" : "text-[#1A3540]"}>
                    {selectedSourceDisplay || (sources.length === 0 ? "No sources available" : "Select repository...")}
                  </span>
                  <ChevronDown size={16} className={`text-[#547B88] shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Panel */}
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a1419] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-slide-up">
                    {/* Search */}
                    <div className="p-3 border-b border-white/5">
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                        <Search size={14} className="text-[#547B88] shrink-0" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Search repositories..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-xs text-[#E0F7FA] placeholder-[#1A3540] font-mono"
                        />
                      </div>
                    </div>

                    {/* Sources List */}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSources.length === 0 ? (
                        <div className="p-6 text-center">
                          <Github size={24} className="text-[#547B88] opacity-30 mx-auto mb-2" />
                          <p className="text-xs text-[#547B88]">
                            {sources.length === 0 ? "No repositories connected" : "No matching repositories"}
                          </p>
                          {onAddRepo && (
                            <button
                              onClick={() => { setDropdownOpen(false); onAddRepo(); }}
                              className="mt-3 text-[#00E5FF] text-xs font-bold hover:underline flex items-center gap-1 mx-auto"
                            >
                              <FolderPlus size={12} /> Add Repository
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredSources.map((source) => {
                          const displayName = getSourceDisplayName(source);
                          const isSelected = selectedSource === source.name;
                          return (
                            <button
                              key={source.name}
                              type="button"
                              onClick={() => handleSelectSource(source)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-all ${
                                isSelected ? "bg-[#00E5FF]/10 text-[#00E5FF]" : "text-[#E0F7FA]"
                              }`}
                            >
                              <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
                                isSelected ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "bg-white/5 text-[#547B88]"
                              }`}>
                                <GitBranch size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono truncate">{displayName}</p>
                                <p className="text-[10px] text-[#547B88] font-mono truncate">{getSourceBranch(source)}</p>
                              </div>
                              {isSelected && <Check size={16} className="text-[#00E5FF] shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Add Repo Footer */}
                    {onAddRepo && (
                      <div className="p-3 border-t border-white/5">
                        <button
                          onClick={() => { setDropdownOpen(false); onAddRepo(); }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-[#00E5FF] text-xs font-bold hover:bg-white/5 rounded-xl transition-all"
                        >
                          <FolderPlus size={14} /> Add New Repository
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
