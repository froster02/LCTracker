import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submissionSchema } from "@/lib/schemas";
import { recalculateUserStats } from "@/lib/stats";
import { upsertReviewOnAccepted } from "@/lib/reviews";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/request-auth";

function unauthorizedResponse(userId: string | "expired" | null) {
  if (userId === "expired") return NextResponse.json({ error: "api_key_expired" }, { status: 401 });
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const limit = rateLimitResponse(request, 60, 60 * 1000);
  if (!limit.success && limit.response) return limit.response;

  const userId = await getUserIdFromRequest(request);
  if (!userId || userId === "expired") return unauthorizedResponse(userId);

  try {
    const body = await request.json();
    const parsed = submissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Block test submissions (SRS Test, problemId: 9999, etc.)
    if (
      data.problemId === "9999" ||
      data.problemName.includes("SRS Test") ||
      data.titleSlug.startsWith("srs-")
    ) {
      return NextResponse.json(
        { error: "Test submissions are not allowed" },
        { status: 400 }
      );
    }

    // Deduplicate: check for same problem + same submittedAt (within 5 min)
    const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
    const fiveMinAgo = new Date(submittedAt.getTime() - 5 * 60 * 1000);

    const existing = await prisma.submission.findFirst({
      where: {
        userId,
        problemId: data.problemId,
        submittedAt: { gte: fiveMinAgo, lte: submittedAt },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, id: existing.id, duplicate: true });
    }

    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId: data.problemId,
        problemName: data.problemName,
        titleSlug: data.titleSlug,
        difficulty: data.difficulty,
        language: data.language,
        runtime: data.runtime ?? null,
        memory: data.memory ?? null,
        status: data.status,
        codeLength: data.codeLength ?? null,
        url: data.url,
        submittedAt,
      },
    });

    // Recalculate stats asynchronously (don't block response)
    recalculateUserStats(userId).catch(console.error);

    if (data.status === "Accepted") {
      upsertReviewOnAccepted(userId, {
        problemId: data.problemId,
        problemName: data.problemName,
        titleSlug: data.titleSlug,
        difficulty: data.difficulty,
        url: data.url,
        submittedAt,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const limit = rateLimitResponse(request, 120, 60 * 1000);
  if (!limit.success && limit.response) return limit.response;

  const userId = await getUserIdFromRequest(request);
  if (!userId || userId === "expired") return unauthorizedResponse(userId);

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageLimit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status");
    const difficulty = searchParams.get("difficulty");
    const language = searchParams.get("language");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = {
      userId,
      NOT: [
        { problemId: "9999" },
        { problemName: { contains: "SRS Test", mode: "insensitive" as const } },
        { titleSlug: { startsWith: "srs-", mode: "insensitive" as const } },
      ],
    };
    if (status) where.status = status;
    if (difficulty) where.difficulty = difficulty;
    if (language) where.language = language;
    if (from || to) {
      where.submittedAt = {};
      if (from) where.submittedAt.gte = new Date(from);
      if (to) where.submittedAt.lte = new Date(to);
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * pageLimit,
        take: pageLimit,
      }),
      prisma.submission.count({ where }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: { page, limit: pageLimit, total, pages: Math.ceil(total / pageLimit) },
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
