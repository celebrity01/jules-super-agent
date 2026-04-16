// Client-side API helper for Jules API
// Based on official Google Jules API v1alpha documentation
// https://developers.google.com/jules/api/reference/rest

// ===== Source types (real API) =====

export interface GitHubBranch {
  displayName: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  isPrivate?: boolean;
  defaultBranch?: GitHubBranch;
  branches?: GitHubBranch[];
}

export interface JulesSource {
  name: string;
  id?: string;
  githubRepo?: GitHubRepo;
}

// ===== Session types (real API) =====

export interface SourceContext {
  source: string;
  githubRepoContext?: {
    startingBranch?: string;
  };
}

export interface PullRequest {
  url: string;
  title?: string;
}

export interface SessionOutput {
  pullRequest?: PullRequest;
  commitUrl?: string;
  summary?: string;
}

export type AutomationMode = "AUTOMATION_MODE_UNSPECIFIED" | "AUTO_CREATE_PR";
export type SessionState = "STATE_UNSPECIFIED" | "ACTIVE" | "AWAITING_APPROVAL" | "COMPLETED" | "FAILED";

export interface JulesSession {
  name: string;
  id?: string;
  prompt: string;
  sourceContext?: SourceContext;
  title?: string;
  requirePlanApproval?: boolean;
  automationMode?: AutomationMode;
  createTime?: string;
  updateTime?: string;
  state?: SessionState;
  url?: string;
  outputs?: SessionOutput[];
}

// ===== Activity types (real API) =====

export interface PlanStep {
  id?: string;
  title?: string;
  description?: string;
  index?: number;
}

export interface Plan {
  id?: string;
  steps?: PlanStep[];
  createTime?: string;
}

export interface AgentMessaged {
  agentMessage?: string;
}

export interface UserMessaged {
  userMessage?: string;
}

export interface PlanGenerated {
  plan?: Plan;
}

export interface PlanApproved {
  planId?: string;
}

export interface ProgressUpdated {
  title?: string;
  description?: string;
}

export interface SessionCompleted {
  // no fields per API spec
}

export interface SessionFailed {
  reason?: string;
}

export interface GitPatch {
  unidiffPatch?: string;
  baseCommitId?: string;
  suggestedCommitMessage?: string;
}

export interface ChangeSet {
  source?: string;
  gitPatch?: GitPatch;
}

export interface Media {
  data?: string;
  mimeType?: string;
}

export interface BashOutput {
  command?: string;
  output?: string;
  exitCode?: number;
}

export interface Artifact {
  changeSet?: ChangeSet;
  media?: Media;
  bashOutput?: BashOutput;
}

export interface JulesActivity {
  name: string;
  id?: string;
  description?: string;
  createTime?: string;
  originator?: string; // "user" | "agent" | "system"
  artifacts?: Artifact[];

  // Union field activity - only one will be set
  agentMessaged?: AgentMessaged;
  userMessaged?: UserMessaged;
  planGenerated?: PlanGenerated;
  planApproved?: PlanApproved;
  progressUpdated?: ProgressUpdated;
  sessionCompleted?: SessionCompleted;
  sessionFailed?: SessionFailed;
}

/**
 * Determines the activity type from the union field.
 * The Jules API uses presence of nested objects to indicate type.
 */
export function getActivityType(activity: JulesActivity): string {
  if (activity.agentMessaged) return "AGENT_MESSAGED";
  if (activity.userMessaged) return "USER_MESSAGED";
  if (activity.planGenerated) return "PLAN_GENERATED";
  if (activity.planApproved) return "PLAN_APPROVED";
  if (activity.progressUpdated) return "PROGRESS_UPDATED";
  if (activity.sessionCompleted) return "SESSION_COMPLETED";
  if (activity.sessionFailed) return "SESSION_FAILED";
  return "UNKNOWN";
}

/**
 * Checks if activity originated from user
 */
export function isUserActivity(activity: JulesActivity): boolean {
  return activity.originator === "user" || !!activity.userMessaged;
}

/**
 * Get the first bashOutput artifact from an activity
 */
export function getBashArtifact(activity: JulesActivity): BashOutput | null {
  return activity.artifacts?.find(a => a.bashOutput)?.bashOutput || null;
}

/**
 * Get the first changeSet artifact from an activity
 */
