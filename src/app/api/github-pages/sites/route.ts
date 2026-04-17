import { NextRequest, NextResponse } from "next/server";

/**
 * List GitHub repositories that have GitHub Pages enabled.
 * Requires X-GitHub-Token header.
 * Fetches user repos and checks each for Pages (limited to avoid rate limiting).
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("X-GitHub-Token");
  if (!token) {
    return NextResponse.json({ error: "GitHub token is required" }, { status: 401 });
  }

  try {
    // Fetch all user repos (sorted by most recently updated)
    const allRepos: {
      owner: { login: string };
      name: string;
      full_name: string;
      html_url: string;
      private: boolean;
    }[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "JulesSuperAgent",
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: errData.message || `Failed to fetch repos (${res.status})` },
          { status: res.status }
        );
      }

      const repos = await res.json();
      if (!Array.isArray(repos) || repos.length === 0) {
        hasMore = false;
      } else {
        allRepos.push(...repos);
        hasMore = repos.length === 100;
        page++;
      }
    }

    // Check the most recently updated repos for GitHub Pages (limit to first 30)
    const pagesSites: {
      id: string;
      name: string;
      url: string;
      repo: string;
      branch: string;
    }[] = [];
    const reposToCheck = allRepos.slice(0, 30);

    const checkPromises = reposToCheck.map(async (repo) => {
      try {
        const pagesRes = await fetch(
          `https://api.github.com/repos/${repo.owner.login}/${repo.name}/pages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "User-Agent": "JulesSuperAgent",
            },
          }
        );
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          return {
            id: `${repo.owner.login}/${repo.name}`,
            name: repo.full_name,
            url:
              pagesData.html_url ||
              `https://${repo.owner.login}.github.io/${repo.name}/`,
            repo: repo.full_name,
            branch: pagesData.source?.branch || "main",
          };
        }
        return null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(checkPromises);
    for (const result of results) {
      if (result) pagesSites.push(result);
    }

    return NextResponse.json(pagesSites);
  } catch (error) {
    console.error("Failed to list GitHub Pages sites:", error);
    return NextResponse.json(
      { error: "Failed to list GitHub Pages sites" },
      { status: 500 }
    );
  }
}
