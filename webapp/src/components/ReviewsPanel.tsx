"use client";

import { useEffect, useState } from "react";
import { ReviewQueue } from "@/components/ReviewQueue";
import { ReviewScheduleTable, type ReviewItem } from "@/components/ReviewScheduleTable";
import { StagePipeline } from "@/components/StagePipeline";

export function ReviewsPanel() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((json) => {
        setReviews(json.reviews ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load reviews. Try refreshing.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  const pipelineItems = reviews.map((r) => ({ stage: r.mastered ? 3 : r.stage }));

  const handleNoteSaved = (id: string, note: string | null) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, note } : r)));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Solve a problem, then review it after 7, 14, and 21 days to master it.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewQueue reviews={reviews} />
        <StagePipeline problems={pipelineItems} />
      </div>
      <ReviewScheduleTable reviews={reviews} onNoteSaved={handleNoteSaved} />
    </div>
  );
}
