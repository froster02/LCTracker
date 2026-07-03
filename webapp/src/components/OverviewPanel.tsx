"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/StatsCards";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { DifficultyDonut } from "@/components/DifficultyDonut";
import { LanguageChart } from "@/components/LanguageChart";
import { StreakCard } from "@/components/StreakCard";
import { RecentSubmissions } from "@/components/RecentSubmissions";
import { PerformanceChart } from "@/components/PerformanceChart";
import { SubmissionTrends } from "@/components/SubmissionTrends";

interface UserStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  currentStreak: number;
  longestStreak: number;
  acceptanceRate: number;
}

interface StatsResponse {
  stats: UserStats;
  totalSubmissions: number;
  acceptedSubmissions: number;
}

export function OverviewPanel() {
  const [statsData, setStatsData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStatsData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your analytics...</p>;
  }

  return (
    <div className="space-y-6">
      <StatsCards
        stats={statsData?.stats ?? null}
        totalSubmissions={statsData?.totalSubmissions ?? 0}
        acceptedSubmissions={statsData?.acceptedSubmissions ?? 0}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CalendarHeatmap />
        </div>
        <div>
          <StreakCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div>
          <DifficultyDonut />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LanguageChart />
        <SubmissionTrends />
      </div>

      <RecentSubmissions />
    </div>
  );
}
