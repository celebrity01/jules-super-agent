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
    renderApiKey?: string;
  }
): Promise<unknown> {
  const { target, action, params } = command;

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
          const errText = await deployRes.text();
          let errData;
          try { errData = JSON.parse(errText); } catch { errData = {}; }
          throw new Error((errData as Record<string, string>).message || `Deploy failed (${deployRes.status})`);
        }
        const deployText = await deployRes.text();
        try { return JSON.parse(deployText); } catch { return { success: true }; }
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
        const svcText = await svcRes.text();
        let svc;
        try { svc = JSON.parse(svcText); } catch { throw new Error("Invalid JSON from Render API"); }
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
