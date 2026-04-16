"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Rocket,
  Loader2,
  Key,
  Github,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Search,
  GitBranch,
} from "lucide-react";

export type HostProvider = "vercel" | "netlify" | "render";

interface ProviderInfo {
  name: string;
  color: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  tokenKey: string;
  tokenHeader: string;
  howToGetKey: string;
  howToGetUrl: string;
  itemLabel: string;
}

const PROVIDERS: Record<HostProvider, ProviderInfo> = {
  vercel: {
    name: "Vercel",
    color: "#E0F7FA",
    tokenLabel: "Vercel Token",
    tokenPlaceholder: "Enter your Vercel API token",
    tokenKey: "vercel-token",
    tokenHeader: "X-Vercel-Token",
    howToGetKey: "Go to vercel.com/account/tokens to create a new token with the required scope.",
    howToGetUrl: "https://vercel.com/account/tokens",
    itemLabel: "Project",
  },
  netlify: {
    name: "Netlify",
    color: "#30C8C9",
    tokenLabel: "Netlify Access Token",
    tokenPlaceholder: "Enter your Netlify personal access token",
    tokenKey: "netlify-token",
    tokenHeader: "X-Netlify-Token",
    howToGetKey: "Go to app.netlify.com/user/applications/personal to create a personal access token.",
    howToGetUrl: "https://app.netlify.com/user/applications/personal",
    itemLabel: "Site",
  },
  render: {
    name: "Render",
    color: "#46E3B7",
    tokenLabel: "Render API Key",
    tokenPlaceholder: "rnd_xxxxxxxxxxxx",
    tokenKey: "render-api-key",
    tokenHeader: "X-Render-Api-Key",
    howToGetKey: "Go to dashboard.render.com/y/account/api-keys to generate an API key.",
    howToGetUrl: "https://dashboard.render.com/y/account/api-keys",
    itemLabel: "Service",
  },
};

interface DeployItem {
  id: string;
  name: string;
  url?: string;
}

interface GitHubRepoItem {
  id: number;
  full_name: string;
  name: string;
  owner: string;
  description?: string;
  private: boolean;
  html_url: string;
  default_branch?: string;
}

type DeployStep = "select-provider" | "api-key" | "select-item" | "confirm" | "deploying" | "result";
type ItemTab = "host-projects" | "github-repos";

interface GlassDeployNotificationProps {
  open: boolean;
  onClose: () => void;
  preselectedProvider?: HostProvider;
  onSendMessage?: (message: string) => void;
  githubToken?: string;
}

