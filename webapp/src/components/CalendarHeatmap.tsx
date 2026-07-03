"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function CalendarHeatmap() {
  const [cells, setCells] = useState<DayCell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/heatmap")
      .then((res) => res.json())
      .then((json) => {
        const heatmap: Record<string, number> = json.heatmap ?? {};
        const today = new Date();
        const yearAgo = new Date(today);
        yearAgo.setDate(yearAgo.getDate() - 364);

        const cells: DayCell[] = [];
        const cursor = new Date(yearAgo);
        while (cursor <= today) {
          const key = cursor.toISOString().split("T")[0];
          const count = heatmap[key] ?? 0;
          let level: DayCell["level"] = 0;
          if (count > 0) level = count >= 5 ? 4 : count >= 3 ? 3 : count >= 2 ? 2 : 1;
          cells.push({ date: key, count, level });
          cursor.setDate(cursor.getDate() + 1);
        }
        setCells(cells);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (cells.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Activity (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const levelColors = [
    "bg-zinc-100 dark:bg-zinc-800",
    "bg-green-200 dark:bg-green-900",
    "bg-green-400 dark:bg-green-700",
    "bg-green-500 dark:bg-green-500",
    "bg-green-600 dark:bg-green-400",
  ];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Activity (Last 12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          <div className="flex flex-col gap-[3px] pt-5">
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((day, i) => (
              <span key={i} className="h-[10px] text-[8px] text-muted-foreground">
                {day}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      className={`h-[10px] w-[10px] rounded-sm ${levelColors[cell.level]}`}
                      title={`${cell.date}: ${cell.count} submission(s)`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-[3px] text-[8px] text-muted-foreground">
              {months.map((m) => (
                <span key={m} className="w-[calc(10px*4.3)]">{m}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {levelColors.map((color, i) => (
            <div key={i} className={`h-3 w-3 rounded-sm ${color}`} />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}

