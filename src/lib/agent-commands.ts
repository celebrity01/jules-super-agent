// Cross-service command layer: Jules ↔ Supabase ↔ Render
// Enables the agent to query and control all three services

// ===== Command Types =====

export type ServiceType = "jules" | "supabase" | "render";

export interface AgentCommand {
  id: string;
  type: string;
  source: ServiceType;
  target: ServiceType;
  action: string;
  params: Record<string, unknown>;
  description: string;
}

export interface CommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  command: AgentCommand;
  timestamp: string;
}

// ===== Cross-service context =====

export interface ServiceMeshContext {
  jules: {
    connected: boolean;
    sessionsCount?: number;
    sourcesCount?: number;
  };
  supabase: {
    connected: boolean;
    projectCount?: number;
    projects?: Array<{
      ref: string;
      name: string;
      status: string;
      region: string;
    }>;
  };
  render: {
    connected: boolean;
    servicesCount?: number;
    services?: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      region: string;
    }>;
    postgresCount?: number;
    postgres?: Array<{
      id: string;
      name: string;
      status: string;
      plan: string;
    }>;
  };
}

// ===== Command execution helpers =====

export function buildServiceMeshContext(params: {
  apiKey: string | null;
  supabasePAT: string | null;
  renderApiKey: string | null;
  sessionsCount?: number;
  sourcesCount?: number;
}): ServiceMeshContext {
  return {
    jules: {
      connected: !!params.apiKey,
      sessionsCount: params.sessionsCount,
      sourcesCount: params.sourcesCount,
    },
    supabase: {
      connected: !!params.supabasePAT,
    },
    render: {
      connected: !!params.renderApiKey,
    },
  };
}

// ===== Pre-built cross-service command templates =====

export const CROSS_SERVICE_COMMANDS = {
  // Supabase → Render: Set Supabase project keys as Render service env vars
  syncSupabaseKeysToRender: (supabaseProjectRef: string, renderServiceId: string): AgentCommand => ({
    id: `sync-keys-${Date.now()}`,
    type: "sync-env-vars",
    source: "supabase",
    target: "render",
    action: "setEnvVars",
    params: { supabaseProjectRef, renderServiceId },
    description: `Sync Supabase (${supabaseProjectRef}) API keys to Render service (${renderServiceId}) env vars`,
  }),

  // Render → Supabase: Link Render Postgres connection string to Supabase project
  linkRenderPostgresToSupabase: (renderPostgresId: string, supabaseProjectRef: string): AgentCommand => ({
    id: `link-pg-${Date.now()}`,
    type: "link-database",
    source: "render",
    target: "supabase",
    action: "linkDatabase",
    params: { renderPostgresId, supabaseProjectRef },
    description: `Link Render Postgres (${renderPostgresId}) to Supabase project (${supabaseProjectRef})`,
  }),

  // Jules → Render: Deploy a Render service after code changes
  deployToRender: (renderServiceId: string, commitId?: string): AgentCommand => ({
    id: `deploy-${Date.now()}`,
    type: "trigger-deploy",
    source: "jules",
    target: "render",
    action: "triggerDeploy",
    params: { renderServiceId, commitId },
    description: `Trigger deploy on Render service (${renderServiceId})${commitId ? ` for commit ${commitId}` : ""}`,
  }),

  // Jules → Supabase: Check Supabase project health
  checkSupabaseHealth: (supabaseProjectRef: string): AgentCommand => ({
    id: `health-${Date.now()}`,
    type: "check-health",
    source: "jules",
    target: "supabase",
    action: "getHealth",
    params: { supabaseProjectRef },
    description: `Check health of Supabase project (${supabaseProjectRef})`,
  }),

  // Jules → Render: Check Render service status
  checkRenderStatus: (renderServiceId: string): AgentCommand => ({
    id: `status-${Date.now()}`,
    type: "check-status",
    source: "jules",
    target: "render",
    action: "getServiceStatus",
    params: { renderServiceId },
    description: `Check status of Render service (${renderServiceId})`,
  }),

  // Jules → Render: Restart a Render service
  restartRenderService: (renderServiceId: string): AgentCommand => ({
    id: `restart-${Date.now()}`,
    type: "restart-service",
    source: "jules",
    target: "render",
    action: "restartService",
    params: { renderServiceId },
    description: `Restart Render service (${renderServiceId})`,
  }),

  // Jules → Supabase: Pause a Supabase project
  pauseSupabaseProject: (supabaseProjectRef: string): AgentCommand => ({
    id: `pause-${Date.now()}`,
    type: "pause-project",
    source: "jules",
    target: "supabase",
    action: "pauseProject",
    params: { supabaseProjectRef },
    description: `Pause Supabase project (${supabaseProjectRef})`,
  }),

  // Jules → Supabase: Restore a Supabase project
  restoreSupabaseProject: (supabaseProjectRef: string): AgentCommand => ({
    id: `restore-${Date.now()}`,
    type: "restore-project",
    source: "jules",
    target: "supabase",
    action: "restoreProject",
    params: { supabaseProjectRef },
    description: `Restore Supabase project (${supabaseProjectRef})`,
  }),

  // Render → Supabase: Sync Render service URL to Supabase
  syncRenderUrlToSupabase: (renderServiceId: string, supabaseProjectRef: string): AgentCommand => ({
    id: `sync-url-${Date.now()}`,
    type: "sync-service-url",
    source: "render",
    target: "supabase",
    action: "syncServiceUrl",
    params: { renderServiceId, supabaseProjectRef },
    description: `Sync Render service URL to Supabase project (${supabaseProjectRef})`,
  }),
};

