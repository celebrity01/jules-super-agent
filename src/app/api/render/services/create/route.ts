import { NextRequest, NextResponse } from "next/server";

/**
 * Create a new Render web service linked to a GitHub repository.
 * Requires X-Render-Api-Key header.
 * Body: { name, repoOwner, repoName, branch?, startCommand?, buildCommand?, env?, plan? }
 *
 * Uses the Render API to create a web service from a GitHub repo.
 * Automatically fetches the ownerId from the Render API.
 * Docs: https://api-docs.render.com/reference/create-service
 *
 * Required structure for non-static, non-docker services:
 * serviceDetails: {
 *   env: "node",
 *   region: "oregon",
 *   plan: "starter",
 *   numInstances: 1,
 *   envSpecificDetails: {
 *     buildCommand: "...",
 *     startCommand: "..."
 *   }
 * }
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

    // Step 1: Fetch ownerId from Render API
    const ownersRes = await fetch("https://api.render.com/v1/owners", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const ownersText = await ownersRes.text();
    let ownersData;
    try { ownersData = JSON.parse(ownersText); } catch {
      return NextResponse.json(
        { error: `Failed to fetch Render owners: non-JSON response (${ownersRes.status})` },
        { status: ownersRes.status || 502 }
      );
    }

    if (!ownersRes.ok) {
      return NextResponse.json(
        { error: ownersData.message || `Failed to fetch Render owners (${ownersRes.status})` },
        { status: ownersRes.status }
      );
    }

    // Extract the first owner ID (user or team)
    let ownerId: string | null = null;
    if (Array.isArray(ownersData) && ownersData.length > 0) {
      ownerId = (ownersData[0].owner?.id || ownersData[0].id) as string;
    } else if (ownersData?.owner?.id) {
      ownerId = ownersData.owner.id as string;
    } else if (ownersData?.id) {
      ownerId = ownersData.id as string;
    }

    if (!ownerId) {
      return NextResponse.json(
        { error: "Could not determine Render owner ID. Make sure your API key is valid." },
        { status: 400 }
      );
    }

    // Step 2: Create the service with ownerId and proper serviceDetails structure
    const serviceBody: Record<string, unknown> = {
      type: "web_service",
      name: name || repoName,
      ownerId,
      repo: `https://github.com/${repoOwner}/${repoName}`,
      branch: branch || "main",
      autoDeploy: "yes",
      serviceDetails: {
        env: "node",
        region: "oregon",
        plan: plan || "starter",
        numInstances: 1,
        envSpecificDetails: {
          buildCommand: buildCommand || "npm install && npm run build",
          startCommand: startCommand || "npm start",
        },
      },
    };

    if (env && typeof env === "object") {
      (serviceBody.serviceDetails as Record<string, unknown>).envVars = Object.entries(env).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }

    console.log("Render create service payload:", JSON.stringify(serviceBody, null, 2));

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
      console.error("Render service creation error:", JSON.stringify(data, null, 2));
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
