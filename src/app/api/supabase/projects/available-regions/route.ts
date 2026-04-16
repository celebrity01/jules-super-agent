// Proxy: GET /api/supabase/projects/available-regions
import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.supabase.com/v1";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-Supabase-Access-Token");
  if (!apiKey) return NextResponse.json({ error: "Missing Supabase access token" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const res = await fetch(`${BASE}/projects/available-regions${url.search}`, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}
