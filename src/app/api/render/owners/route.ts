import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.render.com/v1";
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const res = await fetch(`${BASE}/owners${url.search}`, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 }); }
}
