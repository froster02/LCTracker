"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const STAGE_LABELS = ["7d", "14d", "21d"] as const;

export interface StageDotsProps {
  stage: number;
  mastered: boolean;
  className?: string;
  showLabels?: boolean;
}

export function StageDots({
  stage,
  mastered,
  className,
  showLabels = true,
}: StageDotsProps) {
  if (mastered) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <div className="flex items-center gap-1" role="img" aria-label="All stages completed">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-2 w-2 rounded-full bg-green-500"
              title={`Stage ${i}: Completed`}
            />
          ))}
        </div>
        {showLabels && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            Mastered
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="flex items-center gap-1" role="img" aria-label={`Stage ${stage} of 3`}>
        {[0, 1, 2].map((i) => {
          const isDone = stage > i;
          const isCurrent = stage === i;
          return (
            <span
              key={i}
              className={cn(
                "inline-block h-2 w-2 rounded-full transition-colors",
                isDone && "bg-primary",
                isCurrent && "bg-primary ring-2 ring-primary/30",
                !isDone && !isCurrent && "border border-muted-foreground/40 bg-transparent"
              )}
              title={`Stage ${i}: ${STAGE_LABELS[i]} (${isDone ? "Done" : isCurrent ? "Current" : "Pending"})`}
            />
          );
        })}
      </div>
      {showLabels && (
        <span className="text-xs text-muted-foreground">
          Stage {stage} ({STAGE_LABELS[Math.min(stage, 2)]})
        </span>
      )}
    </div>
  );
}
