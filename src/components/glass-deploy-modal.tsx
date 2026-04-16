"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Rocket,
  Loader2,
  ExternalLink,
  Key,
  Github,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

type HostProvider = "vercel" | "netlify" | "render";

interface DeployConfig {
  provider: HostProvider;
  token: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenPrefix: string;
}

const PROVIDER_CONFIG: Record<HostProvider, Omit<DeployConfig, "token">> = {
  vercel: {
    provider: "vercel",
    tokenLabel: "Vercel Token",
    tokenPlaceholder: "Enter your Vercel API token",
    tokenPrefix: "",
  },
  netlify: {
    provider: "netlify",
    tokenLabel: "Netlify Access Token",
    tokenPlaceholder: "Enter your Netlify personal access token",
    tokenPrefix: "",
  },
  render: {
    provider: "render",
    tokenLabel: "Render API Key",
    tokenPlaceholder: "rnd_xxxxxxxxxxxx",
    tokenPrefix: "rnd_",
  },
};

interface DeploySite {
  id: string;
  name: string;
  url?: string;
  provider: HostProvider;
}

interface GlassDeployModalProps {
  open: boolean;
  onClose: () => void;
  githubToken?: string;
  onDeployTriggered?: (provider: HostProvider, siteName: string) => void;
}

const TOKEN_KEYS: Record<HostProvider, string> = {
  vercel: "vercel-token",
  netlify: "netlify-token",
  render: "render-api-key",
};

