import { NextRequest, NextResponse } from "next/server";

/**
 * Trigger a Netlify deploy via API.
 * Requires X-Netlify-Token header and siteId in body.
 * Docs: https://open-api.netlify.com/#operation/createSiteDeploy
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("X-Netlify-Token");
  if (!token) {
    return NextResponse.json({ error: "Netlify access token is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { siteId, title, branch } = body;

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const deployBody: Record<string, unknown> = {};
    if (title) deployBody.title = title;
    if (branch) deployBody.branch = branch;

    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deployBody),
      }
    );

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json(
        { error: `Non-JSON response from Netlify (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status || 502 }
      );
    }

    if (!res.ok) {
      console.error("Netlify deploy error:", data);
      return NextResponse.json(
        { error: data.message || `Failed to trigger deploy (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Netlify deploy failed:", error);
    return NextResponse.json(
      { error: "Failed to trigger Netlify deploy" },
      { status: 500 }
    );
  }
}
