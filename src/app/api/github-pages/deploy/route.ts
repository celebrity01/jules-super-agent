import { NextRequest, NextResponse } from "next/server";

/**
 * Deploy to GitHub Pages.
 * Requires X-GitHub-Token header.
 * If Pages is already enabled, updates the source branch and triggers a rebuild.
 * If Pages is not enabled, enables it with the specified branch.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("X-GitHub-Token");
  if (!token) {
    return NextResponse.json(
      { error: "GitHub token is required" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { repoOwner, repoName, branch } = body;

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: "repoOwner and repoName are required" },
        { status: 400 }
      );
    }

    const ghHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "JulesSuperAgent",
    };

    // Check if GitHub Pages is already enabled on this repo
    const checkRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pages`,
      { headers: ghHeaders }
    );

    if (checkRes.status === 200) {
      // Pages is already enabled — update source branch if needed, then trigger a build
      const pagesData = await checkRes.json();
      const currentBranch = pagesData.source?.branch;

      // Update the source branch if a different branch was specified
      if (branch && branch !== currentBranch) {
        const updateRes = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/pages`,
          {
            method: "PUT",
            headers: ghHeaders,
            body: JSON.stringify({
              source: { branch, path: "/" },
            }),
          }
        );

        if (!updateRes.ok) {
          const errData = await updateRes.json().catch(() => ({}));
          return NextResponse.json(
            {
              error:
                errData.message ||
                `Failed to update Pages source (${updateRes.status})`,
            },
            { status: updateRes.status }
          );
        }
      }

      // Trigger a Pages build
      const buildRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/pages/builds`,
        {
          method: "POST",
          headers: ghHeaders,
        }
      );

      if (!buildRes.ok) {
        const errData = await buildRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            error:
              errData.message ||
              `Failed to trigger Pages build (${buildRes.status})`,
          },
          { status: buildRes.status }
        );
      }

      const buildData = await buildRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          ...buildData,
          pagesUrl: pagesData.html_url,
          status: "build_triggered",
          message: `GitHub Pages build triggered for ${repoOwner}/${repoName} on branch ${branch || currentBranch || "default"}`,
        },
        { status: 200 }
      );
    } else if (checkRes.status === 404) {
      // Pages is not enabled — enable it
      const enableRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/pages`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({
            source: { branch: branch || "main", path: "/" },
            build_type: "workflow",
          }),
        }
      );

      if (!enableRes.ok) {
        const errText = await enableRes.text();
        let errData;
        try {
          errData = JSON.parse(errText);
        } catch {
          errData = { message: errText.slice(0, 200) };
        }
        return NextResponse.json(
          {
            error:
              errData.message ||
              `Failed to enable GitHub Pages (${enableRes.status})`,
          },
          { status: enableRes.status }
        );
      }

      const enableData = await enableRes.json();
      return NextResponse.json(
        {
          ...enableData,
          pagesUrl: enableData.html_url || `https://${repoOwner}.github.io/${repoName}/`,
          status: "pages_enabled",
          message: `GitHub Pages enabled for ${repoOwner}/${repoName} on branch ${branch || "main"}`,
        },
        { status: 200 }
      );
    } else {
      const errData = await checkRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            errData.message ||
            `Failed to check Pages status (${checkRes.status})`,
        },
        { status: checkRes.status }
      );
    }
  } catch (error) {
    console.error("GitHub Pages deploy failed:", error);
    return NextResponse.json(
      { error: "Failed to deploy to GitHub Pages" },
      { status: 500 }
    );
  }
}
