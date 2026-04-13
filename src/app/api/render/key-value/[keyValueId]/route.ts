import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.render.com/v1";

export async function GET(request: NextRequest, { params }: { params: Promise<{ keyValueId: string }> }) {
  const { keyValueId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}/key-value/${keyValueId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ keyValueId: string }> }) {
  const { keyValueId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const body = await request.json();
    const res = await fetch(`${BASE}/key-value/${keyValueId}`, { method: "PATCH", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ keyValueId: string }> }) {
  const { keyValueId } = await params;
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const res = await fetch(`${BASE}/key-value/${keyValueId}`, { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) { const d = await res.json().catch(() => ({ error: "Failed" })); return NextResponse.json(d, { status: res.status }); }
    return new NextResponse(null, { status: 204 });
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 }); }
}
