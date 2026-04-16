import { NextRequest, NextResponse } from "next/server";

/**
 * Create a new Netlify site linked to a GitHub repository.
 * Requires X-Netlify-Token header.
 * Body: { name, repoOwner, repoName, branch?, repoUrl? }
 *
 * Uses the Netlify API to create a site with a repo deploy hook.
 * Docs: https://open-api.netlify.com/#operation/createSite
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("X-Netlify-Token");
  if (!token) {
    return NextResponse.json({ error: "Netlify access token is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, repoOwner, repoName, branch, repoUrl } = body;

    if (!repoOwner || !repoName) {
      return NextResponse.json({ error: "repoOwner and repoName are required" }, { status: 400 });
    }

    // Create a new Netlify site linked to the GitHub repo
    const siteBody: Record<string, unknown> = {
      name: name || repoName,
      repo: {
        provider: "github",
        repo: `${repoOwner}/${repoName}`,
        branch: branch || "main",
        cmd: "npm run build",
        dir: "out",
      },
    };

    if (repoUrl) {
      (siteBody.repo as Record<string, unknown>).repo_url = repoUrl;
    }

    const res = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(siteBody),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json(
        { error: `Non-JSON response from Netlify (${res.status}): ${text.slice(0, 200)}` },
        { status: res.status }
      );
    }

    if (!res.ok) {
      console.error("Netlify site creation error:", data);
      return NextResponse.json(
        { error: data.message || `Failed to create site (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      url: data.ssl_url || data.url,
      deploy_url: data.deploy_url,
    }, { status: 201 });
  } catch (error) {
    console.error("Netlify site creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create Netlify site" },
      { status: 500 }
    );
  }
}
