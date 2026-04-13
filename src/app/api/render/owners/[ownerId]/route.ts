import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.render.com/v1";
export async function GET(request: NextRequest, { params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}/owners/${ownerId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 }); }
}
