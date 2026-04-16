"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Key, Loader2, ExternalLink, Zap, Sparkles } from "lucide-react";
import { listSources } from "@/lib/jules-client";

interface ApiKeySetupProps {
  onConnect: (apiKey: string) => void;
}

export function ApiKeySetup({ onConnect }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!apiKey.trim()) { setError("Please enter your Google OAuth access token"); return; }
    setIsLoading(true);
    setError(null);
    try {
      await listSources(apiKey.trim());
      onConnect(apiKey.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OAuth token — make sure it has the Jules API scope");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConnect();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#03080a]">
      {/* Blobs */}
      <div className="liquid-blob blob-1" />
      <div className="liquid-blob blob-2" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-surface-heavy p-8 rounded-3xl animate-slide-up">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-[#00E5FF] flex items-center justify-center shadow-[0_10px_40px_rgba(0,229,255,0.4)]">
                <Zap className="h-10 w-10 text-[#071115]" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-[#00E5FF] opacity-20 animate-pulse" />
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-[#00E676] animate-bounce" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#E0F7FA] mb-2 tracking-tight">Jules Lite</h1>
            <p className="text-sm text-[#547B88] font-mono">Pro Developer Messenger</p>
          </div>

          {/* Input */}
          <div className="space-y-3 mb-6">
            <Label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em]">Google OAuth Access Token</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#547B88]" />
              <Input
                type="password"
                placeholder="Paste your Google OAuth access token"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
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
            disabled={isLoading || !apiKey.trim()}
            className="w-full py-4 bg-[#00E676] text-[#071115] rounded-2xl font-bold text-sm shadow-[0_10px_30px_rgba(0,230,118,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap size={18} />}
            <span className="uppercase tracking-widest">Initialize Agent</span>
          </button>

          {/* Help */}
          <div className="mt-6 glass-surface p-4 rounded-2xl space-y-3">
            <p className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em]">How to get your OAuth token</p>
            <ol className="text-xs text-[#547B88] space-y-1.5 list-decimal list-inside">
              <li>Visit <span className="text-[#E0F7FA] font-medium">Google Cloud Console</span></li>
              <li>Create OAuth 2.0 credentials with Jules API scope</li>
              <li>Authorize and get your access token</li>
              <li>Or use <span className="text-[#E0F7FA] font-medium">gcloud auth print-access-token</span></li>
              <li>Copy and paste the token above</li>
            </ol>
            <a href="https://jules.google" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#00E5FF] hover:text-[#E0F7FA] transition-colors mt-1">
              Open Jules <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#547B88] mt-4 font-mono">Powered by Google Jules API</p>
      </div>
    </div>
  );
}
