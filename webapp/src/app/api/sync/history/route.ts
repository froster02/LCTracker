import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateUserStats } from "@/lib/stats";
import { recalculateReviewsFromHistory } from "@/lib/reviews";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getUserIdFromRequest } from "@/lib/request-auth";
import { z } from "zod";

const syncItemSchema = z.object({
  problemId: z.string().min(1),
  problemName: z.string().min(1),
  titleSlug: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  language: z.string().optional().default("Unknown"),
  status: z
    .enum([
      "Accepted",
      "Wrong Answer",
      "Time Limit Exceeded",
      "Memory Limit Exceeded",
      "Runtime Error",
      "Compile Error",
      "Output Limit Exceeded",
      "Pending",
      "Rejected",
    ])
    .optional()
    .default("Accepted"),
  url: z.string().url().optional(),
  submittedAt: z.string().datetime().optional(),
});

const syncBodySchema = z.object({
  submissions: z.array(syncItemSchema).max(1000),
});

export async function POST(request: Request) {
  const limit = rateLimitResponse(request, 5, 60 * 1000);
  if (!limit.success && limit.response) return limit.response;

  const userId = await getUserIdFromRequest(request);
  if (userId === "expired") {
    return NextResponse.json({ error: "api_key_expired" }, { status: 401 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = syncBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid sync data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const items = parsed.data.submissions.filter(
      (item) =>
        item.problemId !== "9999" &&
        !item.problemName.includes("SRS Test") &&
        !item.titleSlug.startsWith("srs-")
    );

    if (items.length === 0) {
      return NextResponse.json({ success: true, created: 0, skipped: 0 });
    }

    // Batch dedup: fetch all existing submissions for this user in one query,
    // then diff in memory rather than one findFirst per item.
    const problemIds = [...new Set(items.map((i) => i.problemId))];
    const earliest = items.reduce<Date>((min, i) => {
      const d = i.submittedAt ? new Date(i.submittedAt) : new Date();
      return d < min ? d : min;
    }, new Date());
    const windowStart = new Date(earliest.getTime() - 5 * 60 * 1000);

    const existing = await prisma.submission.findMany({
      where: { userId, problemId: { in: problemIds }, submittedAt: { gte: windowStart } },
      select: { problemId: true, submittedAt: true },
    });

    // Build a Set of "problemId:timestamp-bucket" keys for O(1) lookup
    const existingKeys = new Set(
      existing.map((e) => `${e.problemId}:${Math.floor(e.submittedAt.getTime() / (5 * 60 * 1000))}`)
    );

    const toCreate = items.filter((item) => {
      const ts = item.submittedAt ? new Date(item.submittedAt) : new Date();
      const bucket = Math.floor(ts.getTime() / (5 * 60 * 1000));
      return !existingKeys.has(`${item.problemId}:${bucket}`);
    });

    if (toCreate.length > 0) {
      await prisma.submission.createMany({
        data: toCreate.map((item) => ({
          userId,
          problemId: item.problemId,
          problemName: item.problemName,
          titleSlug: item.titleSlug,
          difficulty: item.difficulty,
          language: item.language,
          status: item.status,
          url: item.url ?? `https://leetcode.com/problems/${item.titleSlug}/`,
          submittedAt: item.submittedAt ? new Date(item.submittedAt) : new Date(),
        })),
        skipDuplicates: true,
      });
    }

    await recalculateUserStats(userId);
    await recalculateReviewsFromHistory(userId);

    return NextResponse.json({
      success: true,
      created: toCreate.length,
      skipped: items.length - toCreate.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
