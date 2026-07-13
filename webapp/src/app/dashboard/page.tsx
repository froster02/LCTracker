"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { OverviewPanel } from "@/components/OverviewPanel";
import { HistoryTable } from "@/components/HistoryTable";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { useSession, signIn } from "next-auth/react";

const TABS = [
  { key: "reviews", label: "Reviews" },
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabKey>("reviews");
  const [visited, setVisited] = useState<Set<TabKey>>(new Set(["reviews"]));
  const [dueCount, setDueCount] = useState(0);

  const selectTab = (key: TabKey) => {
    setTab(key);
    setVisited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/reviews/due")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setDueCount(json?.count ?? 0))
      .catch(() => {});
  }, [session?.user]);

  if (!session?.user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="mb-4 text-2xl font-bold">Sign in required</h1>
          <p className="mb-8 text-muted-foreground">
            Sign in with GitHub to view your dashboard and track your LeetCode progress.
          </p>
          <button
            onClick={() => signIn("github")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 glow-amber-hover active:scale-[0.98]"
          >
            Sign in with GitHub
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session.user.name?.split(" ")[0] ?? "Coder"}
          </p>
        </div>

        <div className="mb-8 flex gap-1 border-b" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => selectTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors active:scale-[0.98] ${
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.key === "reviews" && dueCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  {dueCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Panels stay mounted once visited so switching tabs doesn't
            re-fetch or lose scroll position — just toggled with `hidden`. */}
        <div hidden={tab !== "reviews"}>{visited.has("reviews") && <ReviewsPanel />}</div>
        <div hidden={tab !== "overview"}>
          {visited.has("overview") && (
            <OverviewPanel dueCount={dueCount} onGoToReviews={() => selectTab("reviews")} />
          )}
        </div>
        <div hidden={tab !== "history"}>{visited.has("history") && <HistoryTable />}</div>
      </main>
    </>
  );
}
