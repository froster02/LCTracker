"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface Submission {
  id: string;
  problemId: string;
  problemName: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  language: string;
  status: string;
  runtime: number | null;
  memory: number | null;
  submittedAt: string;
  url: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const DIFFICULTY_COLORS = {
  Easy: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  Hard: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const STATUS_COLORS: Record<string, string> = {
  Accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  "Wrong Answer": "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  "Time Limit Exceeded": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "Memory Limit Exceeded": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "Runtime Error": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "Compile Error": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function HistoryTable() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = (page: number) => {
    setLoading(true);
    setError(null);
    fetch(`/api/submissions?page=${page}&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        setSubmissions(json.submissions ?? []);
        setPagination(json.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load submissions. Try refreshing.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">All Submissions ({pagination.total} total)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet. Install the Chrome extension to start tracking!</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Problem</th>
                    <th className="pb-2 text-left font-medium">Difficulty</th>
                    <th className="pb-2 text-left font-medium">Language</th>
                    <th className="pb-2 text-left font-medium">Status</th>
                    <th className="pb-2 text-left font-medium">Runtime</th>
                    <th className="pb-2 text-left font-medium">Memory</th>
                    <th className="pb-2 text-left font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-medium hover:underline">
                          {s.problemName}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-xs ${DIFFICULTY_COLORS[s.difficulty] ?? DIFFICULTY_COLORS.Medium}`}>
                          {s.difficulty}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{s.language}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s.status] ?? STATUS_COLORS.default}`}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{s.runtime ? `${s.runtime} ms` : "—"}</td>
                      <td className="py-3 text-muted-foreground">{s.memory ? `${s.memory} MB` : "—"}</td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(s.submittedAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => fetchPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 hover:bg-muted"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
