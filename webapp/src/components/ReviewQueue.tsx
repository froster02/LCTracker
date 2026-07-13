"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StageDots } from "@/components/StageDots";
import type { ReviewItem } from "@/components/ReviewScheduleTable";

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-green-600 dark:text-green-400",
  Medium: "text-amber-600 dark:text-amber-400",
  Hard: "text-red-600 dark:text-red-400",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dueText(nextReviewAt: string, today: string): { label: string; overdue: boolean } {
  const dueDay = nextReviewAt.split("T")[0];
  if (dueDay === today) return { label: "due today", overdue: false };
  const days = Math.round(
    (new Date(today).getTime() - new Date(dueDay).getTime()) / DAY_MS
  );
  return { label: `${days} day${days > 1 ? "s" : ""} overdue`, overdue: true };
}

export function ReviewQueue({ reviews }: { reviews: ReviewItem[] }) {
  const today = new Date().toISOString().split("T")[0];

  const dueProblems = useMemo(() => {
    return reviews
      .filter((r) => !r.mastered && r.nextReviewAt && r.nextReviewAt.split("T")[0] <= today)
      .sort(
        (a, b) =>
          new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime()
      );
  }, [reviews, today]);

  const overdueCount = useMemo(
    () => dueProblems.filter((r) => r.nextReviewAt!.split("T")[0] < today).length,
    [dueProblems, today]
  );

  const nextUpcoming = useMemo(() => {
    const upcoming = reviews
      .filter((r) => !r.mastered && r.nextReviewAt && r.nextReviewAt.split("T")[0] > today)
      .sort(
        (a, b) =>
          new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime()
      );
    return upcoming[0]?.nextReviewAt ?? null;
  }, [reviews, today]);

  return (
    <Card className={dueProblems.length > 0 ? "border-primary/20 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_0_30px_rgba(245,158,11,0.08)]" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2">
          <span className="text-base font-semibold tracking-tight">
            Today&apos;s Reviews
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {dueProblems.length} due
            {overdueCount > 0 && (
              <span className="ml-1.5 font-medium text-primary">
                · {overdueCount} overdue
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dueProblems.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium">Nothing due today 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {nextUpcoming
                ? `Next review ${new Date(nextUpcoming).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`
                : "Solve a problem on LeetCode to start your review schedule."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dueProblems.slice(0, 20).map((r) => {
              const due = dueText(r.nextReviewAt!, today);
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-white/15 ${
                    due.overdue ? "border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline"
                    >
                      {r.problemName}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className={DIFFICULTY_COLORS[r.difficulty]}>
                        {r.difficulty}
                      </span>
                      <StageDots stage={r.stage} mastered={false} showLabels={false} />
                      <span className={due.overdue ? "font-medium text-primary" : ""}>
                        {due.overdue && <span aria-hidden>⏰ </span>}
                        {due.label}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-11 shrink-0 px-5 glow-amber-hover active:scale-[0.98]"
                    onClick={() => window.open(r.url, "_blank")}
                  >
                    Solve
                  </Button>
                </div>
              );
            })}
            {dueProblems.length > 20 && (
              <p className="text-center text-sm text-muted-foreground">
                +{dueProblems.length - 20} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
