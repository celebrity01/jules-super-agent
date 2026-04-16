import { NextRequest, NextResponse } from "next/server";

/**
 * List Vercel projects for the authenticated user.
 * Requires X-Vercel-Token header.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("X-Vercel-Token");
  if (!token) {
    return NextResponse.json({ error: "Vercel token is required" }, { status: 401 });
  }

  try {
    const res = await fetch("https://api.vercel.com/v2/projects", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
        { error: data.error?.message || `Failed to fetch projects (${res.status})` },
        { status: res.status }
      );
    }

    const projects = Array.isArray(data)
      ? data.map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          link: p.link,
        }))
      : (data.projects || []).map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          link: p.link,
        }));

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch Vercel projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch Vercel projects" },
      { status: 500 }
    );
  }
}
