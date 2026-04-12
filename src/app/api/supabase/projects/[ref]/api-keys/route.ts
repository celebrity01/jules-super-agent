// Proxy: GET /api/supabase/projects/[ref]/api-keys — Get project API keys
import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.supabase.com/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const accessToken = request.headers.get("X-Supabase-Access-Token");
  if (!accessToken) {
    return NextResponse.json({ error: "Missing Supabase access token" }, { status: 401 });
  }

  try {
    const res = await fetch(`${BASE}/projects/${ref}/api-keys`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
