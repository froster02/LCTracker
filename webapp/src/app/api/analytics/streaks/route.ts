import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await prisma.userStat.findUnique({
      where: { userId: session.user.id },
    });

    if (!stats) {
      return NextResponse.json({ currentStreak: 0, longestStreak: 0 });
    }

    return NextResponse.json({
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastSubmissionDate: stats.lastSubmissionDate?.toISOString().split("T")[0] ?? null,
    });
  } catch (error) {
    console.error("Streaks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
