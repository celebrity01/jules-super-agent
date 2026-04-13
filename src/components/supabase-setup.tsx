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

  // Check if already configured
  const existingConfig = getSupabaseConfig();

  const handleConnect = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setError("Both Project URL and Anon Key are required");
      return;
    }

    // Validate URL format
    try {
      const parsedUrl = new URL(url.trim());
      if (!parsedUrl.hostname.includes("supabase")) {
        // Allow custom domains too
      }
    } catch {
      setError("Please enter a valid Supabase project URL (e.g., https://yourproject.supabase.co)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Test the connection by fetching the Supabase health endpoint
      const testUrl = `${url.trim()}/rest/v1/`;
      const res = await fetch(testUrl, {
        headers: {
          apikey: anonKey.trim(),
          Authorization: `Bearer ${anonKey.trim()}`,
        },
      });

      // Even a 404 or error response means the URL + key are valid Supabase credentials
      // We just need to verify the connection works (not a network error)
      if (res.status === 401 || res.status === 403) {
        // Key is invalid
        throw new Error("Invalid Anon Key. Please check your Supabase project settings.");
      }

      // Save the configuration
      saveSupabaseConfig(url.trim(), anonKey.trim());
      setStep("success");

      // Brief delay to show success state
      setTimeout(() => {
        onConfigured();
      }, 1500);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Cannot connect to Supabase. Check the Project URL and ensure it includes https://");
      } else {
        setError(err instanceof Error ? err.message : "Failed to connect to Supabase");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#0a0a0f" }}>
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="glass-card-refined rounded-2xl p-8 text-center animate-smooth-appear">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center glow-success">
                <CheckCircle2 className="h-8 w-8 text-[#10b981]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Supabase Connected!</h2>
            <p className="text-sm text-[#94a3b8]">Your database is ready. Setting up your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />

      {/* Gradient orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 animate-float"
        style={{
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8"
        style={{
          background: "radial-gradient(circle, #34d399 0%, transparent 70%)",
          animation: "float 6s ease-in-out infinite reverse",
        }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card-refined rounded-2xl p-8 animate-smooth-appear animate-glow-pulse">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-lg">
                <Database className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] opacity-20 animate-pulse-ring" />
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-emerald-400 animate-float" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-[#10b981] to-[#34d399] bg-clip-text text-transparent">
                Connect Supabase
              </span>
            </h1>
            <p className="text-sm text-[#94a3b8]">
              Add persistent storage, authentication, and real-time sync
            </p>
          </div>

          {/* Supabase URL Input */}
          <div className="space-y-3 mb-4">
            <Label htmlFor="supabase-url" className="text-sm text-[#94a3b8] font-medium">
              Project URL
            </Label>
            <div className="relative">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <Input
                id="supabase-url"
                type="url"
                placeholder="https://yourproject.supabase.co"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pl-10 font-mono input-refined text-white placeholder:text-[#4a4a5a] focus:border-[rgba(16,185,129,0.3)] input-glow h-11 rounded-lg transition-all duration-200"
              />
            </div>
          </div>

          {/* Anon Key Input */}
          <div className="space-y-3 mb-6">
            <Label htmlFor="supabase-key" className="text-sm text-[#94a3b8] font-medium">
              Anon Key
            </Label>
            <div className="relative">
              <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
              <Input
                id="supabase-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => {
                  setAnonKey(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="pl-10 font-mono input-refined text-white placeholder:text-[#4a4a5a] focus:border-[rgba(16,185,129,0.3)] input-glow h-11 rounded-lg transition-all duration-200"
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
            disabled={isLoading || !url.trim() || !anonKey.trim()}
            className="w-full bg-gradient-premium text-white h-11 rounded-lg font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 interaction-scale"
            size="lg"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>Connect Supabase</span>
              </div>
            )}
          </Button>

          {/* Skip option */}
          <button
            onClick={onSkip}
            className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-[#4a4a5a] hover:text-[#64748b] transition-colors py-2"
          >
            Skip for now — use local storage only
            <ArrowRight className="h-3 w-3" />
          </button>

          {/* Help section */}
          <div className="mt-6 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">How to get your Supabase credentials</p>
            <ol className="text-xs text-[#64748b] space-y-1.5 list-decimal list-inside">
              <li>Visit <span className="text-[#94a3b8] font-medium">supabase.com</span> and create a project</li>
              <li>Go to Project Settings → API</li>
              <li>Copy the <span className="text-[#10b981] font-medium">Project URL</span> and <span className="text-[#10b981] font-medium">anon/public key</span></li>
              <li>Run the SQL schema in the SQL Editor</li>
            </ol>
            <div className="flex items-center gap-3 mt-2">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#10b981] hover:text-[#34d399] transition-colors"
              >
                Open Supabase Dashboard <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://supabase.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#818cf8] hover:text-[#6366f1] transition-colors"
              >
                Documentation <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Features preview */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.08)]">
              <Database className="h-3.5 w-3.5 text-[#10b981]" />
              <span className="text-[9px] text-[#10b981] font-medium text-center">Persistent Storage</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-[rgba(129,140,248,0.04)] border border-[rgba(129,140,248,0.08)]">
              <Zap className="h-3.5 w-3.5 text-[#818cf8]" />
              <span className="text-[9px] text-[#818cf8] font-medium text-center">Real-time Sync</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.08)]">
              <Sparkles className="h-3.5 w-3.5 text-[#f59e0b]" />
              <span className="text-[9px] text-[#f59e0b] font-medium text-center">Auth & Security</span>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[10px] text-[#4a4a5a] mt-4">
          Your credentials are stored locally and never sent to any third party
        </p>
      </div>
    </div>
  );
}
