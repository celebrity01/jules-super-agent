// Render Public API client
// Base: https://api.render.com/v1 · Auth: Bearer token
// All calls go through /api/render/ proxy routes

const renderHeaders = (apiKey: string) => ({
  "X-Render-Api-Key": apiKey,
  "Content-Type": "application/json",
});

// ===== Types =====

export interface RenderService {
  id: string;
  name: string;
  type: string;
  region: string;
  env: string;
  createdAt: string;
  updatedAt: string;
  repoUrl?: string;
  branch?: string;
  ownerId: string;
  slug: string;
  plan?: string;
  suspenders?: string[];
  serviceDetails?: Record<string, unknown>;
  autoDeploy?: boolean;
  serviceName?: string;
}

export interface RenderDeploy {
  id: string;
  status: string;
  commitId?: string;
  commitMessage?: string;
  createdAt: string;
  finishedAt?: string;
  updatedAt: string;
  deployType?: string;
  imageUrl?: string;
  deployDurationSecs?: number;
}

export interface RenderPostgres {
  id: string;
  name: string;
  region: string;
  plan: string;
  createdAt: string;
  status: string;
  connectionString?: string;
  dbName?: string;
  dbUser?: string;
  version?: string;
  ownerId?: string;
  externalId?: string;
  highAvailability?: boolean;
  readReplicas?: number;
}

export interface RenderKeyValue {
  id: string;
  name: string;
  region: string;
  plan: string;
  createdAt: string;
  status: string;
  connectionString?: string;
  ownerId?: string;
  externalId?: string;
  allowConcurrent?: boolean;
}

export interface RenderDisk {
  id: string;
  name: string;
  sizeGB: number;
  mountPath: string;
  serviceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenderOwner {
  id: string;
  name: string;
  email: string;
  type: string;
}

export interface RenderEnvVar {
  key: string;
  value: string;
}

export interface RenderCustomDomain {
  id: string;
  name: string;
  domainType: string;
  verificationStatus: string;
  createdAt?: string;
}

export interface RenderProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  repoUrl?: string;
}

export interface RenderUser {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled?: boolean;
}

export interface RenderServiceEvent {
  id: string;
  type: string;
  createdAt: string;
  description?: string;
  userId?: string;
}

export interface RenderJob {
  id: string;
  startCommand: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  serviceId?: string;
}

export interface RenderLogLine {
  text: string;
  timestamp: string;
  level?: string;
  source?: string;
}

// ===== Service APIs =====

