import { NextRequest, NextResponse } from "next/server";

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
    const res = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Failed to create GitHub repo:", error);
    return NextResponse.json(
      { error: "Failed to create GitHub repo" },
      { status: 500 }
    );
  }
}
