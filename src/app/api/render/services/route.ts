// Proxy: GET/POST /api/render/services
import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.render.com/v1";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const res = await fetch(`${BASE}/services${url.search}`, { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ error: `Non-JSON response from Render (${res.status}): ${text.slice(0, 200)}` }, { status: res.status || 502 });
    }
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-Render-Api-Key");
  if (!apiKey) return NextResponse.json({ error: "Missing Render API key" }, { status: 401 });
  try {
    const body = await request.json();
    const res = await fetch(`${BASE}/services`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ error: `Non-JSON response from Render (${res.status}): ${text.slice(0, 200)}` }, { status: res.status || 502 });
    }
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    return NextResponse.json(data, { status: 201 });
  } catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 }); }
}
