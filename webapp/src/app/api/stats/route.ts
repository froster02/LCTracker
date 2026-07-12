import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const testSubmissionsFilter = {
      NOT: [
        { problemId: "9999" },
        { problemName: { contains: "SRS Test", mode: "insensitive" as const } },
        { titleSlug: { startsWith: "srs-", mode: "insensitive" as const } },
      ],
    };

    const [stats, totalSubmissions, acceptedSubmissions, recentSubmissions] = await Promise.all([
      prisma.userStat.findUnique({ where: { userId: session.user.id } }),
      prisma.submission.count({ where: { userId: session.user.id, ...testSubmissionsFilter } }),
      prisma.submission.count({ where: { userId: session.user.id, status: "Accepted", ...testSubmissionsFilter } }),
      prisma.submission.findMany({
        where: { userId: session.user.id, ...testSubmissionsFilter },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
    ]);

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
