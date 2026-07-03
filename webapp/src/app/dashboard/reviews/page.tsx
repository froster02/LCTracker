"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useSession, signIn } from "next-auth/react";
import { ReviewQueue } from "@/components/ReviewQueue";
import { ReviewScheduleTable, type ReviewItem } from "@/components/ReviewScheduleTable";
import { StagePipeline } from "@/components/StagePipeline";

export default function ReviewsPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((json) => {
        setReviews(json.reviews ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (!session?.user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="mb-4 text-2xl font-bold">Sign in required</h1>
          <p className="mb-8 text-muted-foreground">Sign in to view your review schedule.</p>
          <button
            onClick={() => signIn("google")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in with Google
          </button>
        </main>
      </>
    );
  }

  const pipelineItems = reviews.map((r) => ({ stage: r.mastered ? 3 : r.stage }));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold">Spaced Repetition Reviews</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Solve a problem, then review it after 7, 14, and 21 days to master it.
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ReviewQueue reviews={reviews} />
              <StagePipeline problems={pipelineItems} />
            </div>
            <ReviewScheduleTable reviews={reviews} />
          </div>
        )}
      </main>
    </>
  );
}
