import { NextRequest, NextResponse } from "next/server";

const JULES_BASE = "https://jules.googleapis.com/v1alpha";

function buildAuthHeaders(key: string): Record<string, string> {
  if (key.startsWith("ya29.")) {
    return { "Authorization": `Bearer ${key}` };
  }
  return { "X-Goog-Api-Key": key };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const apiKey = req.headers.get("X-Jules-Api-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key or OAuth token is required" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const name = sessionId.includes("/") ? sessionId : `sessions/${sessionId}`;
    const body = await req.json();
    const res = await fetch(
      `${JULES_BASE}/${name}:addMessage`,
      {
        method: "POST",
        headers: {
          ...buildAuthHeaders(apiKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    // addMessage returns empty body on success
    const text = await res.text();
    if (!text) {
      return NextResponse.json({ success: true }, { status: res.status });
    }
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ success: true }, { status: res.status });
    }
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
