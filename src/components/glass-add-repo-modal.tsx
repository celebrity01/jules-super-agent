"use client";

import { useState } from "react";
import {
  Github,
  X,
  PlusCircle,
  Link,
  Globe,
  Lock,
  Library,
  Loader2,
} from "lucide-react";

interface GlassAddRepoModalProps {
  open: boolean;
  onClose: () => void;
  githubToken: string;
  onRepoCreated: () => void;
}

export function GlassAddRepoModal({
  open,
  onClose,
  githubToken,
  onRepoCreated,
}: GlassAddRepoModalProps) {
  const [tab, setTab] = useState<"create" | "connect">("create");
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [addReadme, setAddReadme] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [connectUrl, setConnectUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!repoName.trim()) { setError("Repository name is required"); return; }
    if (!githubToken) { setError("GitHub token required"); return; }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/github/create-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-github-token": githubToken },
        body: JSON.stringify({
          name: repoName.trim(),
          description: description.trim() || undefined,
          private: isPrivate,
          auto_init: addReadme,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create repository");
      }

      onRepoCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!connectUrl.trim()) { setError("Repository URL is required"); return; }
    if (!githubToken) { setError("GitHub token required — connect GitHub in Agents tab first"); return; }

    // Validate it's a GitHub URL
    const githubPattern = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/i;
    const match = connectUrl.trim().match(githubPattern);
    if (!match) { setError("Please enter a valid GitHub repository URL (https://github.com/user/repo)"); return; }

    setIsLoading(true);
    setError(null);

    try {
      // Verify the repo exists via GitHub API
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      const verifyRes = await fetch(`/api/github/repos/${owner}/${repo}`, {
        headers: { "X-GitHub-Token": githubToken },
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        throw new Error(data.error || "Repository not found or inaccessible");
      }
      onRepoCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRepoName(""); setDescription(""); setIsPrivate(false); setAddReadme(true);
    setConnectUrl(""); setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="w-full max-w-xl glass-surface-heavy border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00E676] rounded-2xl flex items-center justify-center text-[#071115] shadow-lg">
              <Github size={24} />
            </div>
            <div>
              <h2 className="text-[#E0F7FA] font-bold text-xl tracking-tight leading-none mb-1.5">Add Repository</h2>
              <p className="text-[#547B88] text-xs font-mono uppercase tracking-widest">Create or connect external code</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-[#547B88] hover:text-[#E0F7FA] transition-all rounded-full hover:bg-white/5">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
            <button
              onClick={() => setTab("create")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === "create" ? "bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] shadow-sm" : "text-[#547B88] hover:text-[#E0F7FA]"
              }`}
            >
              <PlusCircle size={16} /> Create New
            </button>
            <button
              onClick={() => setTab("connect")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === "connect" ? "bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] shadow-sm" : "text-[#547B88] hover:text-[#E0F7FA]"
              }`}
            >
              <Link size={16} /> Connect Existing
            </button>
          </div>

          {tab === "create" ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Repository Name *</label>
                <input
                  type="text"
                  placeholder="e.g., my-awesome-project"
                  value={repoName}
                  onChange={(e) => { setRepoName(e.target.value); setError(null); }}
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl outline-none text-[#E0F7FA] placeholder-[#1A3540] focus:border-[#00E676]/40 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="A short description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl outline-none text-[#E0F7FA] placeholder-[#547B88] resize-none focus:border-[#00E676]/40 transition-all leading-relaxed"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsPrivate(false)}
                    className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all ${
                      !isPrivate ? "bg-[#00E676]/10 border border-[#00E676]/40 text-[#00E676] shadow-[0_10px_30px_rgba(0,230,118,0.1)]" : "bg-white/5 border border-white/10 text-[#547B88] hover:border-white/20"
                    }`}
                  >
                    <Globe size={22} className="mb-2" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Public</span>
                  </button>
                  <button
                    onClick={() => setIsPrivate(true)}
                    className={`flex flex-col items-center justify-center py-5 rounded-2xl transition-all ${
                      isPrivate ? "bg-[#B388FF]/10 border border-[#B388FF]/40 text-[#B388FF] shadow-[0_10px_30px_rgba(179,136,255,0.1)]" : "bg-white/5 border border-white/10 text-[#547B88] hover:border-white/20"
                    }`}
                  >
                    <Lock size={22} className="mb-2" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Private</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="flex items-center gap-3 text-[#E0F7FA]">
                  <Library size={18} className="text-[#547B88]" />
                  <span className="text-sm font-medium">Initialize with README</span>
                </div>
                <button
                  onClick={() => setAddReadme(!addReadme)}
                  className={`w-12 h-6 rounded-full relative flex items-center px-1 cursor-pointer transition-all ${addReadme ? "bg-[#00E676]" : "bg-white/10"}`}
                >
                  <div className={`w-4 h-4 bg-[#071115] rounded-full shadow-sm transition-all ${addReadme ? "ml-auto" : "ml-0"}`} />
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Repository URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/user/repo"
                  value={connectUrl}
                  onChange={(e) => setConnectUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl outline-none text-[#E0F7FA] placeholder-[#1A3540] focus:border-[#00E5FF]/40 transition-all font-mono"
                />
              </div>
              <p className="text-xs text-[#547B88] leading-relaxed">Connect an existing GitHub repository as a Jules source for agent context.</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-[rgba(255,42,95,0.08)] border border-[rgba(255,42,95,0.15)] px-4 py-3 text-sm text-[#FF2A5F]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 glass-surface flex gap-4 pb-safe glass-border-t">
          <button onClick={handleClose} disabled={isLoading} className="flex-1 py-4 text-sm font-bold text-[#547B88] hover:text-[#E0F7FA] active:scale-95 transition-all rounded-2xl font-mono uppercase tracking-widest">
            Cancel
          </button>
          <button
            onClick={tab === "create" ? handleCreate : handleConnect}
            disabled={isLoading || (tab === "create" && (!repoName.trim() || !githubToken)) || (tab === "connect" && (!connectUrl.trim() || !githubToken))}
            className={`flex-[2] flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50 ${
              tab === "create"
                ? "bg-[#00E676] text-[#071115] shadow-[0_10px_30px_rgba(0,230,118,0.3)]"
                : "bg-[#00E5FF] text-[#071115] shadow-[0_10px_30px_rgba(0,229,255,0.3)]"
            }`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle size={20} />}
            <span className="uppercase tracking-widest">{tab === "create" ? "Create Repository" : "Connect"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
