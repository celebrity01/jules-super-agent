import { NextRequest, NextResponse } from "next/server";

const JULES_BASE = "https://jules.googleapis.com/v1alpha";

function buildAuthHeaders(key: string): Record<string, string> {
  if (key.startsWith("ya29.") || key.startsWith("1//")) {
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

    console.log(`[addMessage] Session: ${name}, Body keys:`, Object.keys(body));

    // The Jules API :addMessage expects { "userMessage": "text" }
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

    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { error: errorText }; }
      console.error("[addMessage] API error:", res.status, errorData);
      return NextResponse.json(
        { error: errorData?.error?.message || errorData?.error || `Failed to send message (${res.status})` },
        { status: res.status }
      );
    }

    // addMessage returns empty body on success
    const text = await res.text();
    if (!text) {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: 200 });
    } catch {
      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
