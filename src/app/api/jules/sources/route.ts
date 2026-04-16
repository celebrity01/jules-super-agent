import { NextRequest, NextResponse } from "next/server";

const JULES_BASE = "https://jules.googleapis.com/v1alpha";

/**
 * Build auth headers for Jules API.
 * Supports both API key and OAuth access token:
 * - If the key starts with "ya29." it's a Google OAuth token → Authorization: Bearer
 * - Otherwise it's an API key → X-Goog-Api-Key
 */
function buildAuthHeaders(key: string): Record<string, string> {
  if (key.startsWith("ya29.")) {
    return { "Authorization": `Bearer ${key}` };
  }
  return { "X-Goog-Api-Key": key };
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("X-Jules-Api-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key or OAuth token is required" }, { status: 401 });
  }

  try {
    const res = await fetch(`${JULES_BASE}/sources`, {
      headers: {
        ...buildAuthHeaders(apiKey),
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Failed to fetch sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}
