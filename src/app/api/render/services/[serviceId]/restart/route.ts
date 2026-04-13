import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.render.com/v1";
export async function POST(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}/services/${serviceId}/restart`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) { const d = await res.json().catch(() => ({ error: "Failed" })); return NextResponse.json(d, { status: res.status }); }
    return new NextResponse(null, { status: 204 });
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 }); }
}
