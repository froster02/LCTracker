import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateUserStats } from "@/lib/stats";
import { recalculateReviewsFromHistory } from "@/lib/reviews";
import { validateApiKey } from "@/lib/api-keys";
import { z } from "zod";
import crypto from "crypto";

const syncItemSchema = z.object({
  problemId: z.string().min(1),
  problemName: z.string().min(1),
  titleSlug: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  language: z.string().optional().default("Unknown"),
  status: z.enum(["Accepted", "Wrong Answer", "Time Limit Exceeded", "Memory Limit Exceeded", "Runtime Error", "Compile Error", "Output Limit Exceeded", "Pending", "Rejected"]).optional().default("Accepted"),
  url: z.string().url().optional(),
  submittedAt: z.string().datetime().optional(),
});

const syncBodySchema = z.object({
  submissions: z.array(syncItemSchema).max(1000),
});

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  // Try API key first (for extension)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const valid = await validateApiKey(keyHash);
    if (valid) return valid.userId;
  }

  // Try session cookie (for dashboard)
  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {
    // auth() may throw if no session
  }

  return null;
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
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

    const items = parsed.data.submissions;

    const created = [];
    const skipped = [];

    for (const item of items) {
      const submittedAt = item.submittedAt ? new Date(item.submittedAt) : new Date();
      const fiveMinAgo = new Date(submittedAt.getTime() - 5 * 60 * 1000);

      const existing = await prisma.submission.findFirst({
        where: {
          userId,
          problemId: item.problemId,
          submittedAt: { gte: fiveMinAgo, lte: submittedAt },
        },
      });

      if (existing) {
        skipped.push(item.problemId);
        continue;
      }

      const submission = await prisma.submission.create({
        data: {
          userId,
          problemId: item.problemId,
          problemName: item.problemName,
          titleSlug: item.titleSlug,
          difficulty: item.difficulty,
          language: item.language,
          status: item.status,
          url: item.url ?? `https://leetcode.com/problems/${item.titleSlug}/`,
          submittedAt,
        },
      });
      created.push(submission.id);
    }

    await recalculateUserStats(userId);
    await recalculateReviewsFromHistory(userId);

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