// ===== Execute a cross-service command via the backend =====

export async function executeAgentCommand(
  command: AgentCommand,
  credentials: {
    julesApiKey?: string;
    supabasePAT?: string;
    renderApiKey?: string;
  }
): Promise<CommandResult> {
  try {
    const res = await fetch("/api/agent/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, credentials }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      return {
        success: false,
        error: err.error || `Failed (${res.status})`,
        command,
        timestamp: new Date().toISOString(),
      };
    }

    const data = await res.json();
    return {
      success: true,
      data: data.result,
      command,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      command,
      timestamp: new Date().toISOString(),
    };
  }
}

// ===== Build Jules session context with cross-service info =====

export function buildAgentSystemPrompt(context: ServiceMeshContext): string {
  const parts: string[] = [
    "You are a super agent with access to multiple services:",
  ];

  if (context.jules.connected) {
    parts.push(
      `- Jules API: Connected (${context.jules.sessionsCount ?? 0} sessions, ${context.jules.sourcesCount ?? 0} sources). You can create and manage coding sessions.`
    );
  }

  if (context.supabase.connected) {
    parts.push(
      `- Supabase: Connected${context.supabase.projectCount ? ` (${context.supabase.projectCount} projects)` : ""}. You can manage projects, check health, pause/restore, and retrieve API keys.`
    );
    if (context.supabase.projects?.length) {
      parts.push(
        `  Available projects: ${context.supabase.projects.map((p) => `${p.name} (${p.ref}, ${p.status})`).join(", ")}`
      );
    }
  }

  if (context.render.connected) {
    parts.push(
      `- Render: Connected${context.render.servicesCount ? ` (${context.render.servicesCount} services, ${context.render.postgresCount ?? 0} Postgres instances)` : ""}. You can manage services, trigger deploys, check status, suspend/resume, and manage environment variables.`
    );
    if (context.render.services?.length) {
      parts.push(
        `  Services: ${context.render.services.map((s) => `${s.name} (${s.type}, ${s.status})`).join(", ")}`
      );
    }
    if (context.render.postgres?.length) {
      parts.push(
        `  Postgres: ${context.render.postgres.map((p) => `${p.name} (${p.plan}, ${p.status})`).join(", ")}`
      );
    }
  }

  parts.push(
    "\nYou can execute cross-service commands. For example:",
    "- After code changes, deploy to Render",
    "- Sync Supabase API keys as Render environment variables",
    "- Check Supabase project health and restart Render services if needed",
    "- Link Render Postgres databases to Supabase projects"
  );

  return parts.join("\n");
}
