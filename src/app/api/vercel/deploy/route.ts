import { NextRequest, NextResponse } from "next/server";

/**
 * Trigger a Vercel deploy.
 * Requires X-Vercel-Token header and projectId in body.
 * Uses deploy hooks or the v13/deployments endpoint.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("X-Vercel-Token");
  if (!token) {
    return NextResponse.json({ error: "Vercel token is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { projectId, branch, deployHookUrl } = body;

    // If a deploy hook URL is provided, use it directly
    if (deployHookUrl) {
      const res = await fetch(deployHookUrl, { method: "POST" });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { success: true }; }
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message || `Deploy hook failed (${res.status})` },
          { status: res.status }
        );
      }
      return NextResponse.json(data, { status: 200 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "projectId or deployHookUrl is required" }, { status: 400 });
    }

    // Create a deployment via Vercel API
    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        gitSource: branch ? { ref: branch, type: "github" } : undefined,
      }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json(
        { error: `Non-JSON response from Vercel (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status || 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || `Failed to trigger deploy (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Vercel deploy failed:", error);
    return NextResponse.json(
      { error: "Failed to trigger Vercel deploy" },
      { status: 500 }
    );
  }
}
