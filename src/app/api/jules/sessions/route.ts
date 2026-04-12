import { NextRequest, NextResponse } from "next/server";

const JULES_BASE = "https://jules.googleapis.com/v1alpha";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("X-Jules-Api-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const pageSize = searchParams.get("pageSize") || "10";
    const pageToken = searchParams.get("pageToken") || "";

    let url = `${JULES_BASE}/sessions?pageSize=${pageSize}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("X-Jules-Api-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${JULES_BASE}/sessions`, {
      method: "POST",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
