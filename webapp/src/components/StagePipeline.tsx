"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGE_LABELS = ["Stage 0", "Stage 1", "Stage 2", "Mastered"];
const STAGE_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-green-500",
];
const STAGE_DESCRIPTIONS = [
  "First review due 7 days after solving",
  "Second review due 14 days later",
  "Third review due 21 days later",
  "Completed all reviews",
];

interface Problem {
  stage: number;
}

export function StagePipeline({ problems }: { problems: Problem[] }) {
  const stages = useMemo(() => {
    const counts = [0, 0, 0, 0];
    problems.forEach((p) => {
      if (p.stage >= 0 && p.stage <= 3) counts[p.stage]++;
    });
    return counts;
  }, [problems]);

  const maxCount = Math.max(...stages, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">SRS Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((count, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{STAGE_LABELS[i]}</span>
                <span className="text-muted-foreground">{count} problems</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${STAGE_COLORS[i]}`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{STAGE_DESCRIPTIONS[i]}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
