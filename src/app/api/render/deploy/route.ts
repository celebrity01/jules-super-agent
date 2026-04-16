import { NextRequest, NextResponse } from "next/server";

/**
 * Trigger a Render deploy.
 * Requires X-Render-Api-Key header and serviceId in body.
 * Docs: https://api-docs.render.com/reference/manual-deploy
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("X-Render-Api-Key");
  if (!token) {
    return NextResponse.json({ error: "Render API key is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { serviceId, commitId, clearCache } = body;

    if (!serviceId) {
      return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
    }

    const deployBody: Record<string, unknown> = {};
    if (commitId) deployBody.commitId = commitId;
    if (clearCache !== undefined) deployBody.clearCache = clearCache;

    const res = await fetch(
      `https://api.render.com/v1/services/${serviceId}/deploys`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deployBody),
      }
    );

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json(
        { error: `Non-JSON response from Render (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status || 502 }
      );
    }

    if (!res.ok) {
      console.error("Render deploy error:", data);
      return NextResponse.json(
        { error: data.message || `Failed to trigger deploy (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Render deploy failed:", error);
    return NextResponse.json(
      { error: "Failed to trigger Render deploy" },
      { status: 500 }
    );
  }
}
