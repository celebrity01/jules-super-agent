// Proxy: POST /api/supabase/projects/[ref]/restore — Restore a project
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.supabase.com/v1";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const accessToken = request.headers.get("X-Supabase-Access-Token");
  if (!accessToken) {
    return NextResponse.json({ error: "Missing Supabase access token" }, { status: 401 });
  }

  try {
    const res = await fetch(`${BASE}/projects/${ref}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Restore failed" }));
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
