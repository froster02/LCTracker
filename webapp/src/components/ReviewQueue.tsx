"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReviewItem } from "@/components/ReviewScheduleTable";

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-green-600 dark:text-green-400",
  Medium: "text-amber-600 dark:text-amber-400",
  Hard: "text-red-600 dark:text-red-400",
};

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span>Review Queue</span>
          <span className="text-muted-foreground">
            {dueProblems.length} due
            {overdueCount > 0 && (
              <span className="ml-1 text-red-500">
                ({overdueCount} overdue)
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dueProblems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing due for review. Great work!
          </p>
        ) : (
          <div className="space-y-2">
            {dueProblems.slice(0, 20).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-3"
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
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className={DIFFICULTY_COLORS[r.difficulty]}>
                      {r.difficulty}
                    </span>
                    <span>Stage {r.stage}</span>
                    <span>
                      Due {new Date(r.nextReviewAt!).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(r.url, "_blank")}
                >
                  Solve
                </Button>
              </div>
            ))}
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
