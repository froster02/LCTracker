"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, TrendingUp } from "lucide-react";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastSubmissionDate: string | null;
}

export function StreakCard() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/streaks")
      .then((res) => res.json())
      .then((json) => {
        setStreak(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !streak) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Streaks</CardTitle>
        </CardHeader>
        <CardContent className="h-32 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Streaks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-950">
            <Flame className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{streak.currentStreak} days</p>
            <p className="text-xs text-muted-foreground">Current streak</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{streak.longestStreak} days</p>
            <p className="text-xs text-muted-foreground">Longest streak</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
