"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendPoint {
  problemId: string;
  problemName: string;
  runtime: number | null;
  memory: number | null;
  submittedAt: string;
}

export function PerformanceChart() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/performance?limit=50")
      .then((res) => res.json())
      .then((json) => {
        const trends = (json.trends ?? []).reverse();
        setData(trends);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const chartData = data.map((d) => ({
    name: d.problemName.slice(0, 20),
    runtime: d.runtime ?? 0,
    memory: d.memory ?? 0,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Performance Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Performance Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No performance data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Performance Trends (Accepted)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: "ms", angle: -90, position: "insideLeft", fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: "MB", angle: 90, position: "insideRight", fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line yAxisId="left" type="monotone" dataKey="runtime" name="Runtime (ms)" stroke="#ffa116" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="memory" name="Memory (MB)" stroke="#00b8a3" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
