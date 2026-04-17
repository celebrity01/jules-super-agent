"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Globe,
  Lock,
  Star,
  AlertCircle,
  Upload,
} from "lucide-react";
import {
  JulesSource,
  GitHubRepoInfo,
  getSourceDisplayName,
  getSourceBranch,
  AutomationMode,
  getGitHubRepos,
} from "@/lib/jules-client";

interface GlassNewMissionModalProps {
  open: boolean;
  onClose: () => void;
  sources: JulesSource[];
  apiKey: string;
  githubToken?: string;
  onSessionCreated: (sessionId: string) => void;
  onAddRepo?: () => void;
}

/** Deployment host types matching the deploy wizard */
type DeployHost = "vercel" | "netlify" | "render" | "github-pages";

/** Info for each deployment host */
interface DeployHostInfo {
  name: string;
  color: string;
  description: string;
  icon: "rocket" | "globe";
}

const DEPLOY_HOSTS: Record<DeployHost, DeployHostInfo> = {
  vercel: {
    name: "Vercel",
    color: "#E0F7FA",
    description: "vercel.json + framework detection",
    icon: "rocket",
  },
  netlify: {
    name: "Netlify",
    color: "#30C8C9",
    description: "netlify.toml + build config",
    icon: "rocket",
  },
  render: {
    name: "Render",
    color: "#46E3B7",
    description: "render.yaml blueprint",
    icon: "rocket",
  },
  "github-pages": {
    name: "GitHub Pages",
    color: "#B8A9E8",
    description: ".github/workflows/deploy.yml",
    icon: "globe",
  },
};

/**
 * Build deployment config instructions to append to the Jules prompt.
 * When a user checks a host, Jules is instructed to include the appropriate
 * deployment workflow/config files in the generated code so that one-tap
 * deployment from the Jules Super Agent UI works immediately.
 */
function buildDeployInstructions(hosts: Set<DeployHost>): string {
  if (hosts.size === 0) return "";

  const lines: string[] = [
    "",
    "CRITICAL REQUIREMENT: You must include deployment configuration files to enable one-tap hosting on the following platforms.",
    "",
  ];

  if (hosts.has("github-pages")) {
    lines.push(
      "GITHUB PAGES DEPLOYMENT:",
      "Include a GitHub Actions deployment workflow file.",
      "File Path: .github/workflows/deploy.yml",
      "File Content Requirements:",
      "  - Triggers: Include both push (to main branch) and workflow_dispatch (so manual button can trigger it).",
      "  - Permissions: Must have pages: write, contents: read, and id-token: write.",
      "  - Steps:",
      "    1. Checkout the repository.",
      "    2. Setup GitHub Pages.",
      "    3. Upload the artifact (use path . for static sites).",
      "    4. Deploy to GitHub Pages.",
      "  - Use actions/deploy-pages@v4 for deployment.",
      "  - Use actions/upload-pages-artifact@v3 for artifact upload.",
      "  - Use actions/configure-pages@v5 for Pages setup.",
      "  - Set the workflow to use the GitHub Pages environment.",
      "",
    );
  }

  if (hosts.has("vercel")) {
    lines.push(
      "VERCEL DEPLOYMENT:",
      "Include a vercel.json configuration file in the project root.",
      "File Path: vercel.json",
      "File Content Requirements:",
      "  - Set the framework preset based on the project type (e.g., nextjs, react, etc.).",
      "  - Configure buildCommand and outputDirectory appropriately.",
      "  - Include installCommand if a specific package manager is needed (e.g., npm, yarn, bun).",
      "  - Add any necessary rewrites or redirects for single-page applications.",
      "  - Ensure the project can be deployed by connecting the GitHub repo to Vercel.",
      "",
    );
  }

  if (hosts.has("netlify")) {
    lines.push(
      "NETLIFY DEPLOYMENT:",
      "Include a netlify.toml configuration file in the project root.",
      "File Path: netlify.toml",
      "File Content Requirements:",
      "  - Set the build command (e.g., npm run build, yarn build, bun run build).",
      "  - Set the publish directory (e.g., dist, out, .next/static).",
"  - Configure the Node.js version if needed via [build.environment].",
      "  - Add necessary redirects for single-page applications in [[redirects]] section.",
      "  - Ensure the project can be deployed by connecting the GitHub repo to Netlify.",
      "",
    );
  }

  if (hosts.has("render")) {
    lines.push(
      "RENDER DEPLOYMENT:",
      "Include a render.yaml blueprint file.",
 "File Path: render.yaml",
      "File Content Requirements:",
      "  - Define a web service (type: web).",
      "  - Set the runtime (e.g., Node).",
      "  - Set the build command (e.g., npm install && npm run build).",
      "  - Set the start command (e.g., npm start, npm run start).",
      "  - Set the plan (e.g., free or starter).",
      "  - Configure envVars if needed (e.g., NODE_ENV=production).",
      "  - Reference the GitHub repo for auto-deploy on push.",
      "",
    );
  }

  lines.push(
    "IMPORTANT: These deployment files must be functional and ready to use. The user should be able to deploy to any checked platform with a single click from the Jules Super Agent deploy menu after the code is generated.",
  );

  return lines.join("\n");
}

