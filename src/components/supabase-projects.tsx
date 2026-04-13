"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listProjects,
  listOrganizations,
  createProject,
  deleteProject,
  pauseProject,
  restoreProject,
  getProjectApiKeys,
  getProjectHealth,
  listProjectBranches,
  verifyAccessToken,
  getRegionName,
  getProjectStatusColor,
  type SupabaseProject,
  type SupabaseOrganization,
  type SupabaseApiKey,
  type SupabaseServiceHealth,
  type SupabaseBranch,
  type CreateProjectPayload,
  type AvailableRegion,
} from "@/lib/supabase-management";
import {
  getSupabaseAccessToken,
  saveSupabaseAccessToken,
  clearSupabaseAccessToken,
} from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  Plus,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  Key,
  Heart,
  GitBranch,
  Globe,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Server,
  Shield,
  Eye,
  EyeOff,
  X,
  ArrowLeft,
  Clock,
  MapPin,
  Link2,
  Cloud,
  Rocket,
} from "lucide-react";

interface SupabaseProjectsProps {
  onBack?: () => void;
  onPATChange?: (pat: string | null) => void;
  renderApiKey?: string | null;
  renderServices?: Array<{ id: string; name: string; type: string }>;
}

type DetailView = "list" | "detail" | "create";

export function SupabaseProjects({ onBack, onPATChange, renderApiKey, renderServices }: SupabaseProjectsProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  const [organizations, setOrganizations] = useState<SupabaseOrganization[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [view, setView] = useState<DetailView>("list");
  const [selectedProject, setSelectedProject] = useState<SupabaseProject | null>(null);

  // Detail panel states
  const [projectApiKeys, setProjectApiKeys] = useState<SupabaseApiKey[]>([]);
  const [projectHealth, setProjectHealth] = useState<SupabaseServiceHealth[]>([]);
  const [projectBranches, setProjectBranches] = useState<SupabaseBranch[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create project form
  const [createForm, setCreateForm] = useState({
    name: "",
    db_pass: "",
    organization_slug: "",
    region: "us-east-1",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const existing = getSupabaseAccessToken();
    if (existing) {
      setAccessToken(existing);
      setTokenInput("");
      setIsConnected(true);
      fetchProjectsAndOrgs(existing);
    }
  }, []);

  const fetchProjectsAndOrgs = useCallback(async (token: string) => {
    setIsLoadingProjects(true);
    try {
      const [projs, orgs] = await Promise.all([
        listProjects(token),
        listOrganizations(token),
      ]);
      setProjects(projs);
      setOrganizations(orgs);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setConnectError("Please enter your Supabase access token");
      return;
    }
    setIsConnecting(true);
    setConnectError(null);

    try {
      const valid = await verifyAccessToken(tokenInput.trim());
      if (!valid) {
        setConnectError("Invalid access token. Please check and try again.");
        return;
      }
      saveSupabaseAccessToken(tokenInput.trim());
      setAccessToken(tokenInput.trim());
      setIsConnected(true);
      setTokenInput("");
      onPATChange?.(tokenInput.trim());
      await fetchProjectsAndOrgs(tokenInput.trim());
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to verify token");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearSupabaseAccessToken();
    setAccessToken(null);
    setIsConnected(false);
    setProjects([]);
    setOrganizations([]);
    setSelectedProject(null);
    setView("list");
    onPATChange?.(null);
  };

  const loadProjectDetail = async (project: SupabaseProject) => {
    if (!accessToken) return;
    setSelectedProject(project);
    setView("detail");
    setIsLoadingDetail(true);
    setActionError(null);

    try {
      const [keys, health, branches] = await Promise.allSettled([
        getProjectApiKeys(accessToken, project.ref),
        getProjectHealth(accessToken, project.ref),
        listProjectBranches(accessToken, project.ref),
      ]);

      if (keys.status === "fulfilled") setProjectApiKeys(keys.value);
      if (health.status === "fulfilled") setProjectHealth(health.value);
      if (branches.status === "fulfilled") setProjectBranches(branches.value);
    } catch (err) {
      console.error("Failed to load project detail:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePause = async (ref: string) => {
    if (!accessToken) return;
    setActionLoading(ref + "-pause");
    setActionError(null);
    try {
      await pauseProject(accessToken, ref);
      await fetchProjectsAndOrgs(accessToken);
      if (selectedProject?.ref === ref) {
        setSelectedProject((p) => p ? { ...p, status: "PAUSED" } : p);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to pause project");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (ref: string) => {
    if (!accessToken) return;
    setActionLoading(ref + "-restore");
    setActionError(null);
    try {
      await restoreProject(accessToken, ref);
      await fetchProjectsAndOrgs(accessToken);
      if (selectedProject?.ref === ref) {
        setSelectedProject((p) => p ? { ...p, status: "ACTIVE_HEALTHY" } : p);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to restore project");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (ref: string) => {
    if (!accessToken) return;
    setActionLoading(ref + "-delete");
    setActionError(null);
    try {
      await deleteProject(accessToken, ref);
      setDeleteConfirm(null);
      if (selectedProject?.ref === ref) {
        setView("list");
        setSelectedProject(null);
      }
      await fetchProjectsAndOrgs(accessToken);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!accessToken) return;
    if (!createForm.name.trim() || !createForm.db_pass.trim() || !createForm.organization_slug) {
      setCreateError("Name, database password, and organization are required");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const payload: CreateProjectPayload = {
        name: createForm.name.trim(),
        db_pass: createForm.db_pass,
        organization_slug: createForm.organization_slug,
        region: createForm.region,
      };
      await createProject(accessToken, payload);
      setView("list");
      setCreateForm({ name: "", db_pass: "", organization_slug: "", region: "us-east-1" });
      await fetchProjectsAndOrgs(accessToken);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ========== NOT CONNECTED ==========
  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[var(--wa-sidebar-bg)]">
        <div className="p-4 border-b border-[var(--wa-border)]">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-[#10b981]" />
            <h2 className="text-sm font-semibold text-[var(--wa-text)]">Supabase Management</h2>
          </div>
          <p className="text-[11px] text-[var(--wa-text-muted)]">Manage your projects and organizations</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="rounded-xl bg-[rgba(16,185,129,0.02)] border border-[rgba(16,185,129,0.08)] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-md">
                  <Database className="h-5 w-5 text-[var(--wa-text)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--wa-text)]">Connect Supabase</h3>
                  <p className="text-[10px] text-[var(--wa-text-muted)]">Management API Access</p>
                </div>
              </div>

              <p className="text-[11px] text-[var(--wa-text-muted)] leading-relaxed mb-4">
                Enter your Personal Access Token to manage projects, organizations, API keys, and more from the Supabase Management API.
              </p>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="sbp_xxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => { setTokenInput(e.target.value); setConnectError(null); }}
                  disabled={isConnecting}
                  className="input-refined border-[var(--wa-input-border)] text-[var(--wa-text)] placeholder:text-[var(--wa-text-muted)] focus:border-[rgba(16,185,129,0.3)] h-9 rounded-lg text-xs font-mono"
                />
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !tokenInput.trim()}
                  className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 text-[var(--wa-text)] h-9 rounded-lg font-medium text-sm transition-all duration-200 gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" />
                      Connect
                    </>
                  )}
                </Button>
              </div>

              {connectError && (
                <div className="mt-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-xs text-[#f87171]">
                  {connectError}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[var(--wa-border)]">
                <a
                  href="https://supabase.com/dashboard/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-[#10b981] hover:text-[#059669] transition-colors"
                >
                  Generate a token on Supabase
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== PROJECT DETAIL ==========
  if (view === "detail" && selectedProject) {
    const statusColor = getProjectStatusColor(selectedProject.status);

    return (
      <div className="flex-1 flex flex-col h-full bg-[var(--wa-sidebar-bg)]">
        <div className="p-4 border-b border-[var(--wa-border)]">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { setView("list"); setSelectedProject(null); }}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shrink-0">
              <Database className="h-4 w-4 text-[var(--wa-text)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-[var(--wa-text)] truncate">{selectedProject.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-[10px] font-mono text-[var(--wa-text-muted)]">{selectedProject.ref}</code>
                <span className={`inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded border ${statusColor.bg} ${statusColor.text}`}>
                  {selectedProject.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {(selectedProject.status === "ACTIVE_HEALTHY" || selectedProject.status === "ACTIVE_UNHEALTHY") && (
              <Button
                onClick={() => handlePause(selectedProject.ref)}
                disabled={actionLoading === selectedProject.ref + "-pause"}
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[10px] bg-[rgba(245,158,11,0.04)] border-[rgba(245,158,11,0.12)] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.1)] gap-1.5"
              >
                {actionLoading === selectedProject.ref + "-pause" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                Pause
              </Button>
            )}
            {selectedProject.status === "PAUSED" && (
              <Button
                onClick={() => handleRestore(selectedProject.ref)}
                disabled={actionLoading === selectedProject.ref + "-restore"}
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[10px] bg-[rgba(16,185,129,0.04)] border-[rgba(16,185,129,0.12)] text-[#10b981] hover:bg-[rgba(16,185,129,0.1)] gap-1.5"
              >
                {actionLoading === selectedProject.ref + "-restore" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Restore
              </Button>
            )}
            <a
              href={`https://supabase.com/dashboard/project/${selectedProject.ref}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[10px] bg-[rgba(0,168,132,0.04)] border border-[rgba(0,168,132,0.12)] text-[#00a884] hover:bg-[rgba(0,168,132,0.1)] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Dashboard
            </a>
          </div>

          {actionError && (
            <div className="mt-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-xs text-[#f87171]">
              {actionError}
            </div>
          )}

          {/* Cross-service: Deploy to Render */}
          {renderApiKey && renderServices && renderServices.length > 0 && (
            <div className="mt-2 rounded-lg bg-[rgba(255,107,53,0.03)] border border-[rgba(255,107,53,0.1)] p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Cloud className="h-3 w-3 text-[#ff6b35]" />
                <span className="text-[9px] font-semibold text-[#ff6b35] uppercase tracking-wider">Deploy to Render</span>
              </div>
              <select
                id="render-deploy-select"
                className="w-full h-7 rounded-md input-refined border border-[var(--wa-input-border)] text-[var(--wa-text)] text-[10px] px-2 mb-1.5 focus:border-[rgba(255,107,53,0.3)] focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>Select a Render service to deploy</option>
                {renderServices.map((svc) => (
                  <option key={svc.id} value={svc.id}>{svc.name} ({svc.type})</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  const select = document.getElementById("render-deploy-select") as HTMLSelectElement;
                  const serviceId = select?.value;
                  if (!serviceId || !renderApiKey) return;
                  try {
                    await fetch("/api/agent/execute", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        command: { type: "trigger-deploy", source: "supabase", target: "render", action: "triggerDeploy", params: { renderServiceId: serviceId } },
                        credentials: { renderApiKey },
                      }),
                    });
                  } catch { /* silently fail */ }
                }}
                className="w-full h-7 rounded-md bg-gradient-to-r from-[#ff6b35] to-[#e55a2b] hover:brightness-110 text-[var(--wa-text)] text-[10px] font-medium flex items-center justify-center gap-1 transition-all"
              >
                <Rocket className="h-3 w-3" />
                Trigger Deploy
              </button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Project Info */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg glass-card-refined">
                <MapPin className="h-3.5 w-3.5 text-[#10b981] shrink-0" />
                <div>
                  <p className="text-[10px] text-[var(--wa-text-muted)]">Region</p>
                  <p className="text-[11px] text-[var(--wa-text)] font-medium">{getRegionName(selectedProject.region)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg glass-card-refined">
                <Clock className="h-3.5 w-3.5 text-[#00a884] shrink-0" />
                <div>
                  <p className="text-[10px] text-[var(--wa-text-muted)]">Created</p>
                  <p className="text-[11px] text-[var(--wa-text)] font-medium">{new Date(selectedProject.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedProject.database && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg glass-card-refined">
                  <Server className="h-3.5 w-3.5 text-[#f59e0b] shrink-0" />
                  <div>
                    <p className="text-[10px] text-[var(--wa-text-muted)]">Postgres</p>
                    <p className="text-[11px] text-[var(--wa-text)] font-medium">{selectedProject.database.version}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg glass-card-refined">
                <Globe className="h-3.5 w-3.5 text-[#00a884] shrink-0" />
                <div>
                  <p className="text-[10px] text-[var(--wa-text-muted)]">Host</p>
                  <p className="text-[11px] text-[var(--wa-text)] font-mono truncate">{selectedProject.database?.host || "—"}</p>
                </div>
              </div>
            </div>

            {/* Health Status */}
            <DetailSection
              icon={<Heart className="h-3.5 w-3.5" />}
              title="Service Health"
              count={projectHealth.length}
              isLoading={isLoadingDetail}
            >
              {projectHealth.length > 0 ? (
                <div className="space-y-1.5">
                  {projectHealth.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg glass-card-refined"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${service.healthy ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
                        <span className="text-xs text-[var(--wa-text)]">{service.name}</span>
                      </div>
                      <span className={`text-[9px] font-medium ${service.healthy ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                        {service.healthy ? "Healthy" : service.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--wa-text-muted)] px-3">Health data not available</p>
              )}
            </DetailSection>

            {/* API Keys */}
            <DetailSection
              icon={<Key className="h-3.5 w-3.5" />}
              title="API Keys"
              count={projectApiKeys.length}
              isLoading={isLoadingDetail}
            >
              {projectApiKeys.length > 0 ? (
                <div className="space-y-1.5">
                  {projectApiKeys.map((key) => {
                    const isVisible = visibleKeys[key.id] || false;
                    return (
                      <div
                        key={key.id}
                        className="px-3 py-2 rounded-lg glass-card-refined"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--wa-text)]">{key.name}</span>
                            <Badge className={`h-4 px-1.5 text-[8px] ${
                              key.type === "secret"
                                ? "bg-[rgba(239,68,68,0.08)] text-[#ef4444] border-[rgba(239,68,68,0.12)]"
                                : "bg-[rgba(0,168,132,0.08)] text-[#00a884] border-[rgba(0,168,132,0.12)]"
                            }`}>
                              {key.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setVisibleKeys((prev) => ({ ...prev, [key.id]: !prev[key.id] }))}
                              className="h-5 w-5 rounded flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
                            >
                              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(key.api_key, key.id)}
                              className="h-5 w-5 rounded flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
                            >
                              {copiedKey === key.id ? <Check className="h-3 w-3 text-[#10b981]" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                        <code className="text-[10px] font-mono text-[var(--wa-text-muted)] break-all">
                          {isVisible ? key.api_key : `${key.prefix}${"•".repeat(20)}`}
                        </code>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--wa-text-muted)] px-3">API keys not available</p>
              )}
            </DetailSection>

            {/* Branches */}
            <DetailSection
              icon={<GitBranch className="h-3.5 w-3.5" />}
              title="Branches"
              count={projectBranches.length}
              isLoading={isLoadingDetail}
            >
              {projectBranches.length > 0 ? (
                <div className="space-y-1.5">
                  {projectBranches.map((branch) => (
                    <div
                      key={branch.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg glass-card-refined"
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-3 w-3 text-[#00a884]" />
                        <span className="text-xs text-[var(--wa-text)]">{branch.name}</span>
                        {branch.is_default && (
                          <Badge className="h-3.5 px-1 text-[8px] bg-[rgba(0,168,132,0.08)] text-[#00a884] border-[rgba(0,168,132,0.12)]">
                            default
                          </Badge>
                        )}
                      </div>
                      <span className="text-[9px] text-[var(--wa-text-muted)]">{branch.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--wa-text-muted)] px-3">No branches available</p>
              )}
            </DetailSection>

            {/* Danger Zone */}
            <div className="rounded-xl bg-[rgba(239,68,68,0.02)] border border-[rgba(239,68,68,0.08)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
                <h4 className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider">Danger Zone</h4>
              </div>
              <p className="text-[11px] text-[var(--wa-text-muted)] leading-relaxed mb-3">
                Deleting this project is irreversible. All data, including database, storage, and auth, will be permanently removed.
              </p>
              {deleteConfirm === selectedProject.ref ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#f87171] font-medium">
                    Type the project ref <code className="bg-[rgba(239,68,68,0.1)] px-1 rounded">{selectedProject.ref}</code> to confirm deletion.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDelete(selectedProject.ref)}
                      disabled={actionLoading === selectedProject.ref + "-delete"}
                      size="sm"
                      className="h-7 px-3 text-[10px] bg-[#ef4444] hover:bg-[#dc2626] text-[var(--wa-text)] gap-1.5"
                    >
                      {actionLoading === selectedProject.ref + "-delete" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Confirm Delete
                    </Button>
                    <Button
                      onClick={() => setDeleteConfirm(null)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[10px] bg-transparent border-[var(--wa-input-border)] text-[var(--wa-text-muted)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setDeleteConfirm(selectedProject.ref)}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[10px] bg-[rgba(239,68,68,0.04)] border-[rgba(239,68,68,0.12)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] gap-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Project
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ========== CREATE PROJECT ==========
  if (view === "create") {
    return (
      <div className="flex-1 flex flex-col h-full bg-[var(--wa-sidebar-bg)]">
        <div className="p-4 border-b border-[var(--wa-border)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setView("list"); setCreateError(null); }}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-[var(--wa-text)]">Create New Project</h2>
              <p className="text-[10px] text-[var(--wa-text-muted)]">Provision a new Supabase project</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              {/* Project Name */}
              <div>
                <label className="text-[10px] font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider mb-1.5 block">
                  Project Name
                </label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="my-awesome-project"
                  className="input-refined border-[var(--wa-input-border)] text-[var(--wa-text)] placeholder:text-[var(--wa-text-muted)] focus:border-[rgba(16,185,129,0.3)] h-9 rounded-lg text-xs"
                />
              </div>

              {/* Database Password */}
              <div>
                <label className="text-[10px] font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider mb-1.5 block">
                  Database Password
                </label>
                <Input
                  type="password"
                  value={createForm.db_pass}
                  onChange={(e) => setCreateForm((f) => ({ ...f, db_pass: e.target.value }))}
                  placeholder="Strong database password"
                  className="input-refined border-[var(--wa-input-border)] text-[var(--wa-text)] placeholder:text-[var(--wa-text-muted)] focus:border-[rgba(16,185,129,0.3)] h-9 rounded-lg text-xs"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="text-[10px] font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider mb-1.5 block">
                  Organization
                </label>
                <select
                  value={createForm.organization_slug}
                  onChange={(e) => setCreateForm((f) => ({ ...f, organization_slug: e.target.value }))}
                  className="w-full h-9 rounded-lg input-refined border border-[var(--wa-input-border)] text-[var(--wa-text)] text-xs px-3 focus:border-[rgba(16,185,129,0.3)] focus:outline-none"
                >
                  <option value="">Select organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.slug}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="text-[10px] font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider mb-1.5 block">
                  Region
                </label>
                <select
                  value={createForm.region}
                  onChange={(e) => setCreateForm((f) => ({ ...f, region: e.target.value }))}
                  className="w-full h-9 rounded-lg input-refined border border-[var(--wa-input-border)] text-[var(--wa-text)] text-xs px-3 focus:border-[rgba(16,185,129,0.3)] focus:outline-none"
                >
                  {[
                    ["us-east-1", "US East (N. Virginia)"],
                    ["us-west-1", "US West (N. California)"],
                    ["us-west-2", "US West (Oregon)"],
                    ["eu-west-1", "EU West (Ireland)"],
                    ["eu-west-2", "EU West (London)"],
                    ["eu-west-3", "EU West (Paris)"],
                    ["eu-central-1", "EU Central (Frankfurt)"],
                    ["eu-central-2", "EU Central (Zurich)"],
                    ["ap-southeast-1", "Asia Pacific (Singapore)"],
                    ["ap-northeast-1", "Asia Pacific (Tokyo)"],
                    ["ap-northeast-2", "Asia Pacific (Seoul)"],
                    ["ap-south-1", "Asia Pacific (Mumbai)"],
                    ["ap-southeast-2", "Asia Pacific (Sydney)"],
                    ["sa-east-1", "South America (São Paulo)"],
                    ["ca-central-1", "Canada Central (Montréal)"],
                    ["af-south-1", "Africa (Cape Town)"],
                    ["me-south-1", "Middle East (Bahrain)"],
                  ].map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {createError && (
              <div className="rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3 py-2 text-xs text-[#f87171]">
                {createError}
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={isCreating || !createForm.name.trim() || !createForm.db_pass.trim() || !createForm.organization_slug}
              className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 text-[var(--wa-text)] h-10 rounded-lg font-medium text-sm transition-all duration-200 gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ========== PROJECT LIST ==========
  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--wa-sidebar-bg)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--wa-border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#10b981]" />
            <h2 className="text-sm font-semibold text-[var(--wa-text)]">Supabase Projects</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setView("create")}
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[9px] bg-[rgba(16,185,129,0.04)] border-[rgba(16,185,129,0.12)] text-[#10b981] hover:bg-[rgba(16,185,129,0.1)] gap-1"
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
            <button
              onClick={() => accessToken && fetchProjectsAndOrgs(accessToken)}
              className="h-6 w-6 rounded-md flex items-center justify-center text-[var(--wa-text-muted)] hover:text-[var(--wa-text)] hover:bg-[var(--wa-hover-bg)] transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingProjects ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(0,168,132,0.08)] text-[#00a884] border-[rgba(0,168,132,0.12)]">
            {projects.length} projects
          </Badge>
          <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(16,185,129,0.08)] text-[#10b981] border-[rgba(16,185,129,0.12)]">
            {organizations.length} orgs
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoadingProjects ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 bg-[var(--wa-skeleton-bg)] rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <Database className="h-10 w-10 text-[var(--wa-text-muted)] mb-3" />
            <p className="text-sm text-[var(--wa-text-muted)] mb-1">No projects found</p>
            <p className="text-[11px] text-[var(--wa-text-muted)] mb-4 text-center">
              Create your first Supabase project to get started
            </p>
            <Button
              onClick={() => setView("create")}
              className="bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 text-[var(--wa-text)] h-8 rounded-lg font-medium text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {projects.map((project) => {
              const statusColor = getProjectStatusColor(project.status);
              return (
                <button
                  key={project.id}
                  onClick={() => loadProjectDetail(project)}
                  className="w-full text-left rounded-lg px-3 py-3 glass-card-refined hover-lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shrink-0">
                        <Database className="h-4 w-4 text-[var(--wa-text)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--wa-text)] truncate">{project.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[9px] font-mono text-[var(--wa-text-muted)]">{project.ref}</code>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
                      <span className={`text-[9px] font-medium ${statusColor.text}`}>
                        {project.status === "ACTIVE_HEALTHY" ? "Healthy" :
                         project.status === "ACTIVE_UNHEALTHY" ? "Unhealthy" :
                         project.status === "PAUSED" ? "Paused" :
                         project.status === "INACTIVE" ? "Inactive" : project.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 ml-10">
                    <span className="flex items-center gap-1 text-[9px] text-[var(--wa-text-muted)]">
                      <MapPin className="h-2.5 w-2.5" />
                      {getRegionName(project.region).split("(")[0].trim()}
                    </span>
                    {project.organization_slug && (
                      <span className="flex items-center gap-1 text-[9px] text-[var(--wa-text-muted)]">
                        <Shield className="h-2.5 w-2.5" />
                        {project.organization_slug}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer with disconnect */}
      <div className="p-3 border-t border-[var(--wa-border)]">
        <button
          onClick={handleDisconnect}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-[var(--wa-text-muted)] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.04)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Disconnect Management API
        </button>
      </div>
    </div>
  );
}

/* Reusable detail section */
function DetailSection({
  icon,
  title,
  count,
  isLoading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  isLoading: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-2 group"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-[var(--wa-text-muted)]" />
          ) : (
            <ChevronRight className="h-3 w-3 text-[var(--wa-text-muted)]" />
          )}
          <span className="text-[var(--wa-text-muted)]">{icon}</span>
          <span className="text-[10px] font-semibold text-[var(--wa-text-muted)] uppercase tracking-wider">{title}</span>
        </div>
        <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(255,255,255,0.04)] text-[var(--wa-text-muted)] border-[var(--wa-input-border)]">
          {isLoading ? "..." : count}
        </Badge>
      </button>
      {expanded && <div>{children}</div>}
    </div>
  );
}
