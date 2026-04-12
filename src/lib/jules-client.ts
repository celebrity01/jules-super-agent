// Client-side API helper for Jules API

export interface JulesSource {
  name: string;
  displayName?: string;
  githubRepoContext?: {
    repoUri?: string;
    defaultBranch?: string;
  };
}

export interface JulesSession {
  name: string;
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

export interface JulesActivity {
  name: string;
  type?: string;
  description?: string;
  createTime?: string;
  bashOutput?: string;
  codeChange?: {
    file?: string;
    diff?: string;
    description?: string;
  };
  progress?: string;
  planStep?: number;
}

const headers = (apiKey: string) => ({
  "X-Jules-Api-Key": apiKey,
  "Content-Type": "application/json",
});

export async function listSources(apiKey: string): Promise<{ sources?: JulesSource[] }> {
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
  return res.json();
}
