import { prisma } from "@/lib/prisma";

export async function recalculateUserStats(userId: string): Promise<void> {
  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      NOT: [
        { problemId: "9999" },
        { problemName: { contains: "SRS Test", mode: "insensitive" as const } },
        { titleSlug: { startsWith: "srs-", mode: "insensitive" as const } },
      ],
    },
    select: { problemId: true, status: true, difficulty: true, submittedAt: true },
    orderBy: { submittedAt: "asc" },
  });

  const acceptedSubmissions = submissions.filter((s) => s.status === "Accepted");
  const uniqueAccepted = new Map<string, typeof acceptedSubmissions[0]>();
  for (const s of acceptedSubmissions) {
    const key = `${s.problemId}`;
    if (!uniqueAccepted.has(key)) {
      uniqueAccepted.set(key, s);
    }
  }

  const uniqueSolved = Array.from(uniqueAccepted.values());
  const totalSolved = uniqueSolved.length;
  const easySolved = uniqueSolved.filter((s) => s.difficulty === "Easy").length;
  const mediumSolved = uniqueSolved.filter((s) => s.difficulty === "Medium").length;
  const hardSolved = uniqueSolved.filter((s) => s.difficulty === "Hard").length;

  // Streak calculation
  const acceptedDates = acceptedSubmissions
    .map((s) => s.submittedAt.toISOString().split("T")[0])
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort();

  const { currentStreak, longestStreak, lastSubmissionDate } = calculateStreaks(acceptedDates);

  // Acceptance rate
  const acceptanceRate = submissions.length > 0
    ? Math.round((acceptedSubmissions.length / submissions.length) * 100)
    : 0;

  await prisma.userStat.upsert({
    where: { userId },
    update: {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      currentStreak,
      longestStreak,
      lastSubmissionDate: lastSubmissionDate ? new Date(lastSubmissionDate) : null,
      acceptanceRate,
    },
    create: {
      userId,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      currentStreak,
      longestStreak,
      lastSubmissionDate: lastSubmissionDate ? new Date(lastSubmissionDate) : null,
      acceptanceRate,
    },
  });
}

function calculateStreaks(dates: string[]): { currentStreak: number; longestStreak: number; lastSubmissionDate: string | null } {
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastSubmissionDate: null };
  }

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  let lastDate: string | null = null;

  for (const date of dates) {
    if (lastDate) {
      const last = new Date(lastDate);
      const curr = new Date(date);
      const diff = (curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    } else {
      streak = 1;
    }
    lastDate = date;
  }

  longestStreak = Math.max(longestStreak, streak);

  const lastDateStr = dates[dates.length - 1];
  if (lastDateStr === today || lastDateStr === yesterdayStr) {
    currentStreak = streak;
  } else {
    currentStreak = 0;
  }

  return { currentStreak, longestStreak, lastSubmissionDate: lastDateStr };
}

export async function getSubmissionHeatmap(userId: string, from?: Date, to?: Date): Promise<Record<string, number>> {
  const where: { userId: string; submittedAt?: { gte?: Date; lte?: Date } } = { userId };
  if (from || to) {
    where.submittedAt = {};
    if (from) where.submittedAt.gte = from;
    if (to) where.submittedAt.lte = to;
  }

  const submissions = await prisma.submission.findMany({
    where,
    select: { submittedAt: true },
  });

  const heatmap: Record<string, number> = {};
  for (const s of submissions) {
    const date = s.submittedAt.toISOString().split("T")[0];
    heatmap[date] = (heatmap[date] || 0) + 1;
  }
  return heatmap;
}

export async function getLanguageDistribution(userId: string): Promise<{ language: string; count: number }[]> {
  const rows = await prisma.submission.groupBy({
    by: ["language"],
    where: { userId, status: "Accepted" },
    _count: { language: true },
  });
  return rows
    .map((r) => ({ language: r.language, count: r._count.language }))
    .sort((a, b) => b.count - a.count);
}

export async function getMonthlyActivity(userId: string): Promise<{ month: string; count: number }[]> {
  // groupBy on a date-derived field isn't directly supported by Prisma — fetch
  // only submittedAt and aggregate in JS (still avoids pulling all columns).
  const rows = await prisma.submission.findMany({
    where: { userId, status: "Accepted" },
    select: { submittedAt: true },
  });
  const counts: Record<string, number> = {};
  for (const s of rows) {
    const month = s.submittedAt.toISOString().slice(0, 7);
    counts[month] = (counts[month] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getPerformanceTrends(userId: string, limit: number = 100): Promise<{ problemId: string; problemName: string; runtime: number | null; memory: number | null; submittedAt: Date }[]> {
  return prisma.submission.findMany({
    where: { userId, status: "Accepted", runtime: { not: null } },
    orderBy: { submittedAt: "desc" },
    take: limit,
    select: {
      problemId: true,
      problemName: true,
      runtime: true,
      memory: true,
      submittedAt: true,
    },
  });
}