/** Represents a unified repo item for the dropdown */
interface RepoItem {
  /** Unique key for rendering */
  key: string;
  /** Display name e.g. "owner/repo" */
  displayName: string;
  /** Branch to use */
  branch: string;
  /** Source name for Jules API (e.g. "sources/github/owner/repo") */
  sourceName: string;
  /** Whether this is already a registered Jules source */
  isRegistered: boolean;
  /** Whether it's a private repo */
  isPrivate?: boolean;
  /** Stars count */
  stars?: number;
  /** Description */
  description?: string;
}

export function GlassNewMissionModal({
  open,
  onClose,
  sources,
  apiKey,
  githubToken,
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

  // GitHub repos state
  const [githubRepos, setGithubRepos] = useState<GitHubRepoInfo[]>([]);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Branch selection state
  const [branches, setBranches] = useState<{ name: string; commit_sha: string; protected: boolean }[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Deployment host selection state
  const [selectedDeployHosts, setSelectedDeployHosts] = useState<Set<DeployHost>>(new Set());

  // Fetch GitHub repos when dropdown opens
  const fetchGithubRepos = useCallback(async () => {
    if (!githubToken || githubRepos.length > 0) return;
    setIsLoadingGithub(true);
    setGithubError(null);
    try {
      const repos = await getGitHubRepos(githubToken);
      setGithubRepos(repos);
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : "Failed to load GitHub repos");
    } finally {
      setIsLoadingGithub(false);
    }
  }, [githubToken, githubRepos.length]);

  useEffect(() => {
    if (dropdownOpen && githubToken) {
      fetchGithubRepos();
    }
  }, [dropdownOpen, githubToken, fetchGithubRepos]);

  // Close repo dropdown on outside click
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

  // Close branch dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    };
    if (branchDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [branchDropdownOpen]);

  // Fetch branches for the selected repo
  const fetchBranches = useCallback(async (owner: string, repo: string) => {
    if (!githubToken) return;
    setIsLoadingBranches(true);
    setBranchesError(null);
    setBranches([]);
    try {
      const res = await fetch(`/api/github/repos/${owner}/${repo}/branches`, {
        headers: { "X-GitHub-Token": githubToken },
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        throw new Error(`Invalid JSON from branches API (${res.status})`);
      }
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to fetch branches (${res.status})`);
      }
      const branchList = (Array.isArray(data) ? data : []) as { name: string; commit_sha: string; protected: boolean }[];
      setBranches(branchList);
    } catch (err) {
      setBranchesError(err instanceof Error ? err.message : "Failed to fetch branches");
    } finally {
      setIsLoadingBranches(false);
    }
  }, [githubToken]);

  if (!open) return null;

  // Build a set of registered source repo names for matching
  const registeredRepoNames = new Set(
    sources.map((s) => getSourceDisplayName(s).toLowerCase())
  );

  // Build unified repo items list
  const buildRepoItems = (): RepoItem[] => {
    const items: RepoItem[] = [];

    // Add registered Jules sources first
    for (const source of sources) {
      const displayName = getSourceDisplayName(source);
      items.push({
        key: source.name,
        displayName,
        branch: getSourceBranch(source),
        sourceName: source.name,
        isRegistered: true,
        isPrivate: source.githubRepo?.isPrivate,
      });
    }

    // Add GitHub repos that aren't already registered
    for (const repo of githubRepos) {
      const displayName = repo.full_name || `${repo.name}`;
      if (!registeredRepoNames.has(displayName.toLowerCase())) {
        // Construct Jules source name from GitHub repo
        const parts = displayName.split("/");
        const owner = parts.length > 1 ? parts[0] : "";
        const repoName = parts.length > 1 ? parts[1] : parts[0];
        const sourceName = owner
          ? `sources/github/${owner}/${repoName}`
          : `sources/github/${repoName}`;

        items.push({
          key: sourceName,
          displayName,
          branch: "main",
          sourceName,
          isRegistered: false,
          isPrivate: repo.private,
          stars: repo.description ? undefined : undefined, // GitHubRepoInfo doesn't have stars but we'll use description
          description: repo.description,
        });
      }
    }

    return items;
  };

  const allRepoItems = buildRepoItems();

  const filteredItems = allRepoItems.filter((item) => {
    const name = item.displayName.toLowerCase();
    return !searchFilter || name.includes(searchFilter.toLowerCase());
  });

  // Separate registered and unregistered for grouped display
  const registeredItems = filteredItems.filter((i) => i.isRegistered);
  const unregisteredItems = filteredItems.filter((i) => !i.isRegistered);

  const handleSelectSource = (item: RepoItem) => {
    setSelectedSource(item.sourceName);
    setSelectedSourceDisplay(item.displayName);
    setBranch(item.branch);
    setDropdownOpen(false);
    setSearchFilter("");

    // Fetch branches for the selected repo
    const parts = item.displayName.split("/");
    const owner = parts.length > 1 ? parts[0] : "";
    const repoName = parts.length > 1 ? parts[1] : parts[0];
    if (owner && repoName && githubToken) {
      fetchBranches(owner, repoName);
    }
  };

  const toggleDeployHost = (host: DeployHost) => {
    setSelectedDeployHosts((prev) => {
      const next = new Set(prev);
      if (next.has(host)) {
        next.delete(host);
      } else {
        next.add(host);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!prompt.trim()) { setError("Objective is required"); return; }
    if (!selectedSource) { setError("Select a repository"); return; }

    setIsLoading(true);
    setError(null);

    try {
      const { createSession } = await import("@/lib/jules-client");
      // Append deployment config instructions if any hosts are selected
      const deployInstructions = buildDeployInstructions(selectedDeployHosts);
      const fullPrompt = prompt.trim() + deployInstructions;

      const session = await createSession(apiKey, {
        prompt: fullPrompt,
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
    setBranches([]); setBranchesError(null); setBranchDropdownOpen(false); setBranchSearch("");
    setSelectedDeployHosts(new Set());
    onClose();
  };

  const renderRepoItem = (item: RepoItem) => {
    const isSelected = selectedSource === item.sourceName;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => handleSelectSource(item)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-all ${
          isSelected ? "bg-[#00E5FF]/10 text-[#00E5FF]" : "text-[#E0F7FA]"
        }`}
      >
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
          isSelected ? "bg-[#00E5FF]/20 text-[#00E5FF]" : item.isRegistered ? "bg-[#00E676]/10 text-[#00E676]" : "bg-white/5 text-[#547B88]"
        }`}>
          {item.isPrivate ? <Lock size={14} /> : <GitBranch size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono truncate">{item.displayName}</p>
            {item.isRegistered && (
              <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/20 shrink-0">
                Connected
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#547B88] font-mono truncate">
            {item.isRegistered ? `Branch: ${item.branch}` : item.description || `Branch: ${item.branch}`}
          </p>
        </div>
        {isSelected && <Check size={16} className="text-[#00E5FF] shrink-0" />}
      </button>
    );
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
            {/* Context Target - Enhanced Dropdown with GitHub repos */}
            <div className="space-y-2 sm:col-span-2">
              <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
                <GitBranch size={12} /> Context Target *
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl text-left hover:bg-white/10 transition-all flex items-center justify-between gap-2 disabled:opacity-50"
                >
                  <span className={selectedSourceDisplay ? "text-[#E0F7FA] font-mono" : "text-[#1A3540]"}>
                    {selectedSourceDisplay || "Select repository..."}
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

                    {/* Repo List */}
                    <div className="max-h-80 overflow-y-auto">
                      {isLoadingGithub && githubRepos.length === 0 ? (
                        <div className="p-6 text-center">
                          <Loader2 size={24} className="text-[#00E5FF] mx-auto mb-2 animate-spin" />
                          <p className="text-xs text-[#547B88]">Loading your GitHub repositories...</p>
                        </div>
                      ) : githubError && sources.length === 0 ? (
                        <div className="p-6 text-center">
                          <Github size={24} className="text-[#FF2A5F] opacity-30 mx-auto mb-2" />
                          <p className="text-xs text-[#FF2A5F]">{githubError}</p>
                          <p className="text-[10px] text-[#547B88] mt-1">Add a GitHub token in the Agents tab to see your repos</p>
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="p-6 text-center">
                          <Github size={24} className="text-[#547B88] opacity-30 mx-auto mb-2" />
                          <p className="text-xs text-[#547B88]">
                            {searchFilter ? "No matching repositories" : "No repositories found"}
                          </p>
                          {!githubToken && (
                            <p className="text-[10px] text-[#547B88] mt-1">Add a GitHub token in the Agents tab to see your repos</p>
                          )}
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
                        <>
                          {/* Registered Sources Section */}
                          {registeredItems.length > 0 && (
                            <>
                              <div className="px-4 pt-3 pb-1">
                                <p className="text-[9px] font-mono text-[#00E676] uppercase tracking-[0.15em] font-bold flex items-center gap-1">
                                  <Star size={10} /> Connected Repositories
                                </p>
                              </div>
                              {registeredItems.map(renderRepoItem)}
                            </>
                          )}

                          {/* GitHub Repos Section */}
                          {unregisteredItems.length > 0 && (
                            <>
                              {registeredItems.length > 0 && (
                                <div className="mx-4 my-2 border-t border-white/5" />
                              )}
                              <div className="px-4 pt-2 pb-1">
                                <p className="text-[9px] font-mono text-[#00E5FF] uppercase tracking-[0.15em] font-bold flex items-center gap-1">
                                  <Github size={10} /> Your GitHub Repositories
                                </p>
                              </div>
                              {unregisteredItems.map(renderRepoItem)}
                            </>
                          )}
                        </>
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
              <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
                <GitBranch size={12} /> Branch Vector
              </label>
              <div className="relative" ref={branchDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSource) return;
                    setBranchDropdownOpen(!branchDropdownOpen);
                  }}
                  disabled={isLoading || !selectedSource}
                  className="w-full bg-white/5 border border-white/10 px-5 py-4 text-sm rounded-2xl text-left hover:bg-white/10 transition-all flex items-center justify-between gap-2 disabled:opacity-50"
                >
                  <span className="text-[#E0F7FA] font-mono flex items-center gap-2">
                    <GitBranch size={14} className="text-[#00E676] shrink-0" />
                    {isLoadingBranches ? (
                      <span className="text-[#547B88] flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" /> Loading branches...
                      </span>
                    ) : branch}
                  </span>
                  {selectedSource && (
                    <ChevronDown size={16} className={`text-[#547B88] shrink-0 transition-transform ${branchDropdownOpen ? "rotate-180" : ""}`} />
                  )}
                </button>

                {/* Branch Dropdown Panel */}
                {branchDropdownOpen && selectedSource && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a1419] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-slide-up">
                    {/* Search */}
                    <div className="p-3 border-b border-white/5">
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                        <Search size={14} className="text-[#547B88] shrink-0" />
                        <input
                          type="text"
                          placeholder="Filter branches..."
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-xs text-[#E0F7FA] placeholder-[#1A3540] font-mono"
                        />
                      </div>
                    </div>

                    {/* Branches List */}
                    <div className="max-h-60 overflow-y-auto">
                      {branchesError ? (
                        <div className="p-4 text-center">
                          <AlertCircle size={20} className="text-[#FF2A5F] mx-auto mb-2" />
                          <p className="text-xs text-[#FF2A5F]">{branchesError}</p>
                          <button
                            onClick={() => {
                              const parts = selectedSourceDisplay.split("/");
                              if (parts.length > 1) fetchBranches(parts[0], parts[1]);
                            }}
                            className="mt-2 text-xs text-[#00E5FF] font-bold hover:underline"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (() => {
                        const filteredBranches = branches.filter((b) =>
                          !branchSearch || b.name.toLowerCase().includes(branchSearch.toLowerCase())
                        );
                        return filteredBranches.length === 0 ? (
                          <div className="p-4 text-center">
                            <p className="text-xs text-[#547B88]">
                              {branchSearch ? `No branches matching "${branchSearch}"` : "No branches found"}
                            </p>
                          </div>
                        ) : (
                          filteredBranches.map((b) => {
                            const isSelected = b.name === branch;
                            const isDefault = b.name === branches[0]?.name; // first branch is typically default
                            return (
                              <button
                                key={b.name}
                                type="button"
                                onClick={() => {
                                  setBranch(b.name);
                                  setBranchDropdownOpen(false);
                                  setBranchSearch("");
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-all ${
                                  isSelected ? "bg-[#00E5FF]/10 text-[#00E5FF]" : "text-[#E0F7FA]"
                                }`}
                              >
                                <div className={`w-7 h-7 flex items-center justify-center rounded-lg shrink-0 ${
                                  isSelected ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "bg-[#B388FF]/10 text-[#B388FF]"
                                }`}>
                                  <GitBranch size={12} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-mono truncate">{b.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {isDefault && (
                                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 uppercase">
                                        Default
                                      </span>
                                    )}
                                    {b.protected && (
                                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#FF2A5F]/10 text-[#FF2A5F] border border-[#FF2A5F]/20 uppercase">
                                        Protected
                                      </span>
                                    )}
                                    {b.commit_sha && (
                                      <span className="text-[10px] text-[#547B88] font-mono">{b.commit_sha}</span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && <Check size={14} className="text-[#00E5FF] shrink-0" />}
                              </button>
                            );
                          })
                        );
                      })()}
                    </div>

                    {/* Manual branch input */}
                    <div className="p-3 border-t border-white/5">
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                        <GitBranch size={12} className="text-[#547B88] shrink-0" />
                        <input
                          type="text"
                          placeholder="Or type a branch name..."
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-xs text-[#E0F7FA] placeholder-[#1A3540] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!selectedSource && (
                <p className="text-[10px] text-[#547B88] ml-1">Select a repository first to browse branches</p>
              )}
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

          {/* Deployment Config */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono text-[#547B88] uppercase font-bold tracking-[0.2em] ml-1 flex items-center gap-1.5">
              <Upload size={12} /> Deployment Config
            </label>
            <p className="text-[10px] text-[#547B88] ml-1 leading-relaxed">
              Select platforms to include deployment config files. Jules will generate workflow/config files so you can deploy with one tap.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["vercel", "netlify", "render", "github-pages"] as DeployHost[]).map((host) => {
                const info = DEPLOY_HOSTS[host];
                const isChecked = selectedDeployHosts.has(host);
                return (
                  <button
                    key={host}
                    type="button"
                    onClick={() => toggleDeployHost(host)}
                    disabled={isLoading}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left disabled:opacity-50 ${
                      isChecked
                        ? `border-[${info.color}]/30 bg-[${info.color}]/10`
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                    style={isChecked ? {
                      borderColor: `${info.color}50`,
                      backgroundColor: `${info.color}10`,
                    } : undefined}
                  >
                    {/* Custom checkbox */}
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? "border-transparent"
                          : "border-white/20 bg-transparent"
                      }`}
                      style={isChecked ? { backgroundColor: info.color } : undefined}
                    >
                      {isChecked && <Check size={12} className="text-[#071115]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {info.icon === "globe" ? (
                          <Globe size={11} style={{ color: isChecked ? info.color : "#547B88" }} className="shrink-0" />
                        ) : (
                          <Rocket size={11} style={{ color: isChecked ? info.color : "#547B88" }} className="shrink-0" />
                        )}
                        <span
                          className="text-[11px] font-bold truncate"
                          style={{ color: isChecked ? info.color : "#547B88" }}
                        >
                          {info.name}
                        </span>
                      </div>
                      <p className="text-[9px] text-[#547B88] font-mono truncate mt-0.5">
                        {info.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedDeployHosts.size > 0 && (
              <div className="p-3 bg-[#00E676]/5 border border-[#00E676]/15 rounded-xl">
                <p className="text-[10px] text-[#00E676] font-mono leading-relaxed">
                  Jules will include deployment config files for: {Array.from(selectedDeployHosts).map(h => DEPLOY_HOSTS[h].name).join(", ")}
                </p>
              </div>
            )}
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
