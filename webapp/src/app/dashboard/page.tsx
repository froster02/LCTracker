"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { OverviewPanel } from "@/components/OverviewPanel";
import { HistoryTable } from "@/components/HistoryTable";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { useSession, signIn } from "next-auth/react";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "reviews", label: "Reviews" },
  { key: "history", label: "History" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabKey>("overview");
  const [visited, setVisited] = useState<Set<TabKey>>(new Set(["overview"]));

  const selectTab = (key: TabKey) => {
    setTab(key);
    setVisited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
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
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Panels stay mounted once visited so switching tabs doesn't
            re-fetch or lose scroll position — just toggled with `hidden`. */}
        <div hidden={tab !== "overview"}>{visited.has("overview") && <OverviewPanel />}</div>
        <div hidden={tab !== "reviews"}>{visited.has("reviews") && <ReviewsPanel />}</div>
        <div hidden={tab !== "history"}>{visited.has("history") && <HistoryTable />}</div>
      </main>
    </>
  );
}
