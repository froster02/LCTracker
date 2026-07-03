"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DifficultyData {
  difficulty: string;
  count: number;
}

export function DifficultyDonut() {
  const [data, setData] = useState<DifficultyData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((json) => {
        const stats = json.stats ?? {};
        const easy = stats.easySolved ?? 0;
        const medium = stats.mediumSolved ?? 0;
        const hard = stats.hardSolved ?? 0;
        const t = easy + medium + hard;
        setData([
          { difficulty: "Easy", count: easy },
          { difficulty: "Medium", count: medium },
          { difficulty: "Hard", count: hard },
        ]);
        setTotal(t || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Difficulty Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const segments = [
    { label: "Easy", count: data[0]?.count ?? 0, color: "bg-green-500", pct: ((data[0]?.count ?? 0) / total) * 100 },
    { label: "Medium", count: data[1]?.count ?? 0, color: "bg-amber-500", pct: ((data[1]?.count ?? 0) / total) * 100 },
    { label: "Hard", count: data[2]?.count ?? 0, color: "bg-red-500", pct: ((data[2]?.count ?? 0) / total) * 100 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Difficulty Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div
            className="h-32 w-32 rounded-full"
            style={{
              background: `conic-gradient(${segments.map((s, i) => {
                const start = segments.slice(0, i).reduce((a, s) => a + s.pct, 0);
                const hue = s.label === "Easy" ? "142.1 76.2% 36.3%" : s.label === "Medium" ? "37.7 92.1% 50.2%" : "0 72.2% 50.6%";
                return `hsl(${hue}) ${start}% ${start + s.pct}%`;
              }).join(", ")})`,
            }}
          />
          <div className="space-y-2">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <div className={`h-3 w-3 rounded-full ${s.color}`} />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium">{s.count}</span>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(s.pct)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
