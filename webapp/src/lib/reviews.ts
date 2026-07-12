import { prisma } from "@/lib/prisma";

// Spaced-repetition intervals: index = stage about to be entered.
// stage 0 -> first review due +7d; stage 1 -> +14d; stage 2 -> +21d.
// Completing the stage-2 review masters the problem.
export const REVIEW_INTERVAL_DAYS = [7, 14, 21] as const;
const MASTERED_STAGE = REVIEW_INTERVAL_DAYS.length;

export interface AcceptedSubmissionInfo {
  problemId: string;
  problemName: string;
  titleSlug: string;
  difficulty: string;
  url: string;
  submittedAt: Date;
}

export interface ReviewState {
  stage: number;
  mastered: boolean;
  firstSolvedAt: Date;
  lastSolvedAt: Date;
  nextReviewAt: Date | null;
}

function utcDay(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

// Pure transition — shared by the incremental ingest path and the bulk-sync
// replay so their semantics cannot diverge. Returns the new state, or null
// when the submission should not change anything.
export function applyAccepted(state: ReviewState | null, submittedAt: Date): ReviewState | null {
  if (!state) {
    return {
      stage: 0,
      mastered: false,
      firstSolvedAt: submittedAt,
      lastSolvedAt: submittedAt,
      nextReviewAt: addDays(submittedAt, REVIEW_INTERVAL_DAYS[0]),
    };
  }

  if (state.mastered || !state.nextReviewAt) return null;
  if (submittedAt < state.lastSolvedAt) return null; // out-of-order arrival
  if (utcDay(submittedAt) < utcDay(state.nextReviewAt)) return null; // early re-solve keeps schedule

  const newStage = state.stage + 1;
  if (newStage >= MASTERED_STAGE) {
    return {
      ...state,
      stage: newStage,
      mastered: true,
      lastSolvedAt: submittedAt,
      nextReviewAt: null,
    };
  }

  return {
    ...state,
    stage: newStage,
    lastSolvedAt: submittedAt,
    nextReviewAt: addDays(submittedAt, REVIEW_INTERVAL_DAYS[newStage]),
  };
}

export async function upsertReviewOnAccepted(userId: string, sub: AcceptedSubmissionInfo): Promise<void> {
  const existing = await prisma.problemReview.findUnique({
    where: { userId_titleSlug: { userId, titleSlug: sub.titleSlug } },
  });

  const next = applyAccepted(existing, sub.submittedAt);
  if (!next) return;

  await prisma.problemReview.upsert({
    where: { userId_titleSlug: { userId, titleSlug: sub.titleSlug } },
    update: {
      stage: next.stage,
      mastered: next.mastered,
      lastSolvedAt: next.lastSolvedAt,
      nextReviewAt: next.nextReviewAt,
    },
    create: {
      userId,
      titleSlug: sub.titleSlug,
      problemId: sub.problemId,
      problemName: sub.problemName,
      difficulty: sub.difficulty,
      url: sub.url,
      stage: next.stage,
      mastered: next.mastered,
      firstSolvedAt: next.firstSolvedAt,
      lastSolvedAt: next.lastSolvedAt,
      nextReviewAt: next.nextReviewAt,
    },
  });
}

// Replays the user's full Accepted history chronologically and upserts the
// final state per problem. Deterministic and idempotent — used after bulk
// history sync where items can arrive in any order.
export async function recalculateReviewsFromHistory(userId: string): Promise<void> {
  const accepted = await prisma.submission.findMany({
    where: {
      userId,
      status: "Accepted",
      NOT: [
        { problemId: "9999" },
        { problemName: { contains: "SRS Test", mode: "insensitive" as const } },
        { titleSlug: { startsWith: "srs-", mode: "insensitive" as const } },
      ],
    },
    orderBy: { submittedAt: "asc" },
    select: {
      problemId: true,
      problemName: true,
      titleSlug: true,
      difficulty: true,
      url: true,
      submittedAt: true,
    },
  });

  const states = new Map<string, { state: ReviewState; sub: (typeof accepted)[0] }>();
  for (const sub of accepted) {
    const entry = states.get(sub.titleSlug);
    const next = applyAccepted(entry?.state ?? null, sub.submittedAt);
    if (next) states.set(sub.titleSlug, { state: next, sub: entry?.sub ?? sub });
  }

  for (const [titleSlug, { state, sub }] of states) {
    await prisma.problemReview.upsert({
      where: { userId_titleSlug: { userId, titleSlug } },
      update: {
        stage: state.stage,
        mastered: state.mastered,
        firstSolvedAt: state.firstSolvedAt,
        lastSolvedAt: state.lastSolvedAt,
        nextReviewAt: state.nextReviewAt,
      },
      create: {
        userId,
        titleSlug,
        problemId: sub.problemId,
        problemName: sub.problemName,
        difficulty: sub.difficulty,
        url: sub.url,
        stage: state.stage,
        mastered: state.mastered,
        firstSolvedAt: state.firstSolvedAt,
        lastSolvedAt: state.lastSolvedAt,
        nextReviewAt: state.nextReviewAt,
      },
    });
  }
}
