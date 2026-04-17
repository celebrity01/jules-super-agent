// Proxy: GET /api/github/repos/[owner]/[repo]/branches
// Fetches all branches for a given GitHub repository
import { NextRequest, NextResponse } from "next/server";
const BASE = "https://api.github.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const apiKey = request.headers.get("X-GitHub-Token");
  if (!apiKey) return NextResponse.json({ error: "Missing GitHub token" }, { status: 401 });

  try {
    const { owner, repo } = await params;
    // Fetch branches with pagination (100 per page)
    const allBranches: { name: string; commit: { sha: string }; protected: boolean }[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`${BASE}/repos/${owner}/${repo}/branches?per_page=100&page=${page}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "JulesSuperAgent",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: data.message || `Failed to fetch branches (${res.status})` },
          { status: res.status }
        );
      }

      const branches = await res.json();
      if (!Array.isArray(branches) || branches.length === 0) {
        hasMore = false;
      } else {
        allBranches.push(...branches);
        hasMore = branches.length === 100;
        page++;
      }
    }

    // Return simplified branch data
    const simplified = allBranches.map((b) => ({
      name: b.name,
      commit_sha: b.commit?.sha?.slice(0, 7) || "",
      protected: b.protected || false,
    }));

    return NextResponse.json(simplified);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
