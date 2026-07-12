import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/request-auth";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limit = rateLimitResponse(request, 120, 60 * 1000);
  if (!limit.success && limit.response) return limit.response;

  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Anything scheduled up to the end of today (UTC) counts as due,
    // including overdue reviews from missed days.
    const todayUtc = new Date().toISOString().split("T")[0];
    const endOfTodayUtc = new Date(`${todayUtc}T23:59:59.999Z`);

    const due = await prisma.problemReview.findMany({
      where: { userId, mastered: false, nextReviewAt: { lte: endOfTodayUtc } },
      orderBy: { nextReviewAt: "asc" },
      select: {
        titleSlug: true,
        problemName: true,
        difficulty: true,
        url: true,
        stage: true,
        nextReviewAt: true,
      },
    });

    return NextResponse.json({ count: due.length, due });
  } catch (error) {
    console.error("Get due reviews error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
