"use client";

import { useEffect, useState } from "react";
import { ReviewQueue } from "@/components/ReviewQueue";
import { ReviewScheduleTable, type ReviewItem } from "@/components/ReviewScheduleTable";
import { StagePipeline } from "@/components/StagePipeline";

type OwnerFilter = "all" | "me" | "friend";
const FILTER_KEY = "reviews-owner-filter";

export function ReviewsPanel() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OwnerFilter>("all");

  useEffect(() => {
    const saved = localStorage.getItem(FILTER_KEY);
    if (saved === "me" || saved === "friend") setFilter(saved);

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

  const changeFilter = (f: OwnerFilter) => {
    setFilter(f);
    localStorage.setItem(FILTER_KEY, f);
  };

  const filtered =
    filter === "all" ? reviews : reviews.filter((r) => (r.owner ?? "me") === filter);

  const pipelineItems = filtered.map((r) => ({ stage: r.mastered ? 3 : r.stage }));

  const handleNoteSaved = (id: string, note: string | null) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, note } : r)));
  };

  const handleOwnerChanged = (id: string, owner: "me" | "friend") => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, owner } : r)));
  };

  const counts = {
    all: reviews.length,
    me: reviews.filter((r) => (r.owner ?? "me") === "me").length,
    friend: reviews.filter((r) => r.owner === "friend").length,
  };

  const chips: { key: OwnerFilter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "me", label: `Mine (${counts.me})` },
    { key: "friend", label: `Friend (${counts.friend})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Solve a problem, then review it after 7, 14, and 21 days to master it.
        </p>
        <div
          role="group"
          aria-label="Filter reviews by owner"
          className="flex gap-1 rounded-lg border p-1"
        >
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={filter === c.key}
              onClick={() => changeFilter(c.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === c.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReviewQueue reviews={filtered} />
        <StagePipeline problems={pipelineItems} />
      </div>
      <ReviewScheduleTable
        reviews={filtered}
        onNoteSaved={handleNoteSaved}
        onOwnerChanged={handleOwnerChanged}
      />
    </div>
  );
}
