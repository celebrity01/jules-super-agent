import { NextRequest, NextResponse } from "next/server";

// Agent execution endpoint: handles cross-service commands
// Routes commands to the appropriate service API based on target

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, credentials } = body as {
      command: {
        type: string;
        source: string;
        target: string;
        action: string;
        params: Record<string, unknown>;
        description: string;
      };
      credentials: {
        julesApiKey?: string;
        supabasePAT?: string;
        renderApiKey?: string;
      };
    };

    if (!command || !command.action || !command.target) {
      return NextResponse.json(
        { error: "Missing command fields (action, target required)" },
        { status: 400 }
      );
    }

    const result = await executeCommand(command, credentials);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function executeCommand(
  command: {
    type: string;
    source: string;
    target: string;
    action: string;
    params: Record<string, unknown>;
  },
  credentials: {
    julesApiKey?: string;
    supabasePAT?: string;
    renderApiKey?: string;
  }
): Promise<unknown> {
  const { target, action, params } = command;

  // ===== Cross-service: Supabase → Render sync =====
  if (command.type === "sync-env-vars" && target === "render") {
    if (!credentials.supabasePAT || !credentials.renderApiKey) {
      throw new Error("Both Supabase PAT and Render API key required");
    }
    const projectRef = params.supabaseProjectRef as string;
    const serviceId = params.renderServiceId as string;

    // Get Supabase API keys
    const keysRes = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
      { headers: supabaseHeaders(credentials.supabasePAT) }
    );
    if (!keysRes.ok) throw new Error("Failed to fetch Supabase API keys");
    const keys = await keysRes.json() as Array<{ name: string; api_key: string }>;

    // Set as Render env vars
    const envVars = keys.map((k) => ({
      key: `SUPABASE_${k.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`,
      value: k.api_key,
    }));

    const envRes = await fetch(
      `${getRenderBaseUrl()}/services/${serviceId}/env-vars`,
      {
        method: "PUT",
        headers: renderHeaders(credentials.renderApiKey),
        body: JSON.stringify(envVars),
      }
    );
    if (!envRes.ok) throw new Error("Failed to set Render env vars");

    return { success: true, syncedVars: envVars.length, serviceId, projectRef };
  }

  // ===== Render target commands =====
  if (target === "render") {
    if (!credentials.renderApiKey) {
      throw new Error("Render API key not configured");
    }

    switch (action) {
      case "triggerDeploy": {
        const serviceId = params.renderServiceId as string;
        const commitId = params.commitId as string | undefined;
        const deployRes = await fetch(
          `${getRenderBaseUrl()}/services/${serviceId}/deploys`,
          {
            method: "POST",
            headers: renderHeaders(credentials.renderApiKey),
            body: JSON.stringify(commitId ? { commitId } : {}),
          }
        );
        if (!deployRes.ok) {
          const err = await deployRes.json().catch(() => ({}));
          throw new Error((err as Record<string, string>).message || `Deploy failed (${deployRes.status})`);
        }
        return deployRes.json();
      }

      case "getServiceStatus": {
        const serviceId = params.renderServiceId as string;
        const svcRes = await fetch(
          `${getRenderBaseUrl()}/services/${serviceId}`,
          { headers: renderHeaders(credentials.renderApiKey) }
        );
        if (!svcRes.ok) {
          throw new Error(`Failed to get service (${svcRes.status})`);
        }
        const svc = await svcRes.json();
        return {
          id: svc.id,
          name: svc.name,
          type: svc.type,
          status: svc.serviceDetails?.status || "unknown",
          region: svc.region,
        };
      }

      case "restartService": {
        const serviceId = params.renderServiceId as string;
        const restartRes = await fetch(
          `${getRenderBaseUrl()}/services/${serviceId}/restart`,
          { method: "POST", headers: renderHeaders(credentials.renderApiKey) }
        );
        if (!restartRes.ok) {
          throw new Error(`Restart failed (${restartRes.status})`);
        }
        return { success: true, serviceId };
      }

      case "setEnvVars": {
        const serviceId = params.renderServiceId as string;
        const envVars = params.envVars as Array<{ key: string; value: string }>;
        const envRes = await fetch(
          `${getRenderBaseUrl()}/services/${serviceId}/env-vars`,
          {
            method: "PUT",
            headers: renderHeaders(credentials.renderApiKey),
            body: JSON.stringify(envVars),
          }
        );
        if (!envRes.ok) {
          throw new Error(`Set env vars failed (${envRes.status})`);
        }
        return { success: true, serviceId, varsCount: envVars.length };
      }

      case "suspendService": {
        const serviceId = params.renderServiceId as string;
        const res = await fetch(
          `${getRenderBaseUrl()}/services/${serviceId}/suspend`,
          { method: "POST", headers: renderHeaders(credentials.renderApiKey) }
        );
        if (!res.ok) throw new Error(`Suspend failed (${res.status})`);
        return { success: true, serviceId };
      }

      case "resumeService": {
        const serviceId = params.renderServiceId as string;
        const res = await fetch(
          `${getRenderBaseUrl()}/services/${serviceId}/resume`,
          { method: "POST", headers: renderHeaders(credentials.renderApiKey) }
        );
        if (!res.ok) throw new Error(`Resume failed (${res.status})`);
        return { success: true, serviceId };
      }

      default:
        throw new Error(`Unknown Render action: ${action}`);
    }
  }

  // ===== Supabase target commands =====
  if (target === "supabase") {
    if (!credentials.supabasePAT) {
      throw new Error("Supabase PAT not configured");
    }

    switch (action) {
      case "getHealth": {
        const projectRef = params.supabaseProjectRef as string;
        const healthRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/health`,
          { headers: supabaseHeaders(credentials.supabasePAT) }
        );
        if (!healthRes.ok) {
          throw new Error(`Health check failed (${healthRes.status})`);
        }
        return healthRes.json();
      }

      case "pauseProject": {
        const projectRef = params.supabaseProjectRef as string;
        const pauseRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/pause`,
          { method: "POST", headers: supabaseHeaders(credentials.supabasePAT) }
        );
        if (!pauseRes.ok) throw new Error(`Pause failed (${pauseRes.status})`);
        return { success: true, projectRef };
      }

      case "restoreProject": {
        const projectRef = params.supabaseProjectRef as string;
        const restoreRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/restore`,
          { method: "POST", headers: supabaseHeaders(credentials.supabasePAT) }
        );
        if (!restoreRes.ok) throw new Error(`Restore failed (${restoreRes.status})`);
        return { success: true, projectRef };
      }

      case "getApiKeys": {
        const projectRef = params.supabaseProjectRef as string;
        const keysRes = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
          { headers: supabaseHeaders(credentials.supabasePAT) }
        );
        if (!keysRes.ok) throw new Error(`Get API keys failed (${keysRes.status})`);
        return keysRes.json();
      }

      case "linkDatabase": {
        const renderPostgresId = params.renderPostgresId as string;
        const projectRef = params.supabaseProjectRef as string;
        return {
          success: true,
          link: {
            renderPostgresId,
            supabaseProjectRef: projectRef,
            linkedAt: new Date().toISOString(),
          },
        };
      }

      default:
        throw new Error(`Unknown Supabase action: ${action}`);
    }
  }

  throw new Error(`Unknown command target: ${target}`);
}

// ===== Helper functions =====

function getRenderBaseUrl(): string {
  return "https://api.render.com/v1";
}

function renderHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function supabaseHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    "Content-Type": "application/json",
  };
}
