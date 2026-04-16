import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch all GitHub repos for the authenticated user with pagination support.
 * Supports optional `search` query parameter for server-side filtering.
 * Fetches ALL repos by paginating through the GitHub API.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("X-GitHub-Token");
  if (!token) {
    return NextResponse.json(
      { error: "GitHub token is required" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const perPage = 100;
    let page = 1;
    let allRepos: Record<string, unknown>[] = [];
    let hasMore = true;

    // Paginate through all repos
    while (hasMore) {
      const res = await fetch(
        `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&type=all&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const text = await res.text();
        let errorData;
        try { errorData = JSON.parse(text); } catch { errorData = { message: text.slice(0, 200) }; }
        return NextResponse.json(
          { error: errorData.message || `GitHub API error (${res.status})` },
          { status: res.status }
        );
      }

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        return NextResponse.json(
          { error: "Invalid JSON from GitHub API" },
          { status: 502 }
        );
      }

      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
      } else {
        allRepos = allRepos.concat(data);
        // If we got fewer than perPage, we've reached the end
        if (data.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // Server-side search filter if requested
    if (search) {
      const searchLower = search.toLowerCase();
      allRepos = allRepos.filter((r) => {
        const name = ((r.name as string) || "").toLowerCase();
        const fullName = ((r.full_name as string) || "").toLowerCase();
        const desc = ((r.description as string) || "").toLowerCase();
        return name.includes(searchLower) || fullName.includes(searchLower) || desc.includes(searchLower);
      });
    }

    return NextResponse.json(allRepos, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch GitHub repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub repos" },
      { status: 500 }
    );
  }
}
