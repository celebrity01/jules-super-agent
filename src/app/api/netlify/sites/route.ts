import { NextRequest, NextResponse } from "next/server";

/**
 * List Netlify sites for the authenticated user.
 * Requires X-Netlify-Token header.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("X-Netlify-Token");
  if (!token) {
    return NextResponse.json({ error: "Netlify access token is required" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://api.netlify.com/api/v1/sites?per_page=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || `Failed to fetch sites (${res.status})` },
        { status: res.status }
      );
    }

    // Return simplified site info
    const sites = Array.isArray(data)
      ? data.map((s: Record<string, unknown>) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          ssl_url: s.ssl_url,
          build_settings: s.build_settings,
        }))
      : [];

    return NextResponse.json(sites, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch Netlify sites:", error);
    return NextResponse.json(
      { error: "Failed to fetch Netlify sites" },
      { status: 500 }
    );
  }
}
