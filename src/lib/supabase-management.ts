// Supabase Management API client
// Uses Personal Access Token (PAT) to manage organizations and projects
// API Base: https://api.supabase.com/v1

const MANAGEMENT_API_BASE = "https://api.supabase.com/v1";

const mgmtHeaders = (accessToken: string) => ({
  "X-Supabase-Access-Token": accessToken,
  "Content-Type": "application/json",
});

// ===== Types =====

export interface SupabaseProject {
  id: string;
  ref: string;
  organization_id: string;
  organization_slug: string;
  name: string;
  region: string;
  created_at: string;
  status: string;
  database?: {
    host: string;
    version: string;
    postgres_engine: string;
    release_channel: string;
  };
}

export interface SupabaseOrganization {
  id: string;
  slug: string;
  name: string;
  plan?: string;
}

export interface SupabaseApiKey {
  api_key: string;
  id: string;
  type: string;
  prefix: string;
  name: string;
  description?: string;
  inserted_at: string;
  updated_at: string;
}

export interface SupabaseServiceHealth {
  name: string;
  healthy: boolean;
  status: string;
  info?: {
    name: string;
    version: string;
    description: string;
  };
}

export interface SupabaseBranch {
  id: string;
  name: string;
  project_ref: string;
  parent_project_ref: string;
  is_default: boolean;
  git_branch?: string;
  persistent: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectPayload {
  db_pass: string;
  name: string;
  organization_slug: string;
  region?: string;
  desired_instance_size?: string;
  template_url?: string;
}

export interface AvailableRegion {
  name: string;
  code: string;
  type: string;
  provider?: string;
  status?: string;
}

// ===== API Calls =====

export async function listProjects(accessToken: string): Promise<SupabaseProject[]> {
  const res = await fetch("/api/supabase/projects", {
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch projects (${res.status})`);
  }
  return res.json();
}

export async function getProject(accessToken: string, ref: string): Promise<SupabaseProject> {
  const res = await fetch(`/api/supabase/projects/${ref}`, {
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch project (${res.status})`);
  }
  return res.json();
}

export async function createProject(accessToken: string, payload: CreateProjectPayload): Promise<SupabaseProject> {
  const res = await fetch("/api/supabase/projects", {
    method: "POST",
    headers: mgmtHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to create project (${res.status})`);
  }
  return res.json();
}

export async function deleteProject(accessToken: string, ref: string): Promise<void> {
  const res = await fetch(`/api/supabase/projects/${ref}`, {
    method: "DELETE",
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to delete project (${res.status})`);
  }
}

export async function pauseProject(accessToken: string, ref: string): Promise<void> {
  const res = await fetch(`/api/supabase/projects/${ref}/pause`, {
    method: "POST",
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to pause project (${res.status})`);
  }
}

export async function restoreProject(accessToken: string, ref: string): Promise<void> {
  const res = await fetch(`/api/supabase/projects/${ref}/restore`, {
    method: "POST",
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to restore project (${res.status})`);
  }
}

export async function listOrganizations(accessToken: string): Promise<SupabaseOrganization[]> {
  const res = await fetch("/api/supabase/organizations", {
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch organizations (${res.status})`);
  }
  return res.json();
}

export async function getProjectHealth(accessToken: string, ref: string): Promise<SupabaseServiceHealth[]> {
  const res = await fetch(`/api/supabase/projects/${ref}/health`, {
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch project health (${res.status})`);
  }
  return res.json();
}

export async function getProjectApiKeys(accessToken: string, ref: string): Promise<SupabaseApiKey[]> {
  const res = await fetch(`/api/supabase/projects/${ref}/api-keys`, {
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch API keys (${res.status})`);
  }
  return res.json();
}

export async function listProjectBranches(accessToken: string, ref: string): Promise<SupabaseBranch[]> {
  const res = await fetch(`/api/supabase/projects/${ref}/branches`, {
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch branches (${res.status})`);
  }
  return res.json();
}

export async function getAvailableRegions(accessToken: string, orgSlug: string): Promise<{
  recommendations: {
    smartGroup: { name: string; code: string };
    specific: AvailableRegion[];
  };
  all: {
    smartGroup: Array<{ name: string; code: string }>;
    specific: AvailableRegion[];
  };
}> {
  const res = await fetch(`/api/supabase/projects/available-regions?organization_slug=${orgSlug}`, {
    headers: mgmtHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch regions (${res.status})`);
  }
  return res.json();
}

// Verify access token by fetching projects
export async function verifyAccessToken(accessToken: string): Promise<boolean> {
  try {
    await listProjects(accessToken);
    return true;
  } catch {
    return false;
  }
}

// Region display names
export function getRegionName(regionCode: string): string {
  const regions: Record<string, string> = {
    "us-east-1": "US East (N. Virginia)",
    "us-west-1": "US West (N. California)",
    "us-west-2": "US West (Oregon)",
    "ap-southeast-1": "Asia Pacific (Singapore)",
    "ap-northeast-1": "Asia Pacific (Tokyo)",
    "ap-northeast-2": "Asia Pacific (Seoul)",
    "ap-south-1": "Asia Pacific (Mumbai)",
    "sa-east-1": "South America (São Paulo)",
    "eu-west-1": "EU West (Ireland)",
    "eu-west-2": "EU West (London)",
    "eu-west-3": "EU West (Paris)",
    "eu-central-1": "EU Central (Frankfurt)",
    "eu-central-2": "EU Central (Zurich)",
    "ca-central-1": "Canada Central (Montréal)",
    "ap-southeast-2": "Asia Pacific (Sydney)",
    "me-south-1": "Middle East (Bahrain)",
    "af-south-1": "Africa (Cape Town)",
  };
  return regions[regionCode] || regionCode;
}

// Project status colors
export function getProjectStatusColor(status: string): { dot: string; text: string; bg: string } {
  switch (status) {
    case "ACTIVE_HEALTHY":
      return { dot: "bg-[#10b981]", text: "text-[#10b981]", bg: "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]" };
    case "ACTIVE_UNHEALTHY":
      return { dot: "bg-[#f59e0b]", text: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]" };
    case "INACTIVE":
      return { dot: "bg-[#64748b]", text: "text-[#64748b]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]" };
    case "PAUSED":
      return { dot: "bg-[#f59e0b]", text: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]" };
    case "REMOVED":
      return { dot: "bg-[#ef4444]", text: "text-[#ef4444]", bg: "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]" };
    default:
      return { dot: "bg-[#64748b]", text: "text-[#64748b]", bg: "bg-[rgba(100,116,139,0.1)] border-[rgba(100,116,139,0.2)]" };
  }
}
