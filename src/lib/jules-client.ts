// Client-side API helper for Jules API
// Based on official Google Jules API v1alpha documentation
// https://developers.google.com/jules/api/reference/rest

export interface JulesSource {
  name: string;
  id?: string;
  displayName?: string;
  githubRepo?: {
    owner: string;
    repo: string;
  };
  githubRepoContext?: {
    repoUri?: string;
    defaultBranch?: string;
  };
}

export interface JulesSession {
  name: string;
  id?: string;
  title?: string;
  prompt?: string;
  sourceContext?: {
    source?: string;
    githubRepoContext?: {
      startingBranch?: string;
    };
  };
  automationMode?: string;
  requirePlanApproval?: boolean;
  state?: string;
  createTime?: string;
  updateTime?: string;
  output?: {
    pullRequestUrl?: string;
    commitUrl?: string;
    summary?: string;
  };
  latestPlan?: {
    steps?: Array<{
      description?: string;
    }>;
  };
}

// The real Jules API returns activities with nested type-specific objects
// e.g., { planGenerated: { plan: {...} } } instead of { type: "PLAN_GENERATED" }
export interface JulesActivity {
  name: string;
  createTime?: string;
  originator?: "agent" | "user";
  description?: string;
  progress?: string;

  // Nested type-specific fields (real API format)
  planGenerated?: {
    plan?: {
      id?: string;
      steps?: Array<{ description?: string }>;
    };
  };
  bashOutput?: {
    command?: string;
    output?: string;
    exitCode?: number;
  };
  codeChange?: {
    file?: string;
    diff?: string;
    description?: string;
  };
  sessionCompleted?: {
    pullRequestUrl?: string;
    commitUrl?: string;
    summary?: string;
  };
  prCreated?: {
    pullRequestUrl?: string;
  };
  error?: {
    message?: string;
    code?: number;
  };
  planApproved?: {
    planId?: string;
  };
  userMessage?: {
    prompt?: string;
  };

  // Legacy flat format (for backward compatibility)
  type?: string;
  bashOutputLegacy?: string;
  codeChangeLegacy?: {
    file?: string;
    diff?: string;
    description?: string;
  };
}

/**
 * Determines the activity type from the nested fields.
 * The Jules API uses presence of nested objects to indicate type.
 */
export function getActivityType(activity: JulesActivity): string {
  if (activity.planGenerated) return "PLAN_GENERATED";
  if (activity.bashOutput) return "BASH_OUTPUT";
  if (activity.codeChange) return "CODE_CHANGE";
  if (activity.sessionCompleted) return "SESSION_COMPLETED";
  if (activity.prCreated) return "PR_CREATED";
  if (activity.error) return "ERROR";
  if (activity.planApproved) return "PLAN_APPROVED";
  if (activity.userMessage) return "USER_MESSAGE";
  if (activity.originator === "user") return "USER_MESSAGE";
  // Legacy fallback
  if (activity.type) return activity.type;
  return "UNKNOWN";
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
  return source.githubRepoContext?.defaultBranch || "main";
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

export async function getSource(apiKey: string, sourceName: string): Promise<JulesSource> {
  const res = await fetch(`/api/jules/sources/${encodeURIComponent(sourceName)}`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to fetch source (${res.status})`);
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
    sourceContext: {
      source: string;
      githubRepoContext: { startingBranch: string };
    };
    automationMode?: string;
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

export async function getSession(
  apiKey: string,
  sessionId: string
): Promise<JulesSession> {
  const res = await fetch(`/api/jules/sessions/${sessionId}`, {
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
  const res = await fetch(`/api/jules/sessions/${sessionId}/approve`, {
    method: "POST",
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to approve plan (${res.status})`);
  }
  return res.json();
}

export async function listActivities(
  apiKey: string,
  sessionId: string,
  pageSize = 30,
  pageToken?: string
): Promise<{ activities?: JulesActivity[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ pageSize: String(pageSize) });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(
    `/api/jules/sessions/${sessionId}/activities?${params}`,
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
  const res = await fetch(`/api/jules/sessions/${sessionId}/message`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Failed to send message (${res.status})`);
  }
  // The API may return an empty body on success
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: true }; }
}

// ===== GitHub API types and helpers =====

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name?: string;
}

export interface GitHubRepo {
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

export async function getGitHubRepos(token: string): Promise<GitHubRepo[]> {
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
): Promise<GitHubRepo> {
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
