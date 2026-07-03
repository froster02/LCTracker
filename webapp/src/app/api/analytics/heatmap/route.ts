import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubmissionHeatmap } from "@/lib/stats";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const heatmap = await getSubmissionHeatmap(
      session.user.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );

    return NextResponse.json({ heatmap });
  } catch (error) {
    console.error("Heatmap error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
