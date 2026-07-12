import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const difficulty = searchParams.get("difficulty");
    const language = searchParams.get("language");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") ?? "500", 10)));

    const where: any = { userId: session.user.id };
    if (status) where.status = status;
    if (difficulty) where.difficulty = difficulty;
    if (language) where.language = language;
    if (from || to) {
      where.submittedAt = {};
      if (from) where.submittedAt.gte = new Date(from);
      if (to) where.submittedAt.lte = new Date(to);
    }

    const problems = await prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      take: limit,
      select: {
        id: true,
        problemId: true,
        problemName: true,
        titleSlug: true,
        difficulty: true,
        language: true,
        status: true,
        runtime: true,
        memory: true,
        url: true,
        submittedAt: true,
      },
    });

    return NextResponse.json({ problems });
  } catch (error) {
    console.error("Problems route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
