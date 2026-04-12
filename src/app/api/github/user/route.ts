import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("X-GitHub-Token");
  if (!token) {
    return NextResponse.json(
      { error: "GitHub token is required" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch GitHub user:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub user" },
      { status: 500 }
    );
  }
}
