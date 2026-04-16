"use client";

import { useState, useCallback } from "react";
import {
  Bot,
  Github,
  Key,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FolderPlus,
  RefreshCw,
  ShieldOff,
  Link,
} from "lucide-react";
import { GitHubUser, getGitHubUser } from "@/lib/jules-client";

interface GlassAgentsViewProps {
  onRefresh: () => void;
  onDisconnect: () => void;
  githubToken: string | null;
  onGitHubTokenChange: (token: string | null) => void;
  onAddRepo: () => void;
}

export function GlassAgentsView({
  onRefresh,
  onDisconnect,
  githubToken,
  onGitHubTokenChange,
  onAddRepo,
}: GlassAgentsViewProps) {
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [githubInput, setGithubInput] = useState("");
  const [githubError, setGithubError] = useState<string | null>(null);

  const handleConnectGithub = useCallback(async () => {
    const token = githubInput.trim();
    if (!token) return;

    setIsLoadingGithub(true);
    setGithubError(null);

    try {
      const user = await getGitHubUser(token);
      setGithubUser(user);
      onGitHubTokenChange(token);
      setGithubInput("");
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : "Failed to verify token");
    } finally {
      setIsLoadingGithub(false);
    }
  }, [githubInput, onGitHubTokenChange]);

  const handleDisconnectGithub = useCallback(() => {
    setGithubUser(null);
    onGitHubTokenChange(null);
  }, [onGitHubTokenChange]);

  // Load GitHub user on mount if token exists
  useState(() => {
    if (githubToken && !githubUser) {
      getGitHubUser(githubToken)
        .then(setGithubUser)
        .catch(() => { /* token may be invalid */ });
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-16 glass-surface flex items-center justify-between px-5 glass-border-b shrink-0 z-30">
        <h1 className="text-2xl font-bold text-[#E0F7FA] tracking-tight" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Agents
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-32">
        {/* GitHub Connection */}
        <section className="glass-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl text-[#E0F7FA]">
                <Github size={20} />
              </div>
              <div>
                <h3 className="text-[#E0F7FA] font-bold text-sm">GitHub</h3>
                <p className="text-[10px] font-mono text-[#547B88] uppercase tracking-widest">Repository Access</p>
              </div>
              {githubToken && (
                <span className="ml-auto text-[8px] font-mono font-bold px-2 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 uppercase">
                  Connected
                </span>
              )}
            </div>
          </div>
          <div className="p-5">
            {githubToken && githubUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {githubUser.avatar_url && (
                    <img src={githubUser.avatar_url} alt={githubUser.login} className="w-10 h-10 rounded-full border border-white/10" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#E0F7FA]">{githubUser.name || githubUser.login}</p>
                    <p className="text-xs text-[#547B88] font-mono">@{githubUser.login}</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectGithub}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#FF2A5F] hover:bg-[#FF2A5F]/10 rounded-xl transition-all"
                >
                  <XCircle size={14} /> Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
                    <Key size={10} /> GitHub Personal Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={githubInput}
                    onChange={(e) => { setGithubInput(e.target.value); setGithubError(null); }}
                    disabled={isLoadingGithub}
                    className="w-full bg-white/5 border border-white/10 px-5 py-3 text-sm rounded-xl outline-none text-[#E0F7FA] placeholder-[#1A3540] focus:border-[#E0F7FA]/40 transition-all font-mono"
                  />
                </div>
                {githubError && (
                  <div className="flex items-center gap-2 text-xs text-[#FF2A5F]">
                    <AlertCircle size={14} />
                    <span>{githubError}</span>
                  </div>
                )}
                <button
                  onClick={handleConnectGithub}
                  disabled={isLoadingGithub || !githubInput.trim()}
                  className="w-full py-3 bg-[#E0F7FA] text-[#071115] rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isLoadingGithub ? <Loader2 size={16} className="animate-spin" /> : <Link size={16} />}
                  Connect GitHub
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Jules Agent */}
        <section className="glass-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center rounded-xl text-[#00E5FF]">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-[#E0F7FA] font-bold text-sm">Jules Agent</h3>
                <p className="text-[10px] font-mono text-[#547B88] uppercase tracking-widest">Core AI Connection</p>
              </div>
              <span className="ml-auto text-[8px] font-mono font-bold px-2 py-1 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 uppercase">
                Active
              </span>
            </div>
          </div>
          <div className="p-5">
            <button
              onClick={onDisconnect}
              className="w-full py-3 bg-[#FF2A5F]/10 border border-[#FF2A5F]/20 text-[#FF2A5F] rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-[#FF2A5F]/15"
            >
              <ShieldOff size={16} />
              Disconnect Agent
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
