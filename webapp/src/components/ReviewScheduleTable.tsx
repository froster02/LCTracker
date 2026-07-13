"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StageDots } from "@/components/StageDots";
import { toast } from "sonner";

export interface ReviewItem {
  id: string;
  titleSlug: string;
  problemName: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  stage: number;
  mastered: boolean;
  note: string | null;
  firstSolvedAt: string;
  lastSolvedAt: string;
  nextReviewAt: string | null;
}

const INTERVALS = [7, 14, 21];
const NOTE_MAX = 300;

function fmt(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// Column i shows: "Done" for completed stages, the stored nextReviewAt for
// the current stage (bold), and a projection for later stages assuming each
// review is done exactly on its due date.
function stageDates(item: ReviewItem): string[] {
  if (item.mastered || !item.nextReviewAt) return INTERVALS.map(() => "Done");

  const next = new Date(item.nextReviewAt);
  return INTERVALS.map((_, i) => {
    if (i < item.stage) return "Done";
    if (i === item.stage) return fmt(next);
    let projected = next;
    for (let k = item.stage + 1; k <= i; k++) projected = addDays(projected, INTERVALS[k]);
    return fmt(projected);
  });
}

interface Props {
  reviews: ReviewItem[];
  onNoteSaved: (id: string, note: string | null) => void;
}

export function ReviewScheduleTable({ reviews, onNoteSaved }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const startEdit = (r: ReviewItem) => {
    setEditingId(r.id);
    setDraft(r.note ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  const saveNote = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: draft }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      onNoteSaved(id, json.review?.note ?? null);
      toast.success(draft.trim() ? "Note saved" : "Note cleared");
      cancelEdit();
    } catch {
      toast.error("Couldn't save note. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No solved problems yet. Solve a problem on LeetCode to start your review schedule.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 font-medium">Problem</th>
            <th className="px-4 py-3 font-medium">Difficulty</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">1st Review (+7d)</th>
            <th className="px-4 py-3 font-medium">2nd Review (+14d)</th>
            <th className="px-4 py-3 font-medium">3rd Review (+21d)</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="min-w-56 px-4 py-3 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => {
            const dates = stageDates(r);
            const overdue =
              !r.mastered && r.nextReviewAt !== null && r.nextReviewAt.split("T")[0] < today;
            const isEditing = editingId === r.id;
            return (
              <tr
                key={r.id}
                className={`border-b last:border-0 hover:bg-muted/30 ${
                  overdue ? "border-l-2 border-l-primary" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {r.problemName}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${
                    r.difficulty === "Easy" ? "text-lc-easy" : r.difficulty === "Medium" ? "text-lc-medium" : "text-lc-hard"
                  }`}>
                    {r.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StageDots stage={r.stage} mastered={r.mastered} />
                </td>
                {dates.map((d, i) => (
                  <td
                    key={i}
                    className={`px-4 py-3 tabular-nums ${!r.mastered && i === r.stage ? "font-semibold" : ""}`}
                  >
                    {d}
                  </td>
                ))}
                <td className="px-4 py-3">
                  {r.mastered ? (
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Mastered
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">In progress</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <Textarea
                        autoFocus
                        value={draft}
                        maxLength={NOTE_MAX}
                        rows={3}
                        aria-label={`Note for ${r.problemName}`}
                        placeholder="Approach, pitfalls, pattern…"
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelEdit();
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote(r.id);
                        }}
                        className="min-w-52 text-xs"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {draft.length}/{NOTE_MAX}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs active:scale-[0.98]"
                            onClick={() => saveNote(r.id)}
                            disabled={saving}
                          >
                            {saving ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : r.note ? (
                    <button
                      onClick={() => startEdit(r)}
                      title={r.note}
                      className="max-w-64 truncate text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {r.note}
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={() => startEdit(r)}
                    >
                      + Add note
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
