import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPerformanceTrends } from "@/lib/stats";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

    const trends = await getPerformanceTrends(session.user.id, limit);
    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Performance trends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
