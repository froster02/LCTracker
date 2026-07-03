"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StatsCards } from "@/components/StatsCards";
import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { DifficultyDonut } from "@/components/DifficultyDonut";
import { LanguageChart } from "@/components/LanguageChart";
import { StreakCard } from "@/components/StreakCard";
import { RecentSubmissions } from "@/components/RecentSubmissions";
import { PerformanceChart } from "@/components/PerformanceChart";
import { SubmissionTrends } from "@/components/SubmissionTrends";
import { useSession, signIn } from "next-auth/react";

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
  recentSubmissions: unknown[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [statsData, setStatsData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/stats")
      .then((res) => {
        if (res.status === 401) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => {
        setStatsData(data);
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
          <p className="mb-8 text-muted-foreground">
            Sign in with Google to view your dashboard and track your LeetCode progress.
          </p>
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

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session.user.name?.split(" ")[0] ?? "Coder"}
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading your analytics...</p>
        ) : (
          <div className="space-y-8">
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
        )}
      </main>
    </>
  );
}
