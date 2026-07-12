import { API_BASE } from "../config/env.js";
import { ensureAuth } from "./auth.js";
import { notify, ACTIONS } from "../shared/messaging.js";
import { setAuth, setLastSync } from "../shared/storage.js";
import { HISTORY_BATCH_SIZE, HISTORY_PAGE_DELAY_MS, HISTORY_PAGE_SIZE } from "../config/constants.js";

function reportProgress(phase, extra = {}) {
  notify({ action: ACTIONS.SYNC_PROGRESS, phase, ...extra });
}

// Runs inside the LeetCode page context via chrome.scripting.executeScript —
// must stay a self-contained closure, it cannot import modules.
function collectAcceptedSubmissions(start, end, pageSize, pageDelayMs) {
  return (async () => {
    const targetStartTimestamp = Math.floor(new Date(start + "T00:00:00Z").getTime() / 1000);
    const targetEndTimestamp = Math.floor(new Date(end + "T23:59:59Z").getTime() / 1000);

    const getCsrfToken = () => {
      const match = document.cookie.match(/csrftoken=([^;]+)/);
      return match ? match[1] : "";
    };
    const csrfToken = getCsrfToken();
    const headers = csrfToken ? { "x-csrftoken": csrfToken } : {};

    let diffMap = {};
    try {
      const resp = await fetch("https://leetcode.com/api/problems/algorithms/", {
        headers,
        credentials: "include",
      });
      const json = await resp.json();
      json.stat_status_pairs.forEach((p) => {
        const slug = p.stat.question__title_slug;
        const level = p.difficulty.level;
        diffMap[slug] = level === 1 ? "Easy" : level === 2 ? "Medium" : "Hard";
      });
    } catch (e) {
      return { error: "Failed to fetch difficulty map. Are you logged into LeetCode?" };
    }

    let offset = 0;
    const acceptedProblems = new Map();

    while (true) {
      const response = await fetch(`https://leetcode.com/api/submissions/?offset=${offset}&limit=${pageSize}`, {
        headers,
        credentials: "include",
      });
      if (!response.ok) {
        return { error: `Failed to fetch submissions (HTTP ${response.status}). Log in and try again.` };
      }
      const json = await response.json();

      let stop = false;
      for (const sub of json.submissions_dump) {
        if (sub.timestamp < targetStartTimestamp) {
          stop = true;
          break;
        }
        if (sub.timestamp > targetEndTimestamp) continue;
        if (sub.status_display === "Accepted" && !acceptedProblems.has(sub.title_slug)) {
          acceptedProblems.set(sub.title_slug, sub);
        }
      }

      if (stop || !json.has_next) break;
      offset += pageSize;
      await new Promise((r) => setTimeout(r, pageDelayMs));
    }

    const results = [];
    for (const [slug, sub] of acceptedProblems) {
      results.push({
        problemId: String(sub.question_id ?? 0),
        problemName: sub.title,
        titleSlug: slug,
        difficulty: diffMap[slug] || "Medium",
        language: sub.lang || "Unknown",
        status: "Accepted",
        url: `https://leetcode.com/problems/${slug}/`,
        submittedAt: new Date(sub.timestamp * 1000).toISOString(),
      });
    }

    results.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    return { data: results };
  })();
}

export async function syncHistoryFromLeetCode(tabId, startDate, endDate) {
  const apiKey = await ensureAuth();
  if (!apiKey) {
    reportProgress("error", { error: "Please sign in first." });
    return;
  }

  reportProgress("reading");

  try {
    const [execResult] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [startDate, endDate, HISTORY_PAGE_SIZE, HISTORY_PAGE_DELAY_MS],
      func: collectAcceptedSubmissions,
    });

    const result = execResult.result;

    if (result.error) {
      reportProgress("error", { error: result.error });
      return;
    }

    const problems = result.data;
    if (!problems || problems.length === 0) {
      reportProgress("complete", { synced: 0, message: `No accepted submissions found between ${startDate} and ${endDate}.` });
      return;
    }

    reportProgress("batch", { current: 0, total: problems.length });

    for (let i = 0; i < problems.length; i += HISTORY_BATCH_SIZE) {
      const batch = problems.slice(i, i + HISTORY_BATCH_SIZE);
      const res = await fetch(`${API_BASE}/api/sync/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ submissions: batch }),
      });

      if (res.status === 401) {
        await setAuth({ apiKey: null, userId: null, expiresAt: null });
        notify({ action: ACTIONS.AUTH_EXPIRED });
        reportProgress("error", { error: "Session expired. Please sign in again." });
        return;
      }
      if (!res.ok) {
        console.error("[LeetCode Galaxy] Batch sync failed:", res.status);
        reportProgress("error", { error: `Batch sync failed: ${res.status}` });
        return;
      }

      reportProgress("batch", { current: Math.min(i + HISTORY_BATCH_SIZE, problems.length), total: problems.length });
    }

    await setLastSync(Date.now());
    reportProgress("complete", { synced: problems.length });
  } catch (error) {
    console.error("[LeetCode Galaxy] History sync error:", error);
    reportProgress("error", { error: error.message });
  }
}
