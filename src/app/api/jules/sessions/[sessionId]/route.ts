import { NextRequest, NextResponse } from "next/server";

const JULES_BASE = "https://jules.googleapis.com/v1alpha";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const apiKey = req.headers.get("X-Jules-Api-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "OAuth token is required" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const name = sessionId.includes("/") ? sessionId : `sessions/${sessionId}`;
    const res = await fetch(`${JULES_BASE}/${name}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
