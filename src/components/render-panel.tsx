"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listServices,
  listPostgres,
  listKeyValue,
  listDisks,
  listDeploys,
  getService,
  suspendService,
  resumeService,
  restartService,
  triggerDeploy,
  getServiceStatusColor,
  getDeployStatusColor,
  getRegionName,
  getServiceTypeLabel,
  verifyApiKey,
  type RenderService,
  type RenderPostgres,
  type RenderKeyValue,
  type RenderDeploy,
} from "@/lib/render-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Cloud,
  Server,
  Database,
  HardDrive,
  KeyRound,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Rocket,
  ExternalLink,
  Loader2,
  Link2,
  Unplug,
  ArrowUpRight,
  Clock,
  Globe,
  Activity,
} from "lucide-react";

interface RenderPanelProps {
  renderApiKey: string | null;
  onApiKeyChange: (key: string | null) => void;
  supabasePAT?: string | null;
  supabaseProjects?: Array<{ ref: string; name: string; status: string }>;
  julesApiKey?: string | null;
}

type DetailView = "list" | "service" | "postgres" | "keyvalue";

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSeconds < 60) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function RenderPanel({ renderApiKey, onApiKeyChange, supabasePAT, supabaseProjects, julesApiKey }: RenderPanelProps) {
  const [services, setServices] = useState<RenderService[]>([]);
  const [postgres, setPostgres] = useState<RenderPostgres[]>([]);
  const [keyValueInstances, setKeyValueInstances] = useState<RenderKeyValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection flow state
  const [keyInput, setKeyInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Detail view state
  const [detailView, setDetailView] = useState<DetailView>("list");
  const [selectedService, setSelectedService] = useState<RenderService | null>(null);
  const [selectedPostgres, setSelectedPostgres] = useState<RenderPostgres | null>(null);
  const [selectedKeyValue, setSelectedKeyValue] = useState<RenderKeyValue | null>(null);
  const [deploys, setDeploys] = useState<RenderDeploy[]>([]);
  const [isLoadingDeploys, setIsLoadingDeploys] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cross-service state
  const [showCrossServiceMenu, setShowCrossServiceMenu] = useState<string | null>(null);
  const [crossServiceLoading, setCrossServiceLoading] = useState<string | null>(null);
  const [crossServiceResult, setCrossServiceResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchResources = useCallback(async () => {
    if (!renderApiKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const [svc, pg, kv] = await Promise.all([
        listServices(renderApiKey),
        listPostgres(renderApiKey),
        listKeyValue(renderApiKey),
      ]);
      setServices(svc.services || []);
      setPostgres(pg.postgres || []);
      setKeyValueInstances(kv.keyValueInstances || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Render resources");
    } finally {
      setIsLoading(false);
    }
  }, [renderApiKey]);

  useEffect(() => {
    if (renderApiKey) {
      fetchResources();
    }
  }, [renderApiKey, fetchResources]);

  const handleConnect = async () => {
    if (!keyInput.trim()) {
      setConnectError("Please enter your Render API key");
      return;
    }
    setIsConnecting(true);
    setConnectError(null);
    try {
      const valid = await verifyApiKey(keyInput.trim());
      if (!valid) {
        setConnectError("Invalid API key. Please check and try again.");
        return;
      }
      onApiKeyChange(keyInput.trim());
      setKeyInput("");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to verify API key");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    onApiKeyChange(null);
    setServices([]);
    setPostgres([]);
    setKeyValueInstances([]);
    setDetailView("list");
    setSelectedService(null);
  };

  const handleServiceClick = async (service: RenderService) => {
    setSelectedService(service);
    setDetailView("service");
    setIsLoadingDeploys(true);
    try {
      const d = await listDeploys(renderApiKey!, service.id);
      setDeploys(d.deploys || []);
    } catch {
      setDeploys([]);
    } finally {
      setIsLoadingDeploys(false);
    }
  };

  const handleAction = async (action: string, serviceId: string) => {
    if (!renderApiKey) return;
    setActionLoading(serviceId + action);
    try {
      switch (action) {
        case "suspend":
          await suspendService(renderApiKey, serviceId);
          break;
        case "resume":
          await resumeService(renderApiKey, serviceId);
          break;
        case "restart":
          await restartService(renderApiKey, serviceId);
          break;
        case "deploy":
          await triggerDeploy(renderApiKey, serviceId);
          break;
      }
      // Refresh service details
      const updated = await getService(renderApiKey, serviceId);
      setSelectedService(updated);
      // Also refresh deploy list
      if (action === "deploy" || action === "restart") {
        const d = await listDeploys(renderApiKey, serviceId);
        setDeploys(d.deploys || []);
      }
      fetchResources();
    } catch (err) {
      // Silently handle — could add a toast here
    } finally {
      setActionLoading(null);
    }
  };

  // Cross-service: Sync Supabase API keys to Render env vars
  const handleSyncSupabaseKeys = async (serviceId: string, projectRef: string) => {
    if (!supabasePAT || !renderApiKey) return;
    const key = `${serviceId}-sync-keys`;
    setCrossServiceLoading(key);
    setCrossServiceResult(null);
    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: {
            type: "sync-env-vars",
            source: "supabase",
            target: "render",
            action: "setEnvVars",
            params: { supabaseProjectRef: projectRef, renderServiceId: serviceId },
          },
          credentials: { supabasePAT, renderApiKey },
        }),
      });
      const data = await res.json();
      if (data.error) {
        setCrossServiceResult({ success: false, message: data.error });
      } else {
        const result = data.result as { syncedVars?: number };
        setCrossServiceResult({ success: true, message: `Synced ${result.syncedVars || 0} env vars from Supabase` });
      }
    } catch (err) {
      setCrossServiceResult({ success: false, message: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setCrossServiceLoading(null);
      setShowCrossServiceMenu(null);
    }
  };

  // ===== Not connected state =====
  if (!renderApiKey) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-4 w-4 text-[#ff6b35]" />
          <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Render</h3>
        </div>
        <div className="rounded-xl bg-[rgba(255,107,53,0.02)] border border-[rgba(255,107,53,0.08)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-5 w-5 text-[#ff6b35]" />
            <span className="text-sm font-medium text-white">Connect to Render</span>
          </div>
          <p className="text-[11px] text-[#64748b] leading-relaxed mb-3">
            Enter your Render API key to manage services, databases, deploys, and more from your dashboard.
          </p>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="rnd_xxxxxxxxxxxxxxxxxxxx"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setConnectError(null); }}
              disabled={isConnecting}
              className="bg-[#0d1117] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[#3a3a4a] focus:border-[rgba(255,107,53,0.3)] h-9 rounded-lg text-xs font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
            <Button
              onClick={handleConnect}
              disabled={isConnecting || !keyInput.trim()}
              className="w-full bg-gradient-to-r from-[#ff6b35] to-[#e55a2b] hover:brightness-110 text-white h-9 rounded-lg font-medium text-xs transition-all duration-200 disabled:opacity-50 gap-1.5"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Link2 className="h-3.5 w-3.5" />
                  Connect Render
                </>
              )}
            </Button>
          </div>
          {connectError && (
            <div className="mt-2 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-2.5 py-1.5 text-[10px] text-[#f87171]">
              {connectError}
            </div>
          )}
          <a
            href="https://dashboard.render.com/u/settings#api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[9px] text-[#ff6b35] hover:text-[#e55a2b] transition-colors mt-3"
          >
            Generate an API key on Render
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    );
  }

  // ===== Detail Views =====
  if (detailView === "service" && selectedService) {
    const statusColor = getServiceStatusColor(selectedService.serviceDetails && "status" in selectedService.serviceDetails ? (selectedService.serviceDetails.status as string) : "unknown");
    const svcStatus = selectedService.serviceDetails && "status" in selectedService.serviceDetails ? (selectedService.serviceDetails.status as string) : "unknown";
    return (
      <div className="p-4">
        {/* Back button */}
        <button
          onClick={() => { setDetailView("list"); setSelectedService(null); }}
          className="flex items-center gap-1.5 text-[11px] text-[#64748b] hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to services
        </button>

        {/* Service header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${statusColor.bg} border`}>
            <Server className={`h-5 w-5 ${statusColor.text}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">{selectedService.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded border ${statusColor.bg} ${statusColor.text}`}>
                {svcStatus}
              </span>
              <span className="text-[9px] text-[#64748b]">{getServiceTypeLabel(selectedService.type)}</span>
              <span className="text-[9px] text-[#4a4a5a]">{getRegionName(selectedService.region)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(svcStatus === "live" || svcStatus === "deploying") && (
            <Button
              onClick={() => handleAction("suspend", selectedService.id)}
              disabled={actionLoading !== null}
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-md bg-[rgba(245,158,11,0.04)] border-[rgba(245,158,11,0.12)] text-[#f59e0b] hover:bg-[rgba(245,158,11,0.08)] gap-1"
            >
              {actionLoading === selectedService.id + "suspend" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
              Suspend
            </Button>
          )}
          {svcStatus === "suspended" && (
            <Button
              onClick={() => handleAction("resume", selectedService.id)}
              disabled={actionLoading !== null}
              variant="outline"
              className="h-7 px-2.5 text-[10px] rounded-md bg-[rgba(16,185,129,0.04)] border-[rgba(16,185,129,0.12)] text-[#10b981] hover:bg-[rgba(16,185,129,0.08)] gap-1"
            >
              {actionLoading === selectedService.id + "resume" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Resume
            </Button>
          )}
          {svcStatus === "live" && (
            <>
              <Button
                onClick={() => handleAction("restart", selectedService.id)}
                disabled={actionLoading !== null}
                variant="outline"
                className="h-7 px-2.5 text-[10px] rounded-md bg-[rgba(129,140,248,0.04)] border-[rgba(129,140,248,0.12)] text-[#818cf8] hover:bg-[rgba(129,140,248,0.08)] gap-1"
              >
                {actionLoading === selectedService.id + "restart" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Restart
              </Button>
              <Button
                onClick={() => handleAction("deploy", selectedService.id)}
                disabled={actionLoading !== null}
                className="h-7 px-2.5 text-[10px] rounded-md bg-gradient-to-r from-[#ff6b35] to-[#e55a2b] hover:brightness-110 text-white gap-1"
              >
                {actionLoading === selectedService.id + "deploy" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
                Deploy
              </Button>
            </>
          )}
        </div>

        {/* Cross-service actions */}
        {supabasePAT && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="h-3 w-3 text-[#10b981]" />
              <span className="text-[9px] font-semibold text-[#64748b] uppercase tracking-wider">Cross-Service</span>
            </div>
            {crossServiceResult && (
              <div className={`mb-2 rounded-md px-2.5 py-1.5 text-[10px] ${crossServiceResult.success ? "bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.15)] text-[#10b981]" : "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] text-[#f87171]"}`}>
                {crossServiceResult.message}
              </div>
            )}
            <div className="relative">
              <Button
                onClick={() => setShowCrossServiceMenu(showCrossServiceMenu === selectedService.id ? null : selectedService.id)}
                variant="outline"
                className="h-7 px-2.5 text-[10px] rounded-md bg-[rgba(16,185,129,0.04)] border-[rgba(16,185,129,0.12)] text-[#10b981] hover:bg-[rgba(16,185,129,0.08)] gap-1 w-full"
              >
                {crossServiceLoading === selectedService.id + "-sync-keys" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                Sync from Supabase
              </Button>
              {showCrossServiceMenu === selectedService.id && supabaseProjects && supabaseProjects.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg bg-[#1a1a2e] border border-[rgba(255,255,255,0.08)] shadow-xl overflow-hidden">
                  <div className="p-1.5">
                    <span className="text-[9px] text-[#64748b] px-2 block mb-1">Select Supabase project to sync keys from:</span>
                    {supabaseProjects.map((proj) => (
                      <button
                        key={proj.ref}
                        onClick={() => handleSyncSupabaseKeys(selectedService.id, proj.ref)}
                        disabled={crossServiceLoading !== null}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-[11px] text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center gap-2"
                      >
                        <Database className="h-3 w-3 text-[#10b981] shrink-0" />
                        <span className="truncate">{proj.name}</span>
                        <span className="text-[9px] text-[#4a4a5a] ml-auto">{proj.ref}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service info */}
        <div className="space-y-2 mb-4">
          {selectedService.repoUrl && (
            <div className="glass-card rounded-lg p-2.5">
              <span className="text-[9px] text-[#64748b] uppercase tracking-wider">Repository</span>
              <a href={selectedService.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-[#818cf8] hover:text-[#6366f1] mt-0.5 truncate">
                {selectedService.repoUrl.replace("https://github.com/", "")}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            </div>
          )}
          {selectedService.branch && (
            <div className="glass-card rounded-lg p-2.5">
              <span className="text-[9px] text-[#64748b] uppercase tracking-wider">Branch</span>
              <p className="text-[11px] text-white font-mono mt-0.5">{selectedService.branch}</p>
            </div>
          )}
          {selectedService.serviceDetails && "url" in selectedService.serviceDetails && selectedService.serviceDetails.url && (
            <div className="glass-card rounded-lg p-2.5">
              <span className="text-[9px] text-[#64748b] uppercase tracking-wider">Service URL</span>
              <a href={selectedService.serviceDetails.url as string} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-[#10b981] hover:text-[#059669] mt-0.5 truncate">
                {selectedService.serviceDetails.url as string}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Recent Deploys */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider flex items-center gap-1.5">
              <Rocket className="h-3 w-3" />
              Recent Deploys
            </h4>
          </div>
          {isLoadingDeploys ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 bg-[rgba(255,255,255,0.03)] rounded-lg" />
              ))}
            </div>
          ) : deploys.length === 0 ? (
            <div className="text-center py-4">
              <Rocket className="h-6 w-6 text-[#2a2a3a] mx-auto mb-1" />
              <p className="text-[10px] text-[#4a4a5a]">No deploys found</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {deploys.slice(0, 10).map((deploy) => {
                const deployColor = getDeployStatusColor(deploy.status);
                return (
                  <div key={deploy.id} className="glass-card rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${deployColor.dot}`} />
                        <span className="text-[11px] text-white truncate">
                          {deploy.commitMessage || deploy.commitId?.slice(0, 7) || deploy.id.slice(0, 8)}
                        </span>
                      </div>
                      <span className={`text-[9px] font-medium ${deployColor.text} shrink-0`}>
                        {deploy.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-2.5 w-2.5 text-[#4a4a5a]" />
                      <span className="text-[9px] text-[#4a4a5a]">{formatTimeAgo(deploy.createdAt)}</span>
                      {deploy.deployDurationSecs && (
                        <span className="text-[9px] text-[#4a4a5a]">{deploy.deployDurationSecs}s</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (detailView === "postgres" && selectedPostgres) {
    return (
      <div className="p-4">
        <button
          onClick={() => { setDetailView("list"); setSelectedPostgres(null); }}
          className="flex items-center gap-1.5 text-[11px] text-[#64748b] hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to databases
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-[rgba(129,140,248,0.1)] border border-[rgba(129,140,248,0.2)] flex items-center justify-center">
            <Database className="h-5 w-5 text-[#818cf8]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">{selectedPostgres.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-[#818cf8]">{selectedPostgres.plan}</span>
              <span className="text-[9px] text-[#4a4a5a]">{getRegionName(selectedPostgres.region)}</span>
              {selectedPostgres.version && (
                <span className="text-[9px] text-[#4a4a5a]">v{selectedPostgres.version}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="glass-card rounded-lg p-2.5">
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider">Status</span>
            <p className="text-[11px] text-white mt-0.5">{selectedPostgres.status}</p>
          </div>
          <div className="glass-card rounded-lg p-2.5">
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider">Database</span>
            <p className="text-[11px] text-white font-mono mt-0.5">{selectedPostgres.dbName || "N/A"}</p>
          </div>
          <div className="glass-card rounded-lg p-2.5">
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider">User</span>
            <p className="text-[11px] text-white font-mono mt-0.5">{selectedPostgres.dbUser || "N/A"}</p>
          </div>
          {selectedPostgres.highAvailability && (
            <div className="glass-card rounded-lg p-2.5">
              <span className="text-[9px] text-[#64748b] uppercase tracking-wider">High Availability</span>
              <p className="text-[11px] text-[#10b981] mt-0.5">Enabled</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (detailView === "keyvalue" && selectedKeyValue) {
    return (
      <div className="p-4">
        <button
          onClick={() => { setDetailView("list"); setSelectedKeyValue(null); }}
          className="flex items-center gap-1.5 text-[11px] text-[#64748b] hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to datastores
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center">
            <KeyRound className="h-5 w-5 text-[#f59e0b]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">{selectedKeyValue.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-[#f59e0b]">{selectedKeyValue.plan}</span>
              <span className="text-[9px] text-[#4a4a5a]">{getRegionName(selectedKeyValue.region)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="glass-card rounded-lg p-2.5">
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider">Status</span>
            <p className="text-[11px] text-white mt-0.5">{selectedKeyValue.status}</p>
          </div>
          <div className="glass-card rounded-lg p-2.5">
            <span className="text-[9px] text-[#64748b] uppercase tracking-wider">Allow Concurrent</span>
            <p className="text-[11px] text-white mt-0.5">{selectedKeyValue.allowConcurrent ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main List View =====
  const liveServices = services.filter((s) => s.serviceDetails && "status" in s.serviceDetails && (s.serviceDetails.status as string) === "live").length;
  const suspendedServices = services.filter((s) => s.serviceDetails && "status" in s.serviceDetails && (s.serviceDetails.status as string) === "suspended").length;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-[#ff6b35]" />
          <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Render</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchResources}
            className="h-6 w-6 rounded-md flex items-center justify-center text-[#4a4a5a] hover:text-[#94a3b8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={handleDisconnect}
            className="h-6 w-6 rounded-md flex items-center justify-center text-[#4a4a5a] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
            title="Disconnect Render"
          >
            <Unplug className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Connection status card */}
      <div className="glass-card rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-md bg-[rgba(255,107,53,0.1)] flex items-center justify-center shrink-0">
            <Cloud className="h-3 w-3 text-[#ff6b35]" />
          </div>
          <span className="text-[11px] font-medium text-white">Render API</span>
          <div className="ml-auto flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            <span className="text-[9px] text-[#10b981] font-medium">Connected</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {liveServices > 0 && (
            <span className="text-[9px] text-[#10b981]">{liveServices} live</span>
          )}
          {suspendedServices > 0 && (
            <span className="text-[9px] text-[#f59e0b]">{suspendedServices} suspended</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-2.5 py-1.5 text-[10px] text-[#f87171]">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 bg-[rgba(255,255,255,0.03)] rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Services */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-[#64748b]" />
                <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Services</span>
              </div>
              <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(255,107,53,0.08)] text-[#ff6b35] border-[rgba(255,107,53,0.12)]">
                {services.length}
              </Badge>
            </div>

            {services.length === 0 ? (
              <div className="text-center py-4">
                <Server className="h-6 w-6 text-[#2a2a3a] mx-auto mb-1" />
                <p className="text-[10px] text-[#4a4a5a]">No services found</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {services.map((service) => {
                  const svcStatus = service.serviceDetails && "status" in service.serviceDetails ? (service.serviceDetails.status as string) : "unknown";
                  const statusColor = getServiceStatusColor(svcStatus);
                  return (
                    <button
                      key={service.id}
                      onClick={() => handleServiceClick(service)}
                      className="w-full text-left glass-card-hover rounded-lg px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-md ${statusColor.bg} border flex items-center justify-center shrink-0`}>
                          <Server className={`h-4 w-4 ${statusColor.text}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate">{service.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-medium ${statusColor.text}`}>{svcStatus}</span>
                            <span className="text-[9px] text-[#4a4a5a]">{getServiceTypeLabel(service.type)}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-[#4a4a5a] shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Postgres */}
          {postgres.length > 0 && (
            <div className="mb-4">
              <Separator className="bg-[rgba(255,255,255,0.04)] mb-3" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-[#818cf8]" />
                  <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Postgres</span>
                </div>
                <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(129,140,248,0.08)] text-[#818cf8] border-[rgba(129,140,248,0.12)]">
                  {postgres.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {postgres.map((pg) => (
                  <button
                    key={pg.id}
                    onClick={() => { setSelectedPostgres(pg); setDetailView("postgres"); }}
                    className="w-full text-left glass-card-hover rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-[rgba(129,140,248,0.1)] border border-[rgba(129,140,248,0.2)] flex items-center justify-center shrink-0">
                        <Database className="h-4 w-4 text-[#818cf8]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{pg.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-[#818cf8]">{pg.plan}</span>
                          <span className="text-[9px] text-[#4a4a5a]">{pg.status}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[#4a4a5a] shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Key-Value */}
          {keyValueInstances.length > 0 && (
            <div className="mb-4">
              <Separator className="bg-[rgba(255,255,255,0.04)] mb-3" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#f59e0b]" />
                  <span className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">Key-Value</span>
                </div>
                <Badge className="h-4 px-1.5 text-[9px] bg-[rgba(245,158,11,0.08)] text-[#f59e0b] border-[rgba(245,158,11,0.12)]">
                  {keyValueInstances.length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {keyValueInstances.map((kv) => (
                  <button
                    key={kv.id}
                    onClick={() => { setSelectedKeyValue(kv); setDetailView("keyvalue"); }}
                    className="w-full text-left glass-card-hover rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center shrink-0">
                        <KeyRound className="h-4 w-4 text-[#f59e0b]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{kv.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-[#f59e0b]">{kv.plan}</span>
                          <span className="text-[9px] text-[#4a4a5a]">{kv.status}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[#4a4a5a] shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {services.length === 0 && postgres.length === 0 && keyValueInstances.length === 0 && (
            <div className="text-center py-8">
              <Cloud className="h-10 w-10 text-[#2a2a3a] mx-auto mb-3" />
              <p className="text-xs text-[#4a4a5a] mb-1">No Render resources found</p>
              <p className="text-[10px] text-[#3a3a4a]">
                Create services on{" "}
                <a href="https://dashboard.render.com" target="_blank" rel="noopener noreferrer" className="text-[#ff6b35] hover:underline">
                  dashboard.render.com
                </a>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