export function GlassDeployModal({
  open,
  onClose,
  githubToken,
  onDeployTriggered,
}: GlassDeployModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<HostProvider>("vercel");
  const [tokens, setTokens] = useState<Record<HostProvider, string>>({
    vercel: "",
    netlify: "",
    render: "",
  });
  const [sites, setSites] = useState<DeploySite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Load saved tokens on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved: Record<HostProvider, string> = { vercel: "", netlify: "", render: "" };
    for (const provider of Object.keys(TOKEN_KEYS) as HostProvider[]) {
      const savedToken = localStorage.getItem(TOKEN_KEYS[provider]);
      if (savedToken) saved[provider] = savedToken;
    }
    setTokens(saved);
  }, []);

  const currentToken = tokens[selectedProvider];
  const hasToken = !!currentToken;

  // Fetch sites/projects when provider changes
  const fetchSites = useCallback(async (provider: HostProvider, token: string) => {
    setIsLoadingSites(true);
    setSitesError(null);
    setSites([]);
    setSelectedSite(null);

    try {
      let fetchedSites: DeploySite[] = [];

      if (provider === "vercel") {
        const res = await fetch("/api/vercel/projects", {
          headers: { "X-Vercel-Token": token },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed" }));
          throw new Error(err.error || "Failed to fetch Vercel projects");
        }
        const data = await res.json();
        fetchedSites = (Array.isArray(data) ? data : []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          url: `https://${p.name}.vercel.app`,
          provider: "vercel" as HostProvider,
        }));
      } else if (provider === "netlify") {
        const res = await fetch("/api/netlify/sites", {
          headers: { "X-Netlify-Token": token },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed" }));
          throw new Error(err.error || "Failed to fetch Netlify sites");
        }
        const data = await res.json();
        fetchedSites = (Array.isArray(data) ? data : []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: s.name as string,
          url: (s.ssl_url || s.url) as string,
          provider: "netlify" as HostProvider,
        }));
      } else if (provider === "render") {
        const res = await fetch("/api/render/services", {
          headers: { "X-Render-Api-Key": token },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Failed" }));
          throw new Error(err.error || "Failed to fetch Render services");
        }
        const data = await res.json();
        fetchedSites = (Array.isArray(data) ? data : []).map((s: Record<string, unknown>) => ({
          id: s.service?.id as string || s.id as string,
          name: (s.service?.name || s.name || "Untitled") as string,
          url: (s.service?.serviceDetails?.url || s.url) as string,
          provider: "render" as HostProvider,
        }));
      }

      setSites(fetchedSites);
    } catch (err) {
      setSitesError(err instanceof Error ? err.message : "Failed to fetch sites");
    } finally {
      setIsLoadingSites(false);
    }
  }, []);

  // Fetch sites when token becomes available for selected provider
  useEffect(() => {
    if (open && currentToken) {
      fetchSites(selectedProvider, currentToken);
    }
  }, [open, selectedProvider, currentToken, fetchSites]);

  const handleSaveToken = () => {
    const token = tokens[selectedProvider];
    if (token) {
      localStorage.setItem(TOKEN_KEYS[selectedProvider], token);
      setShowTokenInput(false);
    }
  };

  const handleRemoveToken = () => {
    localStorage.removeItem(TOKEN_KEYS[selectedProvider]);
    setTokens((prev) => ({ ...prev, [selectedProvider]: "" }));
    setSites([]);
    setSelectedSite(null);
    setShowTokenInput(true);
  };

  const handleDeploy = async () => {
    if (!currentToken || !selectedSite) return;

    setIsDeploying(true);
    setDeployResult(null);

    try {
      const site = sites.find((s) => s.id === selectedSite);
      let res: Response;

      if (selectedProvider === "vercel") {
        res = await fetch("/api/vercel/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Vercel-Token": currentToken },
          body: JSON.stringify({ projectId: selectedSite }),
        });
      } else if (selectedProvider === "netlify") {
        res = await fetch("/api/netlify/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Netlify-Token": currentToken },
          body: JSON.stringify({ siteId: selectedSite, title: site?.name }),
        });
      } else {
        res = await fetch("/api/render/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Render-Api-Key": currentToken },
          body: JSON.stringify({ serviceId: selectedSite, clearCache: false }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Deploy failed" }));
        throw new Error(err.error || `Deploy failed (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      setDeployResult({
        success: true,
        message: `Deploy triggered on ${site?.name || selectedSite}`,
      });
      onDeployTriggered?.(selectedProvider, site?.name || selectedSite);
    } catch (err) {
      setDeployResult({
        success: false,
        message: err instanceof Error ? err.message : "Deploy failed",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  if (!open) return null;

  const config = PROVIDER_CONFIG[selectedProvider];
  const providerColors: Record<HostProvider, { bg: string; text: string; border: string; accent: string }> = {
    vercel: { bg: "bg-white/5", text: "text-[#E0F7FA]", border: "border-white/10", accent: "#E0F7FA" },
    netlify: { bg: "bg-[#30C8C9]/5", text: "text-[#30C8C9]", border: "border-[#30C8C9]/20", accent: "#30C8C9" },
    render: { bg: "bg-[#46E3B7]/5", text: "text-[#46E3B7]", border: "border-[#46E3B7]/20", accent: "#46E3B7" },
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl glass-surface-heavy border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00E5FF] rounded-2xl flex items-center justify-center text-[#071115] shadow-lg">
              <Rocket size={24} />
            </div>
            <div>
              <h2 className="text-[#E0F7FA] font-bold text-xl tracking-tight leading-none mb-1.5">Deploy</h2>
              <p className="text-[#547B88] text-xs font-mono uppercase tracking-widest">Trigger deployment to host</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#547B88] hover:text-[#E0F7FA] transition-all rounded-full hover:bg-white/5">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">Select Host</label>
            <div className="grid grid-cols-3 gap-3">
              {(["vercel", "netlify", "render"] as HostProvider[]).map((provider) => {
                const colors = providerColors[provider];
                const isSelected = selectedProvider === provider;
                const isConnected = !!tokens[provider];
                return (
                  <button
                    key={provider}
                    onClick={() => { setSelectedProvider(provider); setDeployResult(null); }}
                    className={`flex flex-col items-center justify-center py-4 rounded-2xl border transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.border} ${colors.text} shadow-md`
                        : "bg-white/5 border-white/10 text-[#547B88] hover:border-white/20"
                    }`}
                  >
                    <span className="text-sm font-bold capitalize">{provider}</span>
                    {isConnected && (
                      <span className="text-[8px] font-mono mt-1 px-1.5 py-0.5 rounded bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 uppercase">Connected</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Token Section */}
          {hasToken && !showTokenInput ? (
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[#00E676]" />
                <div>
                  <p className="text-sm text-[#E0F7FA] font-medium">{config.tokenLabel} connected</p>
                  <p className="text-[10px] text-[#547B88] font-mono">{currentToken.substring(0, 8)}...{currentToken.substring(currentToken.length - 4)}</p>
                </div>
              </div>
              <button onClick={handleRemoveToken} className="text-xs text-[#FF2A5F] hover:underline font-mono">
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
                  <Key size={10} /> {config.tokenLabel}
                </label>
                <input
                  type="password"
                  placeholder={config.tokenPlaceholder}
                  value={tokens[selectedProvider]}
                  onChange={(e) => setTokens((prev) => ({ ...prev, [selectedProvider]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl outline-none text-[#E0F7FA] placeholder-[#1A3540] focus:border-[#00E5FF]/40 transition-all font-mono"
                />
              </div>

              {/* GitHub Connection Warning */}
              <div className="rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/15 px-4 py-3 flex items-start gap-3">
                <Github size={16} className="text-[#00E5FF] shrink-0 mt-0.5" />
                <p className="text-xs text-[#547B88] leading-relaxed">
                  Make sure you connect your <span className="text-[#00E5FF] font-bold capitalize">{selectedProvider}</span> account to GitHub before deploying. This allows {selectedProvider} to access your repository and build from source.
                  {!githubToken && (
                    <span className="text-[#FF2A5F] block mt-1">Add a GitHub token in the Agents tab first.</span>
                  )}
                </p>
              </div>

              <button
                onClick={handleSaveToken}
                disabled={!tokens[selectedProvider].trim()}
                className="w-full py-3 bg-[#00E5FF] text-[#071115] rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-40 shadow-[0_4px_15px_rgba(0,229,255,0.2)]"
              >
                Connect {config.tokenLabel}
              </button>
            </div>
          )}

          {/* Sites List */}
          {hasToken && !showTokenInput && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">
                Select {selectedProvider === "render" ? "Service" : "Project"} to Deploy
              </label>

              {isLoadingSites ? (
                <div className="text-center py-6">
                  <Loader2 size={24} className="text-[#00E5FF] mx-auto mb-2 animate-spin" />
                  <p className="text-xs text-[#547B88]">Loading {selectedProvider} projects...</p>
                </div>
              ) : sitesError ? (
                <div className="text-center py-6">
                  <AlertCircle size={24} className="text-[#FF2A5F] mx-auto mb-2" />
                  <p className="text-xs text-[#FF2A5F]">{sitesError}</p>
                  <button
                    onClick={() => fetchSites(selectedProvider, currentToken)}
                    className="mt-2 text-xs text-[#00E5FF] font-bold hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : sites.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-[#547B88]">No {selectedProvider} projects found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {sites.map((site) => {
                    const isSelected = selectedSite === site.id;
                    return (
                      <button
                        key={site.id}
                        onClick={() => setSelectedSite(isSelected ? null : site.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                          isSelected
                            ? "bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF]"
                            : "bg-white/[0.02] border border-white/5 hover:bg-white/5 text-[#E0F7FA]"
                        }`}
                      >
                        <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
                          isSelected ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "bg-white/5 text-[#547B88]"
                        }`}>
                          <Rocket size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono truncate">{site.name}</p>
                          {site.url && (
                            <p className="text-[10px] text-[#547B88] font-mono truncate">{site.url}</p>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-[#00E5FF] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Deploy Result */}
          {deployResult && (
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
              deployResult.success
                ? "bg-[#00E676]/10 border border-[#00E676]/20"
                : "bg-[#FF2A5F]/10 border border-[#FF2A5F]/20"
            }`}>
              {deployResult.success ? (
                <CheckCircle2 size={18} className="text-[#00E676] shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-[#FF2A5F] shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${deployResult.success ? "text-[#00E676]" : "text-[#FF2A5F]"}`}>
                  {deployResult.success ? "Deploy Triggered!" : "Deploy Failed"}
                </p>
                <p className="text-[10px] text-[#547B88] font-mono">{deployResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 glass-surface flex gap-4 pb-safe glass-border-t">
          <button onClick={onClose} disabled={isDeploying} className="flex-1 py-4 text-sm font-bold text-[#547B88] hover:text-[#E0F7FA] active:scale-95 transition-all rounded-2xl font-mono uppercase tracking-widest">
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={isDeploying || !hasToken || !selectedSite}
            className="flex-[2] flex items-center justify-center gap-3 py-4 bg-[#00E5FF] text-[#071115] rounded-2xl font-bold text-sm shadow-[0_10px_30px_rgba(0,229,255,0.3)] active:scale-95 transition-all disabled:opacity-40"
          >
            {isDeploying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket size={20} />}
            <span className="uppercase tracking-widest">Deploy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
