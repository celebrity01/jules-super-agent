import { NextRequest, NextResponse } from "next/server";

/**
 * Create a new Render web service linked to a GitHub repository.
 * Requires X-Render-Api-Key header.
 * Body: { name, repoOwner, repoName, branch?, startCommand?, buildCommand?, env?, plan? }
 *
 * Uses the Render API to create a web service from a GitHub repo.
 * Docs: https://api-docs.render.com/reference/create-service
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("X-Render-Api-Key");
  if (!token) {
    return NextResponse.json({ error: "Render API key is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, repoOwner, repoName, branch, startCommand, buildCommand, env, plan } = body;

    if (!repoOwner || !repoName) {
      return NextResponse.json({ error: "repoOwner and repoName are required" }, { status: 400 });
    }

    const serviceBody: Record<string, unknown> = {
      type: "web_service",
      name: name || repoName,
      repo: `https://github.com/${repoOwner}/${repoName}`,
      branch: branch || "main",
      startCommand: startCommand || "npm start",
      buildCommand: buildCommand || "npm install && npm run build",
      plan: plan || "starter",
      autoDeploy: "yes",
    };

    if (env && typeof env === "object") {
      serviceBody.envVars = Object.entries(env).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }

    const res = await fetch("https://api.render.com/v1/services", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(serviceBody),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json(
        { error: `Non-JSON response from Render (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status }
      );
    }

    if (!res.ok) {
      console.error("Render service creation error:", data);
      return NextResponse.json(
        { error: data.message || `Failed to create service (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json({
      id: data.service?.id || data.id,
      name: data.service?.name || data.name,
      url: data.service?.serviceDetails?.url || data.url,
    }, { status: 201 });
  } catch (error) {
    console.error("Render service creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create Render service" },
      { status: 500 }
    );
  }
}
