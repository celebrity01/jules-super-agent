import { NextRequest, NextResponse } from "next/server";

const JULES_BASE = "https://jules.googleapis.com/v1alpha";

function buildAuthHeaders(key: string): Record<string, string> {
  if (key.startsWith("ya29.")) {
    return { "Authorization": `Bearer ${key}` };
  }
  return { "X-Goog-Api-Key": key };
}

export async function GET(
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
    const { searchParams } = new URL(req.url);
    const pageSize = searchParams.get("pageSize") || "50";
    const pageToken = searchParams.get("pageToken") || "";

    let url = `${JULES_BASE}/${name}/activities?pageSize=${pageSize}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const res = await fetch(url, {
      headers: {
        ...buildAuthHeaders(apiKey),
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