export function GlassDeployNotification({
  open,
  onClose,
  preselectedProvider,
  onSendMessage,
  githubToken,
}: GlassDeployNotificationProps) {
  const [step, setStep] = useState<DeployStep>("select-provider");
  const [selectedProvider, setSelectedProvider] = useState<HostProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [items, setItems] = useState<DeployItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<"host" | "github">("host");
  const [selectedGithubRepo, setSelectedGithubRepo] = useState<GitHubRepoItem | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  // Item tab state
  const [itemTab, setItemTab] = useState<ItemTab>("host-projects");

  // GitHub repos state
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState("");

  const notificationRef = useRef<HTMLDivElement>(null);

  // Load saved token on mount or provider change
  useEffect(() => {
    if (!selectedProvider) return;
    const key = PROVIDERS[selectedProvider].tokenKey;
    const saved = localStorage.getItem(key);
    if (saved) {
      setSavedToken(saved);
      setApiKey(saved);
    } else {
      setSavedToken(null);
      setApiKey("");
    }
  }, [selectedProvider]);

  // Auto-advance when preselectedProvider is provided
  useEffect(() => {
    if (open && preselectedProvider) {
      setSelectedProvider(preselectedProvider);
      const key = PROVIDERS[preselectedProvider].tokenKey;
      const saved = localStorage.getItem(key);
      if (saved) {
        setSavedToken(saved);
        setApiKey(saved);
        setStep("select-item");
        fetchItems(preselectedProvider, saved);
      } else {
        setSavedToken(null);
        setApiKey("");
        setStep("api-key");
      }
    }
  }, [open, preselectedProvider]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("select-provider");
      setSelectedProvider(null);
      setApiKey("");
      setSavedToken(null);
      setItems([]);
      setSelectedItem(null);
      setSelectedItemType("host");
      setSelectedGithubRepo(null);
      setDeployResult(null);
      setIsDeploying(false);
      setItemsError(null);
      setItemTab("host-projects");
      setGithubRepos([]);
      setRepoSearch("");
      setReposError(null);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 100);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onClose]);

  // Fetch GitHub repos (with optional server-side search)
  const fetchGithubRepos = useCallback(async (searchQuery?: string) => {
    if (!githubToken) return;
    setIsLoadingRepos(true);
    setReposError(null);

    try {
      const url = searchQuery
        ? `/api/github/repos?search=${encodeURIComponent(searchQuery)}`
        : "/api/github/repos";
      const res = await fetch(url, {
        headers: { "X-GitHub-Token": githubToken },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        throw new Error(`Invalid JSON from GitHub repos API (${res.status})`);
      }
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to fetch GitHub repos (${res.status})`);
      }
      const repos: GitHubRepoItem[] = (Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => ({
        id: r.id as number,
        full_name: r.full_name as string,
        name: r.name as string,
        owner: (r.full_name as string).split("/")[0],
        description: r.description as string | undefined,
        private: r.private as boolean,
        html_url: r.html_url as string,
        default_branch: (r.default_branch as string) || "main",
      }));
      setGithubRepos(repos);
    } catch (err) {
      setReposError(err instanceof Error ? err.message : "Failed to fetch repos");
    } finally {
      setIsLoadingRepos(false);
    }
  }, [githubToken]);

  // Fetch host projects
  const fetchItems = useCallback(async (provider: HostProvider, token: string) => {
    setIsLoadingItems(true);
    setItemsError(null);
    setItems([]);
    setSelectedItem(null);

    // Helper: safely parse JSON from a fetch Response (body can only be read once)
    const safeParse = async (res: Response) => {
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = null; }
      return { ok: res.ok, status: res.status, data, text };
    };

    try {
      let fetchedItems: DeployItem[] = [];
      const headerName = PROVIDERS[provider].tokenHeader;

      if (provider === "vercel") {
        const { ok, status, data, text: rawText } = await safeParse(await fetch("/api/vercel/projects", {
          headers: { [headerName]: token },
        }));
        if (!ok) {
          const err = data || { error: `Failed (${status})` };
          throw new Error(err.error || "Failed to fetch Vercel projects");
        }
        if (!data) throw new Error(`Invalid JSON from Vercel API: ${rawText.slice(0, 100)}`);
        fetchedItems = (Array.isArray(data) ? data : []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          url: `https://${p.name}.vercel.app`,
        }));
      } else if (provider === "netlify") {
        const { ok, status, data, text: rawText } = await safeParse(await fetch("/api/netlify/sites", {
          headers: { [headerName]: token },
        }));
        if (!ok) {
          const err = data || { error: `Failed (${status})` };
          throw new Error(err.error || "Failed to fetch Netlify sites");
        }
        if (!data) throw new Error(`Invalid JSON from Netlify API: ${rawText.slice(0, 100)}`);
        fetchedItems = (Array.isArray(data) ? data : []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          name: s.name as string,
          url: (s.ssl_url || s.url) as string,
        }));
      } else if (provider === "render") {
        const { ok, status, data, text: rawText } = await safeParse(await fetch("/api/render/services", {
          headers: { [headerName]: token },
        }));
        if (!ok) {
          const err = data || { error: `Failed (${status})` };
          throw new Error(err.error || "Failed to fetch Render services");
        }
        if (!data) throw new Error(`Invalid JSON from Render API: ${rawText.slice(0, 100)}`);
        fetchedItems = (Array.isArray(data) ? data : []).map((s: Record<string, unknown>) => ({
          id: (s.service?.id || s.id) as string,
          name: (s.service?.name || s.name || "Untitled") as string,
          url: (s.service?.serviceDetails?.url || s.url) as string,
        }));
      }

      setItems(fetchedItems);
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  // Fetch GitHub repos when tab switches
  useEffect(() => {
    if (itemTab === "github-repos" && githubToken && githubRepos.length === 0) {
      fetchGithubRepos();
    }
  }, [itemTab, githubToken, githubRepos.length, fetchGithubRepos]);

  const handleProviderSelect = (provider: HostProvider) => {
    setSelectedProvider(provider);
    const key = PROVIDERS[provider].tokenKey;
    const saved = localStorage.getItem(key);
    if (saved) {
      setSavedToken(saved);
      setApiKey(saved);
      setStep("select-item");
      fetchItems(provider, saved);
    } else {
      setSavedToken(null);
      setApiKey("");
      setStep("api-key");
    }
  };

  const handleSaveApiKey = () => {
    if (!selectedProvider || !apiKey.trim()) return;
    const key = PROVIDERS[selectedProvider].tokenKey;
    localStorage.setItem(key, apiKey.trim());
    setSavedToken(apiKey.trim());

    const providerName = PROVIDERS[selectedProvider].name;
    onSendMessage?.(`Make sure you connect ${providerName} to GitHub before deploying. This allows ${providerName} to access your repository and build from source.`);

    setStep("select-item");
    fetchItems(selectedProvider, apiKey.trim());
  };

  const handleHostItemSelect = (itemId: string) => {
    setSelectedItem(itemId);
    setSelectedItemType("host");
    setSelectedGithubRepo(null);
    setStep("confirm");
  };

  const handleGithubRepoSelect = (repo: GitHubRepoItem) => {
    setSelectedItem(repo.full_name);
    setSelectedItemType("github");
    setSelectedGithubRepo(repo);
    setStep("confirm");
  };

  const handleConfirmDeploy = async () => {
    if (!selectedProvider || !savedToken) return;
    setStep("deploying");
    setIsDeploying(true);

    try {
      const headerName = PROVIDERS[selectedProvider].tokenHeader;
      let res: Response;

      if (selectedItemType === "github" && selectedGithubRepo) {
        // Deploy from GitHub repo — create a new project/site/service linked to the repo
        const repo = selectedGithubRepo;

        if (selectedProvider === "vercel") {
          // Create a Vercel project linked to the GitHub repo
          res = await fetch("/api/vercel/projects/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", [headerName]: savedToken },
            body: JSON.stringify({
              name: repo.name,
              repoOwner: repo.owner,
              repoName: repo.name,
              branch: repo.default_branch || "main",
            }),
          });
        } else if (selectedProvider === "netlify") {
          // Create a Netlify site linked to the GitHub repo
          res = await fetch("/api/netlify/sites/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", [headerName]: savedToken },
            body: JSON.stringify({
              name: repo.name,
              repoOwner: repo.owner,
              repoName: repo.name,
              branch: repo.default_branch || "main",
              repoUrl: repo.html_url,
            }),
          });
        } else {
          // Create a Render web service linked to the GitHub repo
          res = await fetch("/api/render/services/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", [headerName]: savedToken },
            body: JSON.stringify({
              name: repo.name,
              repoOwner: repo.owner,
              repoName: repo.name,
              branch: repo.default_branch || "main",
            }),
          });
        }
      } else {
        // Deploy existing host project
        const item = items.find((i) => i.id === selectedItem);

        if (selectedProvider === "vercel") {
          res = await fetch("/api/vercel/deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json", [headerName]: savedToken },
            body: JSON.stringify({ projectId: selectedItem }),
          });
        } else if (selectedProvider === "netlify") {
          res = await fetch("/api/netlify/deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json", [headerName]: savedToken },
            body: JSON.stringify({ siteId: selectedItem, title: item?.name }),
          });
        } else {
          res = await fetch("/api/render/deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json", [headerName]: savedToken },
            body: JSON.stringify({ serviceId: selectedItem, clearCache: false }),
          });
        }
      }

      if (!res.ok) {
        const responseText = await res.text();
        let errData;
        try { errData = JSON.parse(responseText); } catch { errData = { error: `Deploy failed (${res.status}): ${responseText.slice(0, 100)}` }; }
        throw new Error(errData.error || errData.message || `Deploy failed (${res.status})`);
      }

      const responseText = await res.text();
      let data;
      try { data = JSON.parse(responseText); } catch { data = {}; }
      const displayName = selectedItemType === "github"
        ? selectedGithubRepo?.full_name || selectedItem
        : items.find((i) => i.id === selectedItem)?.name || selectedItem;

      setDeployResult({
        success: true,
        message: selectedItemType === "github"
          ? `Created ${PROVIDERS[selectedProvider!].name} project and deployed from ${displayName}`
          : `Deploy triggered on ${displayName} via ${PROVIDERS[selectedProvider!].name}`,
      });
      setStep("result");

      onSendMessage?.(`Deployment triggered on ${PROVIDERS[selectedProvider!].name} for ${displayName}. The build is now in progress.`);
    } catch (err) {
      setDeployResult({
        success: false,
        message: err instanceof Error ? err.message : "Deploy failed",
      });
      setStep("result");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCancelConfirm = () => {
    setStep("select-item");
    setDeployResult(null);
  };

  if (!open) return null;

  const provider = selectedProvider ? PROVIDERS[selectedProvider] : null;

  // Filter GitHub repos by search
  const filteredRepos = githubRepos.filter((r) =>
    !repoSearch ||
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(repoSearch.toLowerCase())
  );

  // Get display name for confirmation
  const confirmDisplayName = selectedItemType === "github"
    ? selectedGithubRepo?.full_name || selectedItem
    : items.find((i) => i.id === selectedItem)?.name || selectedItem;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={notificationRef}
        className="w-full max-w-md glass-surface-heavy border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: `${provider?.color || "#00E5FF"}20`, color: provider?.color || "#00E5FF" }}
            >
              <Rocket size={20} />
            </div>
            <div>
              <h2 className="text-[#E0F7FA] font-bold text-lg tracking-tight leading-none">
                {step === "select-provider" ? "Deploy" : step === "api-key" ? `Connect ${provider?.name}` : step === "confirm" ? "Confirm Deploy" : step === "deploying" ? "Deploying..." : step === "result" ? deployResult?.success ? "Deploy Triggered!" : "Deploy Failed" : "Select Source"}
              </h2>
              <p className="text-[#547B88] text-[10px] font-mono uppercase tracking-widest mt-0.5">
                {step === "select-provider" ? "Choose deployment host" : step === "api-key" ? "API access required" : step === "confirm" ? "Review before deploying" : step === "result" ? "Deployment status" : `${provider?.name} project or GitHub repo`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#547B88] hover:text-[#E0F7FA] transition-all rounded-full hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Step: Select Provider */}
          {step === "select-provider" && (
            <div className="space-y-3">
              <p className="text-xs text-[#547B88] leading-relaxed">
                Select a deployment host to trigger an automatic deploy. You will need an API key for the selected service.
              </p>
              {(["vercel", "netlify", "render"] as HostProvider[]).map((p) => {
                const info = PROVIDERS[p];
                const hasToken = !!localStorage.getItem(info.tokenKey);
                return (
                  <button
                    key={p}
                    onClick={() => handleProviderSelect(p)}
                    className="w-full flex items-center gap-4 px-4 py-4 bg-white/[0.02] border border-white/5 hover:bg-white/5 rounded-2xl text-left transition-all active:scale-[0.98]"
                  >
                    <div
                      className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0"
                      style={{ backgroundColor: `${info.color}15`, color: info.color }}
                    >
                      <Rocket size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: info.color }}>{info.name}</p>
                      <p className="text-[10px] text-[#547B88] font-mono">Trigger deploy via API</p>
                    </div>
                    {hasToken && (
                      <span className="text-[8px] font-mono font-bold px-2 py-1 rounded-full bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 uppercase">
                        Connected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step: API Key Input */}
          {step === "api-key" && provider && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
                  <Key size={10} /> {provider.tokenLabel}
                </label>
                <input
                  type="password"
                  placeholder={provider.tokenPlaceholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 px-4 py-3.5 text-sm rounded-xl outline-none text-[#E0F7FA] placeholder-[#1A3540] focus:border-[#00E5FF]/40 transition-all font-mono"
                />
              </div>

              <div className="rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3 space-y-2">
                <p className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.15em] flex items-center gap-1.5">
                  <Key size={10} /> How to get an API key
                </p>
                <p className="text-xs text-[#547B88] leading-relaxed">{provider.howToGetKey}</p>
                <a
                  href={provider.howToGetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono hover:underline"
                  style={{ color: provider.color }}
                >
                  <ExternalLink size={10} /> Open {provider.name} Dashboard
                </a>
              </div>

              <div className="rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/15 px-4 py-3 flex items-start gap-3">
                <Github size={16} className="text-[#00E5FF] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[#547B88] leading-relaxed">
                    Make sure you connect your <span className="font-bold" style={{ color: provider.color }}>{provider.name}</span> account to GitHub before deploying. This allows {provider.name} to access your repository and build from source.
                  </p>
                  <p className="text-[10px] text-[#00E5FF] mt-1 font-mono">
                    Jules is connected to GitHub — your repos are accessible.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim()}
                className="w-full py-3.5 text-sm font-bold active:scale-95 transition-all rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
                style={{ backgroundColor: provider.color, color: "#071115", boxShadow: `0 4px 15px ${provider.color}33` }}
              >
                <Key size={16} />
                Connect {provider.name}
              </button>

              <button
                onClick={() => { setStep("select-provider"); setSelectedProvider(null); setApiKey(""); setSavedToken(null); }}
                className="w-full py-2 text-xs text-[#547B88] font-mono uppercase tracking-widest hover:text-[#E0F7FA] transition-all"
              >
                Back to host selection
              </button>
            </div>
          )}

          {/* Step: Select Item (with tabs: Host Projects / GitHub Repos) */}
          {step === "select-item" && provider && (
            <div className="space-y-3">
              {/* Token connected indicator */}
              <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} style={{ color: provider.color }} />
                  <p className="text-xs text-[#E0F7FA] font-medium">{provider.name} connected</p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(provider.tokenKey);
                    setSavedToken(null);
                    setApiKey("");
                    setItems([]);
                    setSelectedItem(null);
                    setStep("api-key");
                  }}
                  className="text-[10px] text-[#FF2A5F] hover:underline font-mono"
                >
                  Remove
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                <button
                  onClick={() => setItemTab("host-projects")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    itemTab === "host-projects"
                      ? "bg-white/10 text-[#E0F7FA]"
                      : "text-[#547B88] hover:text-[#E0F7FA]"
                  }`}
                >
                  <Rocket size={12} />
                  {provider.itemLabel}s
                </button>
                <button
                  onClick={() => setItemTab("github-repos")}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    itemTab === "github-repos"
                      ? "bg-white/10 text-[#E0F7FA]"
                      : "text-[#547B88] hover:text-[#E0F7FA]"
                  }`}
                >
                  <Github size={12} />
                  GitHub Repos
                </button>
              </div>

              {/* Tab: Host Projects */}
              {itemTab === "host-projects" && (
                <>
                  <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1">
                    Existing {provider.itemLabel}s on {provider.name}
                  </label>
                  {isLoadingItems ? (
                    <div className="text-center py-8">
                      <Loader2 size={24} style={{ color: provider.color }} className="mx-auto mb-2 animate-spin" />
                      <p className="text-xs text-[#547B88]">Loading {provider.name} {provider.itemLabel.toLowerCase()}s...</p>
                    </div>
                  ) : itemsError ? (
                    <div className="text-center py-6">
                      <AlertCircle size={24} className="text-[#FF2A5F] mx-auto mb-2" />
                      <p className="text-xs text-[#FF2A5F]">{itemsError}</p>
                      <button
                        onClick={() => selectedProvider && fetchItems(selectedProvider, savedToken || "")}
                        className="mt-2 text-xs font-bold hover:underline"
                        style={{ color: provider.color }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-[#547B88]">No {provider.name} {provider.itemLabel.toLowerCase()}s found</p>
                      <p className="text-[10px] text-[#547B88] mt-1 opacity-60">Switch to GitHub Repos tab to deploy a repo</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleHostItemSelect(item.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/5 rounded-xl text-left transition-all active:scale-[0.98]"
                        >
                          <div
                            className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                            style={{ backgroundColor: `${provider.color}15`, color: provider.color }}
                          >
                            <Rocket size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono truncate text-[#E0F7FA]">{item.name}</p>
                            {item.url && (
                              <p className="text-[10px] text-[#547B88] font-mono truncate">{item.url}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Tab: GitHub Repos */}
              {itemTab === "github-repos" && (
                <>
                  {/* Search repos */}
                  <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-3 py-2.5">
                    <Search size={14} className="text-[#547B88] mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search repos... (press Enter to search all)"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && githubToken) {
                          fetchGithubRepos(repoSearch);
                        }
                      }}
                      className="bg-transparent border-none outline-none w-full text-sm text-[#E0F7FA] placeholder-[#1A3540] font-mono"
                    />
                    {githubToken && (
                      <button
                        onClick={() => fetchGithubRepos(repoSearch)}
                        className="ml-2 p-1 text-[#547B88] hover:text-[#E0F7FA] transition-colors shrink-0"
                        title="Refresh repos"
                      >
                        <Loader2 size={14} className={isLoadingRepos ? "animate-spin" : ""} />
                      </button>
                    )}
                  </div>

                  {!githubToken ? (
                    <div className="text-center py-6 space-y-2">
                      <Github size={28} className="text-[#547B88] mx-auto opacity-30" />
                      <p className="text-xs text-[#547B88]">GitHub token required to browse repos</p>
                      <p className="text-[10px] text-[#547B88] opacity-60">Connect your GitHub account in the Agents tab</p>
                    </div>
                  ) : isLoadingRepos ? (
                    <div className="text-center py-8">
                      <Loader2 size={24} className="text-[#E0F7FA] mx-auto mb-2 animate-spin" />
                      <p className="text-xs text-[#547B88]">Loading all GitHub repos...</p>
                      <p className="text-[10px] text-[#547B88] mt-1 opacity-60">Fetching all your repositories</p>
                    </div>
                  ) : reposError ? (
                    <div className="text-center py-6">
                      <AlertCircle size={24} className="text-[#FF2A5F] mx-auto mb-2" />
                      <p className="text-xs text-[#FF2A5F]">{reposError}</p>
                      <button
                        onClick={() => fetchGithubRepos(repoSearch)}
                        className="mt-2 text-xs text-[#00E5FF] font-bold hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-[#547B88]">
                        {repoSearch ? `No repos matching "${repoSearch}"` : "No GitHub repos found"}
                      </p>
                      {repoSearch && (
                        <button
                          onClick={() => fetchGithubRepos(repoSearch)}
                          className="mt-2 text-xs text-[#00E5FF] font-bold hover:underline"
                        >
                          Search GitHub directly
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                      {filteredRepos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => handleGithubRepoSelect(repo)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/5 hover:bg-white/5 rounded-xl text-left transition-all active:scale-[0.98]"
                        >
                          <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 bg-[#E0F7FA]/10 text-[#E0F7FA]">
                            <Github size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono truncate text-[#E0F7FA]">{repo.full_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {repo.private && (
                                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#FF2A5F]/10 text-[#FF2A5F] border border-[#FF2A5F]/20 uppercase">Private</span>
                              )}
                              <span className="text-[10px] text-[#547B88] font-mono flex items-center gap-0.5">
                                <GitBranch size={8} /> {repo.default_branch || "main"}
                              </span>
                            </div>
                            {repo.description && (
                              <p className="text-[10px] text-[#547B88] line-clamp-1 mt-0.5 opacity-60">{repo.description}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Repo count */}
                  {githubRepos.length > 0 && (
                    <p className="text-[10px] text-[#547B88] font-mono text-center opacity-40">
                      {filteredRepos.length} of {githubRepos.length} repos
                    </p>
                  )}
                </>
              )}

              {/* Back */}
              <button
                onClick={() => { setStep("select-provider"); setSelectedProvider(null); setItems([]); setSelectedItem(null); setItemTab("host-projects"); }}
                className="w-full py-2 text-xs text-[#547B88] font-mono uppercase tracking-widest hover:text-[#E0F7FA] transition-all"
              >
                Back to host selection
              </button>
            </div>
          )}

          {/* Step: Confirm Deploy */}
          {step === "confirm" && provider && selectedItem && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0"
                    style={{ backgroundColor: selectedItemType === "github" ? "#E0F7FA15" : `${provider.color}15`, color: selectedItemType === "github" ? "#E0F7FA" : provider.color }}
                  >
                    {selectedItemType === "github" ? <Github size={22} /> : <Rocket size={22} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#E0F7FA] truncate">
                      {confirmDisplayName}
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: provider.color }}>
                      {selectedItemType === "github"
                        ? `Deploy GitHub repo to ${provider.name}`
                        : `Redeploy on ${provider.name}`
                      }
                    </p>
                  </div>
                </div>
                {selectedItemType === "github" && selectedGithubRepo && (
                  <div className="flex items-center gap-2 pl-15">
                    {selectedGithubRepo.private && (
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#FF2A5F]/10 text-[#FF2A5F] border border-[#FF2A5F]/20 uppercase">Private</span>
                    )}
                    <span className="text-[10px] text-[#547B88] font-mono flex items-center gap-0.5">
                      <GitBranch size={8} /> {selectedGithubRepo.default_branch || "main"}
                    </span>
                  </div>
                )}
                {selectedItemType === "host" && items.find((i) => i.id === selectedItem)?.url && (
                  <p className="text-[10px] text-[#547B88] font-mono truncate pl-15">
                    {items.find((i) => i.id === selectedItem)?.url}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-[#B388FF]/5 border border-[#B388FF]/15 px-4 py-3 flex items-start gap-3">
                <ShieldCheck size={16} className="text-[#B388FF] shrink-0 mt-0.5" />
                <p className="text-xs text-[#547B88] leading-relaxed">
                  {selectedItemType === "github"
                    ? <>Are you sure you want to create a new <span className="font-bold" style={{ color: provider.color }}>{provider.name}</span> project and deploy from <span className="font-bold text-[#E0F7FA]">{confirmDisplayName}</span>? This will link your GitHub repo and trigger the first build.</>
                    : <>Are you sure you want to trigger a deployment to <span className="font-bold" style={{ color: provider.color }}>{provider.name}</span>? This will start a new build and deploy process.</>
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 py-3.5 text-sm font-bold text-[#547B88] hover:text-[#E0F7FA] active:scale-95 transition-all rounded-xl font-mono uppercase tracking-widest bg-white/5 border border-white/5 hover:bg-white/10"
                >
                  No
                </button>
                <button
                  onClick={handleConfirmDeploy}
                  className="flex-[2] py-3.5 text-sm font-bold active:scale-95 transition-all rounded-xl flex items-center justify-center gap-2 shadow-lg"
                  style={{ backgroundColor: provider.color, color: "#071115", boxShadow: `0 10px 30px ${provider.color}33` }}
                >
                  <Rocket size={18} />
                  Yes, Deploy
                </button>
              </div>
            </div>
          )}

          {/* Step: Deploying */}
          {step === "deploying" && provider && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center animate-pulse"
                  style={{ backgroundColor: `${provider.color}15` }}
                >
                  <Rocket size={36} style={{ color: provider.color }} className="animate-bounce" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#E0F7FA]">
                  {selectedItemType === "github" ? `Creating project & deploying to ${provider.name}...` : `Deploying to ${provider.name}...`}
                </p>
                <p className="text-[10px] text-[#547B88] font-mono mt-1">
                  {confirmDisplayName}
                </p>
              </div>
              <Loader2 size={28} style={{ color: provider.color }} className="animate-spin" />
            </div>
          )}

          {/* Step: Result */}
          {step === "result" && provider && deployResult && (
            <div className="space-y-4">
              <div
                className={`rounded-xl px-4 py-5 flex flex-col items-center gap-3 ${
                  deployResult.success
                    ? "bg-[#00E676]/5 border border-[#00E676]/20"
                    : "bg-[#FF2A5F]/5 border border-[#FF2A5F]/20"
                }`}
              >
                {deployResult.success ? (
                  <CheckCircle2 size={36} className="text-[#00E676]" />
                ) : (
                  <AlertCircle size={36} className="text-[#FF2A5F]" />
                )}
                <div className="text-center">
                  <p className={`text-sm font-bold ${deployResult.success ? "text-[#00E676]" : "text-[#FF2A5F]"}`}>
                    {deployResult.success ? "Deploy Triggered Successfully!" : "Deploy Failed"}
                  </p>
                  <p className="text-[10px] text-[#547B88] font-mono mt-1">{deployResult.message}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 text-sm font-bold active:scale-95 transition-all rounded-xl"
                style={{ backgroundColor: deployResult.success ? "#00E676" : "#FF2A5F", color: "#071115" }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