export async function listServices(
  apiKey: string,
  filters?: { name?: string; type?: string; region?: string; limit?: number; cursor?: string }
): Promise<{ services?: RenderService[]; cursor?: string }> {
  const params = new URLSearchParams();
  if (filters?.name) params.set("name", filters.name);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.region) params.set("region", filters.region);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.cursor) params.set("cursor", filters.cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/render/services${qs}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getService(apiKey: string, serviceId: string): Promise<RenderService> {
  const res = await fetch(`/api/render/services/${serviceId}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function createService(apiKey: string, data: Record<string, unknown>): Promise<RenderService> {
  const res = await fetch("/api/render/services", { method: "POST", headers: renderHeaders(apiKey), body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function updateService(apiKey: string, serviceId: string, data: Record<string, unknown>): Promise<RenderService> {
  const res = await fetch(`/api/render/services/${serviceId}`, { method: "PATCH", headers: renderHeaders(apiKey), body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function deleteService(apiKey: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/render/services/${serviceId}`, { method: "DELETE", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

export async function suspendService(apiKey: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/render/services/${serviceId}/suspend`, { method: "POST", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

export async function resumeService(apiKey: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/render/services/${serviceId}/resume`, { method: "POST", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

export async function restartService(apiKey: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/render/services/${serviceId}/restart`, { method: "POST", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

// ===== Deploy APIs =====

export async function listDeploys(apiKey: string, serviceId: string, filters?: { status?: string; limit?: number; cursor?: string }): Promise<{ deploys?: RenderDeploy[]; cursor?: string }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.cursor) params.set("cursor", filters.cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/render/services/${serviceId}/deploys${qs}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function triggerDeploy(apiKey: string, serviceId: string, data?: { commitId?: string; imageUrl?: string; clearCache?: string; deployMode?: string }): Promise<RenderDeploy> {
  const res = await fetch(`/api/render/services/${serviceId}/deploys`, { method: "POST", headers: renderHeaders(apiKey), body: JSON.stringify(data || {}) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getDeploy(apiKey: string, serviceId: string, deployId: string): Promise<RenderDeploy> {
  const res = await fetch(`/api/render/services/${serviceId}/deploys/${deployId}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function cancelDeploy(apiKey: string, serviceId: string, deployId: string): Promise<void> {
  const res = await fetch(`/api/render/services/${serviceId}/deploys/${deployId}/cancel`, { method: "POST", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

export async function rollbackDeploy(apiKey: string, serviceId: string, deployId: string): Promise<RenderDeploy> {
  const res = await fetch(`/api/render/services/${serviceId}/rollback`, { method: "POST", headers: renderHeaders(apiKey), body: JSON.stringify({ deployId }) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

// ===== Env Var APIs =====

export async function listEnvVars(apiKey: string, serviceId: string): Promise<RenderEnvVar[]> {
  const res = await fetch(`/api/render/services/${serviceId}/env-vars`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function setEnvVars(apiKey: string, serviceId: string, vars: RenderEnvVar[]): Promise<void> {
  const res = await fetch(`/api/render/services/${serviceId}/env-vars`, { method: "PUT", headers: renderHeaders(apiKey), body: JSON.stringify(vars) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

// ===== Postgres APIs =====

export async function listPostgres(apiKey: string, filters?: { name?: string; limit?: number; cursor?: string }): Promise<{ postgres?: RenderPostgres[]; cursor?: string }> {
  const params = new URLSearchParams();
  if (filters?.name) params.set("name", filters.name);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.cursor) params.set("cursor", filters.cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/render/postgres${qs}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getPostgres(apiKey: string, postgresId: string): Promise<RenderPostgres> {
  const res = await fetch(`/api/render/postgres/${postgresId}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function createPostgres(apiKey: string, data: Record<string, unknown>): Promise<RenderPostgres> {
  const res = await fetch("/api/render/postgres", { method: "POST", headers: renderHeaders(apiKey), body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function deletePostgres(apiKey: string, postgresId: string): Promise<void> {
  const res = await fetch(`/api/render/postgres/${postgresId}`, { method: "DELETE", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

export async function getPostgresConnection(apiKey: string, postgresId: string): Promise<Record<string, string>> {
  const res = await fetch(`/api/render/postgres/${postgresId}/connection-info`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function suspendPostgres(apiKey: string, postgresId: string): Promise<void> {
  const res = await fetch(`/api/render/postgres/${postgresId}/suspend`, { method: "POST", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

export async function resumePostgres(apiKey: string, postgresId: string): Promise<void> {
  const res = await fetch(`/api/render/postgres/${postgresId}/resume`, { method: "POST", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

// ===== Key Value APIs =====

export async function listKeyValue(apiKey: string, filters?: { name?: string; limit?: number; cursor?: string }): Promise<{ keyValueInstances?: RenderKeyValue[]; cursor?: string }> {
  const params = new URLSearchParams();
  if (filters?.name) params.set("name", filters.name);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.cursor) params.set("cursor", filters.cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/render/key-value${qs}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getKeyValue(apiKey: string, keyValueId: string): Promise<RenderKeyValue> {
  const res = await fetch(`/api/render/key-value/${keyValueId}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function createKeyValue(apiKey: string, data: Record<string, unknown>): Promise<RenderKeyValue> {
  const res = await fetch("/api/render/key-value", { method: "POST", headers: renderHeaders(apiKey), body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function deleteKeyValue(apiKey: string, keyValueId: string): Promise<void> {
  const res = await fetch(`/api/render/key-value/${keyValueId}`, { method: "DELETE", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

export async function getKeyValueConnection(apiKey: string, keyValueId: string): Promise<Record<string, string>> {
  const res = await fetch(`/api/render/key-value/${keyValueId}/connection-info`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

// ===== Disk APIs =====

export async function listDisks(apiKey: string, filters?: { limit?: number; cursor?: string }): Promise<{ disks?: RenderDisk[]; cursor?: string }> {
  const params = new URLSearchParams();
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.cursor) params.set("cursor", filters.cursor);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/render/disks${qs}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getDisk(apiKey: string, diskId: string): Promise<RenderDisk> {
  const res = await fetch(`/api/render/disks/${diskId}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function createDisk(apiKey: string, data: Record<string, unknown>): Promise<RenderDisk> {
  const res = await fetch("/api/render/disks", { method: "POST", headers: renderHeaders(apiKey), body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function deleteDisk(apiKey: string, diskId: string): Promise<void> {
  const res = await fetch(`/api/render/disks/${diskId}`, { method: "DELETE", headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
}

// ===== Owner / Workspace APIs =====

export async function listOwners(apiKey: string): Promise<RenderOwner[]> {
  const res = await fetch("/api/render/owners", { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getOwner(apiKey: string, ownerId: string): Promise<RenderOwner> {
  const res = await fetch(`/api/render/owners/${ownerId}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getUser(apiKey: string): Promise<RenderUser> {
  const res = await fetch("/api/render/users", { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

// ===== Project APIs =====

export async function listRenderProjects(apiKey: string): Promise<RenderProject[]> {
  const res = await fetch("/api/render/projects", { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

export async function getRenderProject(apiKey: string, projectId: string): Promise<RenderProject> {
  const res = await fetch(`/api/render/projects/${projectId}`, { headers: renderHeaders(apiKey) });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: "Request failed" })); throw new Error(e.error || `Failed (${res.status})`); }
  return res.json();
}

// ===== Verify =====

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  try { await getUser(apiKey); return true; } catch { return false; }
}

// ===== Helpers =====

export function getServiceStatusColor(status: string): { dot: string; text: string; bg: string } {
  switch (status) {
    case "live": return { dot: "bg-[#10b981]", text: "text-[#10b981]", bg: "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]" };
    case "suspended": return { dot: "bg-[#f59e0b]", text: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]" };
    case "created": return { dot: "bg-[#818cf8]", text: "text-[#818cf8]", bg: "bg-[rgba(129,140,248,0.1)] border-[rgba(129,140,248,0.2)]" };
    case "deploying": return { dot: "bg-[#818cf8]", text: "text-[#818cf8]", bg: "bg-[rgba(129,140,248,0.1)] border-[rgba(129,140,248,0.2)]" };
    case "build_failed": case "deploy_failed": return { dot: "bg-[#ef4444]", text: "text-[#ef4444]", bg: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]" };
    case "deactivated": return { dot: "bg-[#64748b]", text: "text-[#64748b]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]" };
    default: return { dot: "bg-[#64748b]", text: "text-[#64748b]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]" };
  }
}

export function getDeployStatusColor(status: string): { dot: string; text: string } {
  switch (status) {
    case "live": return { dot: "bg-[#10b981]", text: "text-[#10b981]" };
    case "build_failed": case "deploy_failed": return { dot: "bg-[#ef4444]", text: "text-[#ef4444]" };
    case "build_in_progress": case "deploy_in_progress": return { dot: "bg-[#818cf8]", text: "text-[#818cf8]" };
    case "canceled": return { dot: "bg-[#64748b]", text: "text-[#64748b]" };
    default: return { dot: "bg-[#64748b]", text: "text-[#64748b]" };
  }
}

export function getRegionName(code: string): string {
  const regions: Record<string, string> = {
    "oregon": "US West (Oregon)",
    "virginia": "US East (Virginia)",
    "ohio": "US East (Ohio)",
    "frankfurt": "EU Central (Frankfurt)",
    "singapore": "Asia Pacific (Singapore)",
    "sydney": "Asia Pacific (Sydney)",
    "mumbai": "Asia Pacific (Mumbai)",
    "sa-east-1": "South America (São Paulo)",
  };
  return regions[code] || code;
}

export function getServiceTypeLabel(type: string): string {
  switch (type) {
    case "web_service": return "Web Service";
    case "pserv": return "Private Service";
    case "background_worker": return "Background Worker";
    case "cron_job": return "Cron Job";
    case "static_site": return "Static Site";
    default: return type;
  }
}
