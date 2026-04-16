import { NextRequest, NextResponse } from "next/server";

/**
 * Create a new Vercel project linked to a GitHub repository.
 * Requires X-Vercel-Token header.
 * Body: { name, repoOwner, repoName, branch? }
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("X-Vercel-Token");
  if (!token) {
    return NextResponse.json({ error: "Vercel token is required" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, repoOwner, repoName, branch } = body;

    if (!repoOwner || !repoName) {
      return NextResponse.json({ error: "repoOwner and repoName are required" }, { status: 400 });
    }

    const projectBody: Record<string, unknown> = {
      name: name || repoName,
      gitRepository: {
        type: "github",
        repo: `${repoOwner}/${repoName}`,
      },
    };

    if (branch) {
      (projectBody.gitRepository as Record<string, unknown>).productionBranch = branch;
    }

    const res = await fetch("https://api.vercel.com/v9/projects", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectBody),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || `Failed to create project (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Vercel project creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create Vercel project" },
      { status: 500 }
    );
  }
}
