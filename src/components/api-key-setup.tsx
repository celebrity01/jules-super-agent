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
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await listSources(apiKey.trim());
      onConnect(apiKey.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid API key. Please check and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />

      {/* Gradient orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-float"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8"
        style={{
          background: "radial-gradient(circle, #818cf8 0%, transparent 70%)",
          animation: "float 6s ease-in-out infinite reverse",
        }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card rounded-2xl p-8 animate-fade-in-up animate-glow-pulse">
          {/* Agent icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-agent flex items-center justify-center shadow-lg">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-gradient-agent opacity-20 animate-pulse-ring" />
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-amber-400 animate-float" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Jules Super Agent
            </h1>
            <p className="text-sm text-[#94a3b8]">
              Your AI-powered development automation agent
            </p>
          </div>

          {/* API Key Input */}
          <div className="space-y-3 mb-6">
            <Label htmlFor="api-key" className="text-sm text-[#94a3b8] font-medium">
              API Key
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your Jules API key"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pl-10 font-mono bg-[#0d1117] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#4a4a5a] focus:border-[rgba(129,140,248,0.3)] input-glow h-11 rounded-lg transition-all duration-200"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-sm text-[#f87171] mb-4 animate-fade-in">
              {error}
            </div>
          )}

          {/* Connect Button */}
          <Button
            onClick={handleConnect}
            disabled={isLoading || !apiKey.trim()}
            className="w-full bg-gradient-agent hover:brightness-115 text-white h-11 rounded-lg font-semibold transition-all duration-200 shadow-lg disabled:opacity-50"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing Agent...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Initialize Agent</span>
              </div>
            )}
          </Button>

          {/* Help section */}
          <div className="mt-6 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">How to get your API key</p>
            <ol className="text-xs text-[#64748b] space-y-1.5 list-decimal list-inside">
              <li>Visit Google Jules at <span className="text-[#94a3b8] font-medium">jules.google</span></li>
              <li>Go to Settings in your account</li>
              <li>Generate a new API key</li>
              <li>Copy and paste it above</li>
            </ol>
            <a
              href="https://jules.google"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#818cf8] hover:text-[#6366f1] transition-colors mt-1"
            >
              Open Jules <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[10px] text-[#4a4a5a] mt-4">
          Powered by Google Jules API
        </p>
      </div>
    </div>
  );
}
