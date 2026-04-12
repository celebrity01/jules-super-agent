import { NextRequest, NextResponse } from "next/server";

const JULES_BASE = "https://jules.googleapis.com/v1alpha";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const apiKey = req.headers.get("X-Jules-Api-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const res = await fetch(
      `${JULES_BASE}/sessions/${sessionId}:approvePlan`,
      {
        method: "POST",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to approve plan:", error);
    return NextResponse.json(
      { error: "Failed to approve plan" },
      { status: 500 }
    );
  }
}
