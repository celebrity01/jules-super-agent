"use client";

import { useState, useEffect } from "react";
import { getGitHubUser, GitHubUser } from "@/lib/jules-client";
import { getSupabaseConfig, getSupabaseAccessToken, clearSupabaseAccessToken, saveSupabaseAccessToken } from "@/lib/supabase-client";
import { verifyAccessToken } from "@/lib/supabase-management";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Database,
  Github,
  Cloud,
  Lock,
  Link2,
  User,
  LogOut,
  Unplug,
  Zap,
  Shield,
  Loader2,
  Search,
  FolderPlus,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface GlassAgentsViewProps {
  onRefresh: () => void;
  onDisconnect: () => void;
  githubToken: string | null;
  onGitHubTokenChange: (token: string | null) => void;
  supabaseUser: SupabaseUser | null;
  supabasePAT: string | null;
  onSupabasePATChange: (pat: string | null) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onResetSupabase: () => void;
  renderApiKey: string | null;
  onRenderApiKeyChange: (key: string | null) => void;
  onAddRepo: () => void;
}

export function GlassAgentsView({
  onRefresh,
  onDisconnect,
  githubToken,
  onGitHubTokenChange,
  supabaseUser,
  supabasePAT,
  onSupabasePATChange,
  onSignIn,
  onSignOut,
  onResetSupabase,
  renderApiKey,
  onRenderApiKeyChange,
  onAddRepo,
}: GlassAgentsViewProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [patInput, setPatInput] = useState("");
  const [renderKeyInput, setRenderKeyInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectingPAT, setIsConnectingPAT] = useState(false);
  const [isConnectingRender, setIsConnectingRender] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [patError, setPatError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const supabaseConfig = typeof window !== "undefined" ? getSupabaseConfig() : null;

  useEffect(() => {
    if (!githubToken) return;
    let cancelled = false;
    getGitHubUser(githubToken)
      .then((user) => { if (!cancelled) setGithubUser(user); })
      .catch(() => { if (!cancelled) setGithubUser(null); });
    return () => { cancelled = true; };
  }, [githubToken]);

  const handleConnectGithub = async () => {
    if (!tokenInput.trim()) { setConnectError("Enter a token"); return; }
    setIsConnecting(true); setConnectError(null);
    try {
      const user = await getGitHubUser(tokenInput.trim());
      onGitHubTokenChange(tokenInput.trim());
      setGithubUser(user);
      setTokenInput("");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed");
    } finally { setIsConnecting(false); }
  };

  const handleConnectPAT = async () => {
    if (!patInput.trim()) { setPatError("Enter your PAT"); return; }
    setIsConnectingPAT(true); setPatError(null);
    try {
      const valid = await verifyAccessToken(patInput.trim());
      if (!valid) { setPatError("Invalid token"); return; }
      saveSupabaseAccessToken(patInput.trim());
      onSupabasePATChange(patInput.trim());
      setPatInput("");
    } catch (err) {
      setPatError(err instanceof Error ? err.message : "Failed");
    } finally { setIsConnectingPAT(false); }
  };

  const handleConnectRender = async () => {
    if (!renderKeyInput.trim()) { setRenderError("Enter your key"); return; }
    setIsConnectingRender(true); setRenderError(null);
    try {
      const { verifyApiKey } = await import("@/lib/render-api");
      const valid = await verifyApiKey(renderKeyInput.trim());
      if (!valid) { setRenderError("Invalid key"); return; }
      onRenderApiKeyChange(renderKeyInput.trim());
      setRenderKeyInput("");
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : "Failed");
    } finally { setIsConnectingRender(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 glass-surface flex items-center justify-between px-5 glass-border-b shrink-0 z-30">
        <h1 className="text-[11px] font-mono font-bold text-[#547B88] tracking-[0.3em] uppercase">Settings</h1>
        <div className="flex gap-1.5 items-center">
          <button className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10"><Search size={20} /></button>
          <button onClick={onAddRepo} className="p-2.5 text-[#E0F7FA] active:scale-90 transition-all rounded-full hover:bg-white/10"><FolderPlus size={20} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-32">
        {/* Refresh */}
        <button onClick={onRefresh} className="flex items-center gap-4 text-[#E0F7FA] p-2 rounded-2xl hover:bg-white/5 transition-all group w-full">
          <RefreshCw size={20} className="text-[#547B88] group-hover:text-[#00E5FF] transition-colors" />
          <span className="text-sm font-bold tracking-tight">Refresh Instance Data</span>
        </button>

        <hr className="border-white/5" />

        {/* Supabase Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[#00E676]">
            <Database size={18} />
            <h2 className="text-[12px] font-mono font-bold tracking-widest uppercase">Supabase</h2>
          </div>

          {supabaseUser ? (
            <div className="glass-surface-heavy p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E676] to-[#059669] flex items-center justify-center text-[#071115] text-xs font-bold shrink-0">
                  {(supabaseUser.email || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#E0F7FA] truncate">{supabaseUser.email}</p>
                  <p className="text-[10px] text-[#00E676] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E676]" />
                    Authenticated
                  </p>
                </div>
              </div>
              <button onClick={onSignOut} className="flex items-center gap-2 text-[#FF2A5F] text-xs font-bold">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : supabaseConfig ? (
            <div className="glass-surface-heavy p-5 rounded-3xl space-y-3">
              <p className="text-xs text-[#547B88] leading-relaxed">Sign in to sync across devices.</p>
              <button onClick={onSignIn} className="w-full bg-[#00E676] text-[#071115] py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2">
                <User size={16} /> Sign In
              </button>
            </div>
          ) : null}

          {/* Management API */}
          {supabasePAT ? (
            <div className="glass-surface-heavy p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-[#547B88]" />
                <span className="text-sm font-bold text-[#E0F7FA]">Management API</span>
                <span className="ml-auto text-[9px] text-[#00E676] font-mono">CONNECTED</span>
              </div>
              <button onClick={() => { clearSupabaseAccessToken(); onSupabasePATChange(null); }} className="flex items-center gap-2 text-[#FF2A5F] text-xs font-bold">
                <Unplug size={14} /> Disconnect
              </button>
            </div>
          ) : (
            <div className="glass-surface-heavy p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-[#547B88]" />
                <span className="text-sm font-bold text-[#E0F7FA]">Management API</span>
              </div>
              <p className="text-xs text-[#547B88] leading-relaxed opacity-80">Personal Access Token for managing projects, keys, and environments.</p>
              <Input
                type="password"
                placeholder="sbp_xxxxxxxxxxxx"
                value={patInput}
                onChange={(e) => { setPatInput(e.target.value); setPatError(null); }}
                disabled={isConnectingPAT}
                className="glass-input border-white/10 h-11 rounded-xl text-xs font-mono"
              />
              <Button onClick={handleConnectPAT} disabled={isConnectingPAT || !patInput.trim()} className="w-full bg-[#00E676] text-[#071115] h-10 rounded-xl font-bold text-sm shadow-lg disabled:opacity-50">
                {isConnectingPAT ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2 size={16} strokeWidth={3} /> Connect</>}
              </Button>
              {patError && <p className="text-[10px] text-[#FF2A5F]">{patError}</p>}
            </div>
          )}
        </section>

        <hr className="border-white/5" />

        {/* GitHub Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[#00E5FF]">
            <Github size={18} />
            <h2 className="text-[12px] font-mono font-bold tracking-widest uppercase">GitHub</h2>
          </div>

          {githubToken && githubUser ? (
            <div className="glass-surface-heavy p-5 rounded-3xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center text-[#B388FF] shrink-0">
                  {githubUser.avatar_url ? (
                    <img src={githubUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#E0F7FA] truncate">{githubUser.name || githubUser.login}</h3>
                  <p className="text-xs text-[#547B88] font-mono opacity-60">@{githubUser.login}</p>
                </div>
              </div>
              <button onClick={() => { onGitHubTokenChange(null); setGithubUser(null); }} className="mt-4 flex items-center gap-2 text-[#FF2A5F] text-xs font-bold">
                <LogOut size={14} /> Disconnect GitHub
              </button>
            </div>
          ) : (
            <div className="glass-surface-heavy p-5 rounded-3xl space-y-4">
              <p className="text-xs text-[#547B88]">Connect GitHub to manage repositories.</p>
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx"
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setConnectError(null); }}
                disabled={isConnecting}
                className="glass-input border-white/10 h-11 rounded-xl text-xs font-mono"
              />
              <Button onClick={handleConnectGithub} disabled={isConnecting || !tokenInput.trim()} className="w-full bg-gradient-to-r from-[#00E5FF] to-[#008069] text-[#071115] h-10 rounded-xl font-bold text-sm disabled:opacity-50">
                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Github size={16} /> Connect</>}
              </Button>
              {connectError && <p className="text-[10px] text-[#FF2A5F]">{connectError}</p>}
            </div>
          )}
        </section>

        <hr className="border-white/5" />

        {/* Render Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[#B388FF]">
            <Cloud size={18} />
            <h2 className="text-[12px] font-mono font-bold tracking-widest uppercase">Render</h2>
          </div>

          {renderApiKey ? (
            <div className="glass-surface-heavy p-5 rounded-3xl space-y-3">
              <div className="flex items-center gap-3">
                <Cloud size={16} className="text-[#B388FF]" />
                <span className="text-sm font-bold text-[#E0F7FA]">Render API</span>
                <span className="ml-auto text-[9px] text-[#00E676] font-mono">CONNECTED</span>
              </div>
              <button onClick={() => onRenderApiKeyChange(null)} className="flex items-center gap-2 text-[#FF2A5F] text-xs font-bold">
                <Unplug size={14} /> Disconnect Render
              </button>
            </div>
          ) : (
            <div className="glass-surface-heavy p-5 rounded-3xl space-y-4">
              <p className="text-xs text-[#547B88]">Connect Render to manage services and deployments.</p>
              <Input
                type="password"
                placeholder="rnd_xxxxxxxxxxxx"
                value={renderKeyInput}
                onChange={(e) => { setRenderKeyInput(e.target.value); setRenderError(null); }}
                disabled={isConnectingRender}
                className="glass-input border-white/10 h-11 rounded-xl text-xs font-mono"
              />
              <Button onClick={handleConnectRender} disabled={isConnectingRender || !renderKeyInput.trim()} className="w-full bg-gradient-to-r from-[#B388FF] to-[#7C4DFF] text-[#071115] h-10 rounded-xl font-bold text-sm disabled:opacity-50">
                {isConnectingRender ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2 size={16} strokeWidth={3} /> Connect</>}
              </Button>
              {renderError && <p className="text-[10px] text-[#FF2A5F]">{renderError}</p>}
            </div>
          )}
        </section>

        <hr className="border-white/5" />

        {/* Disconnect Agent */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[#FF2A5F]">
            <Zap size={18} />
            <h2 className="text-[12px] font-mono font-bold tracking-widest uppercase">Jules Agent</h2>
          </div>
          <button onClick={onDisconnect} className="w-full flex items-center gap-3 p-3 rounded-2xl text-[#FF2A5F] hover:bg-[rgba(255,42,95,0.08)] transition-all">
            <Unplug size={18} />
            <span className="text-sm font-bold">Disconnect Agent</span>
          </button>
          {supabaseConfig && (
            <button onClick={onResetSupabase} className="w-full flex items-center gap-3 p-3 rounded-2xl text-[#547B88] hover:text-[#B388FF] hover:bg-[rgba(179,136,255,0.08)] transition-all">
              <Unplug size={18} />
              <span className="text-sm font-bold">Reset Supabase Config</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
