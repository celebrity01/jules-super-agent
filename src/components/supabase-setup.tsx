"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Database, Loader2, ExternalLink, Sparkles, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { saveSupabaseConfig, getSupabaseConfig } from "@/lib/supabase-client";

interface SupabaseSetupProps {
  onConfigured: () => void;
  onSkip: () => void;
}

export function SupabaseSetup({ onConfigured, onSkip }: SupabaseSetupProps) {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "success">("form");

  const existingConfig = getSupabaseConfig();

  const handleConnect = async () => {
    if (!url.trim() || !anonKey.trim()) { setError("Both fields required"); return; }
    try { new URL(url.trim()); } catch { setError("Invalid URL"); return; }

    setIsLoading(true);
    setError(null);

    try {
      const testUrl = `${url.trim()}/rest/v1/`;
      const res = await fetch(testUrl, { headers: { apikey: anonKey.trim(), Authorization: `Bearer ${anonKey.trim()}` } });
      if (res.status === 401 || res.status === 403) throw new Error("Invalid Anon Key");
      saveSupabaseConfig(url.trim(), anonKey.trim());
      setStep("success");
      setTimeout(() => onConfigured(), 1500);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) setError("Cannot connect — check URL");
      else setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#03080a]">
        <div className="w-full max-w-md mx-4 glass-surface-heavy p-8 text-center animate-scale-in rounded-3xl">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-[#00E676]/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-[#00E676]" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#E0F7FA] mb-2">Supabase Connected!</h2>
          <p className="text-sm text-[#547B88] font-mono">Setting up workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#03080a]">
      <div className="liquid-blob blob-1" />
      <div className="liquid-blob blob-2" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-surface-heavy p-8 rounded-3xl animate-slide-up">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-[#00E676] flex items-center justify-center shadow-[0_10px_40px_rgba(0,230,118,0.4)]">
                <Database className="h-10 w-10 text-[#071115]" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-[#00E676] opacity-20 animate-pulse" />
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-[#00E5FF] animate-bounce" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#E0F7FA] mb-2 tracking-tight">Connect Supabase</h1>
            <p className="text-sm text-[#547B88] font-mono">Persistent storage, auth, real-time sync</p>
          </div>

          <div className="space-y-3 mb-4">
            <Label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em]">Project URL</Label>
            <div className="relative">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#547B88]" />
              <Input
                type="url"
                placeholder="https://yourproject.supabase.co"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                disabled={isLoading}
                className="pl-10 font-mono glass-input h-12 rounded-2xl text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <Label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em]">Anon Key</Label>
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#547B88]" />
              <Input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={anonKey}
                onChange={(e) => { setAnonKey(e.target.value); setError(null); }}
                disabled={isLoading}
                className="pl-10 font-mono glass-input h-12 rounded-2xl text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-[rgba(255,42,95,0.08)] border border-[rgba(255,42,95,0.15)] px-4 py-3 text-sm text-[#FF2A5F] mb-4 animate-fade-in">
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isLoading || !url.trim() || !anonKey.trim()}
            className="w-full py-4 bg-[#00E676] text-[#071115] rounded-2xl font-bold text-sm shadow-[0_10px_30px_rgba(0,230,118,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database size={18} />}
            <span className="uppercase tracking-widest">Connect</span>
          </button>

          <button onClick={onSkip} className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-[#547B88] hover:text-[#E0F7FA] transition-colors py-2 font-mono">
            Skip — use local storage only <ArrowRight className="h-3 w-3" />
          </button>

          <div className="mt-6 glass-surface p-4 rounded-2xl space-y-3">
            <p className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em]">How to get credentials</p>
            <ol className="text-xs text-[#547B88] space-y-1.5 list-decimal list-inside">
              <li>Visit <span className="text-[#E0F7FA] font-medium">supabase.com</span> and create a project</li>
              <li>Go to Project Settings → API</li>
              <li>Copy the <span className="text-[#00E676] font-medium">Project URL</span> and <span className="text-[#00E676] font-medium">anon key</span></li>
            </ol>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#00E676] transition-colors mt-1">
              Open Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
