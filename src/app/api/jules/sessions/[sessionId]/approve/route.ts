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

    // Try to read body for optional planId
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // No body, that's fine
    }

    const requestBody: Record<string, unknown> = {};
    if (body.planId) {
      requestBody.planId = body.planId;
    }

    const res = await fetch(
      `${JULES_BASE}/${name}:approvePlan`,
      {
        method: "POST",
        headers: {
          ...buildAuthHeaders(apiKey),
          "Content-Type": "application/json",
        },
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { error: errorText }; }
      console.error("Approve plan API error:", res.status, errorData);
      return NextResponse.json(
        { error: errorData?.error?.message || errorData?.error || `Failed to approve plan (${res.status})` },
        { status: res.status }
      );
    }

    // approvePlan returns empty body on success
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
    console.error("Failed to approve plan:", error);
    return NextResponse.json(
      { error: "Failed to approve plan" },
      { status: 500 }
    );
  }
}
