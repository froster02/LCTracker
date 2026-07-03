import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await prisma.userStat.findUnique({
      where: { userId: session.user.id },
    });

    const totalSubmissions = await prisma.submission.count({
      where: { userId: session.user.id },
    });

    const acceptedSubmissions = await prisma.submission.count({
      where: { userId: session.user.id, status: "Accepted" },
    });

    const recentSubmissions = await prisma.submission.findMany({
      where: { userId: session.user.id },
      orderBy: { submittedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      stats: stats ?? {
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        currentStreak: 0,
        longestStreak: 0,
        acceptanceRate: 0,
      },
      totalSubmissions,
      acceptedSubmissions,
      recentSubmissions,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
