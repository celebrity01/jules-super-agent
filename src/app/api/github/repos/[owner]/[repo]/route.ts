// Proxy: GET /api/github/repos/[owner]/[repo]
import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.github.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const apiKey = request.headers.get("X-GitHub-Token");
  if (!apiKey) return NextResponse.json({ error: "Missing GitHub token" }, { status: 401 });
  try {
    const { owner, repo } = await params;
    const res = await fetch(`${BASE}/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "JulesSuperAgent" },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message || "Repository not found" }, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}
