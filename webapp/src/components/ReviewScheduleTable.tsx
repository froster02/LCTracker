"use client";

import { Badge } from "@/components/ui/badge";

export interface ReviewItem {
  id: string;
  titleSlug: string;
  problemName: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  stage: number;
  mastered: boolean;
  firstSolvedAt: string;
  lastSolvedAt: string;
  nextReviewAt: string | null;
}

const STAGE_LABELS = ["Stage 0", "Stage 1", "Stage 2", "Mastered"];
const INTERVALS = [7, 14, 21];

function fmt(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// Column i shows: "Done" for completed stages, the stored nextReviewAt for
// the current stage (bold), and a projection for later stages assuming each
// review is done exactly on its due date.
function stageDates(item: ReviewItem): string[] {
  if (item.mastered || !item.nextReviewAt) return INTERVALS.map(() => "Done");

  const next = new Date(item.nextReviewAt);
  return INTERVALS.map((_, i) => {
    if (i < item.stage) return "Done";
    if (i === item.stage) return fmt(next);
    let projected = next;
    for (let k = item.stage + 1; k <= i; k++) projected = addDays(projected, INTERVALS[k]);
    return fmt(projected);
  });
}

export function ReviewScheduleTable({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No solved problems yet. Solve a problem on LeetCode to start your review schedule.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 font-medium">Problem</th>
            <th className="px-4 py-3 font-medium">Difficulty</th>
            <th className="px-4 py-3 font-medium">Stage</th>
            <th className="px-4 py-3 font-medium">1st Review (+7d)</th>
            <th className="px-4 py-3 font-medium">2nd Review (+14d)</th>
            <th className="px-4 py-3 font-medium">3rd Review (+21d)</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => {
            const dates = stageDates(r);
            return (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {r.problemName}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${
                    r.difficulty === "Easy" ? "text-green-600 dark:text-green-400" : r.difficulty === "Medium" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"
                  }`}>
                    {r.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3">{STAGE_LABELS[Math.min(r.stage, 3)]}</td>
                {dates.map((d, i) => (
                  <td key={i} className={`px-4 py-3 ${!r.mastered && i === r.stage ? "font-semibold" : ""}`}>
                    {d}
                  </td>
                ))}
                <td className="px-4 py-3">
                  {r.mastered ? (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Mastered
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">In progress</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
