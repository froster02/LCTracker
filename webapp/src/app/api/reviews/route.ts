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
    const reviews = await prisma.problemReview.findMany({
      where: { userId },
      orderBy: [{ mastered: "asc" }, { nextReviewAt: "asc" }],
      select: {
        id: true,
        titleSlug: true,
        problemId: true,
        problemName: true,
        difficulty: true,
        url: true,
        stage: true,
        mastered: true,
        note: true,
        firstSolvedAt: true,
        lastSolvedAt: true,
        nextReviewAt: true,
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