export function getChangeSetArtifact(activity: JulesActivity): ChangeSet | null {
  return activity.artifacts?.find(a => a.changeSet)?.changeSet || null;
}

const headers = (apiKey: string) => ({
  "X-Jules-Api-Key": apiKey,
  "Content-Type": "application/json",
});

export function getSourceDisplayName(source: JulesSource): string {
  if (source.githubRepo) {
    return `${source.githubRepo.owner}/${source.githubRepo.repo}`;
  }
  if (source.name) {
    const parts = source.name.split("/");
    const githubIndex = parts.indexOf("github");
    if (githubIndex >= 0 && parts.length > githubIndex + 2) {
      return `${parts[githubIndex + 1]}/${parts[githubIndex + 2]}`;
    }
  }
  return source.name.split("/").pop() || source.name;
}

export function getSourceBranch(source: JulesSource): string {
  return source.githubRepo?.defaultBranch?.displayName || "main";
}

export async function listSources(apiKey: string): Promise<{ sources?: JulesSource[]; nextPageToken?: string }> {
  const res = await fetch("/api/jules/sources", {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch sources (${res.status})`);
  }
  return res.json();
}

export async function listSessions(
  apiKey: string,
  pageSize = 10,
  pageToken?: string
): Promise<{ sessions?: JulesSession[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`/api/jules/sessions?${params}`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch sessions (${res.status})`);
  }
  return res.json();
}

export async function createSession(
  apiKey: string,
  data: {
    prompt: string;
    sourceContext: SourceContext;
    automationMode?: AutomationMode;
    title?: string;
    requirePlanApproval?: boolean;
  }
): Promise<JulesSession> {
  const res = await fetch("/api/jules/sessions", {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to create session (${res.status})`);
  }
  return res.json();
}

/**
 * Extract the raw ID from a session name.
 * "sessions/abc123" -> "abc123"
 * "abc123" -> "abc123"
 */
function extractId(sessionId: string): string {
  if (sessionId.includes("/")) {
    return sessionId.split("/").pop() || sessionId;
  }
  return sessionId;
}

export async function getSession(
  apiKey: string,
  sessionId: string
): Promise<JulesSession> {
  const id = extractId(sessionId);
  const res = await fetch(`/api/jules/sessions/${id}`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch session (${res.status})`);
  }
  return res.json();
}

export async function approvePlan(
  apiKey: string,
  sessionId: string
): Promise<unknown> {
  const id = extractId(sessionId);
  const res = await fetch(`/api/jules/sessions/${id}/approve`, {
    method: "POST",
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to approve plan (${res.status})`);
  }
  // approvePlan returns empty body on success
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: true }; }
}

export async function listActivities(
  apiKey: string,
  sessionId: string,
  pageSize = 50,
  pageToken?: string
): Promise<{ activities?: JulesActivity[]; nextPageToken?: string }> {
  const id = extractId(sessionId);
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(
    `/api/jules/sessions/${id}/activities?${params}`,
    {
      headers: headers(apiKey),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(
      err.error || `Failed to fetch activities (${res.status})`
    );
  }
  return res.json();
}

export async function sendMessage(
  apiKey: string,
  sessionId: string,
  prompt: string
): Promise<unknown> {
  const id = extractId(sessionId);
  const res = await fetch(`/api/jules/sessions/${id}/message`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ userMessage: prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to send message (${res.status})`);
  }
  // sendMessage returns empty body on success
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: true }; }
}

// ===== GitHub API types and helpers =====

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name?: string;
}

export interface GitHubRepoInfo {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  html_url: string;
}

const githubHeaders = (token: string) => ({
  "X-GitHub-Token": token,
  "Content-Type": "application/json",
});

export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch("/api/github/user", {
    headers: githubHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch GitHub user (${res.status})`);
  }
  return res.json();
}

export async function getGitHubRepos(token: string): Promise<GitHubRepoInfo[]> {
  const res = await fetch("/api/github/repos", {
    headers: githubHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(
      err.error || `Failed to fetch GitHub repos (${res.status})`
    );
  }
  return res.json();
}

export async function createGitHubRepo(
  token: string,
  data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  }
): Promise<GitHubRepoInfo> {
  const res = await fetch("/api/github/create-repo", {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(
      err.error || `Failed to create GitHub repo (${res.status})`
    );
  }
  return res.json();
}
