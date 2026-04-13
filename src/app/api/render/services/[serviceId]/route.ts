// Proxy: GET/PATCH/DELETE /api/render/services/[serviceId]
import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.render.com/v1";

export async function GET(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}/services/${serviceId}`, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const body = await request.json();
    const res = await fetch(`${BASE}/services/${serviceId}`, { method: "PATCH", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}/services/${serviceId}`, { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
    if (!res.ok) { const data = await res.json().catch(() => ({ error: "Request failed" })); return NextResponse.json(data, { status: res.status }); }
    return new NextResponse(null, { status: 204 });
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}
