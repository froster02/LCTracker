"use client";

import { useEffect, useState } from "react";
import { ReviewQueue } from "@/components/ReviewQueue";
import { ReviewScheduleTable, type ReviewItem } from "@/components/ReviewScheduleTable";
import { StagePipeline } from "@/components/StagePipeline";

export function ReviewsPanel() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((json) => {
        setReviews(json.reviews ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const pipelineItems = reviews.map((r) => ({ stage: r.mastered ? 3 : r.stage }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Solve a problem, then review it after 7, 14, and 21 days to master it.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewQueue reviews={reviews} />
        <StagePipeline problems={pipelineItems} />
      </div>
      <ReviewScheduleTable reviews={reviews} />
    </div>
  );
}
