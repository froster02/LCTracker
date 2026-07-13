import { apiPost } from "../shared/api-client.js";
import { getAuth, getQueue, setAuth, setQueue } from "../shared/storage.js";
import { validateSubmission } from "../shared/submission-shape.js";
import { notify, ACTIONS } from "../shared/messaging.js";
import {
  ALARM_NAMES,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  MAX_QUEUE_ATTEMPTS,
  RETRY_ALARM_DELAY_MIN,
} from "../config/constants.js";

export function computeBackoffDelay(attempts) {
  return Math.min(2 ** attempts * BASE_BACKOFF_MS, MAX_BACKOFF_MS);
}

export async function enqueueSubmission(payload) {
  const problems = validateSubmission(payload);
  if (problems.length > 0) {
    console.warn("[LeetTracker02] Rejected invalid submission payload:", problems, payload);
    return;
  }

  const queue = await getQueue();
  const item = {
    id: crypto.randomUUID(),
    payload,
    attempts: 0,
    lastAttempt: null,
    createdAt: Date.now(),
  };
  queue.push(item);
  await setQueue(queue);
  console.log("[LeetTracker02] Enqueued submission:", payload.problemName);

  processQueue().catch(console.error);
}

// Concurrency guard: prevents overlapping invocations from alarm, online event,
// and enqueueSubmission firing simultaneously.
let _processing = false;

export async function processQueue() {
  if (_processing) return;
  _processing = true;
  try {
    await _processQueueInner();
  } finally {
    _processing = false;
  }
}

async function _processQueueInner() {
  const auth = await getAuth();
  if (!auth.apiKey) {
    console.log("[LeetTracker02] No auth, skipping queue processing");
    return;
  }

  let queue = await getQueue();
  if (queue.length === 0) return;

  const processedIds = [];
  let authExpired = false;

  for (const item of queue) {
    if (item.attempts >= MAX_QUEUE_ATTEMPTS) {
      processedIds.push(item.id);
      continue;
    }

    const minDelay = computeBackoffDelay(item.attempts);
    if (item.lastAttempt && Date.now() - item.lastAttempt < minDelay) {
      continue;
    }

    try {
      const res = await apiPost("/api/submissions", item.payload, auth.apiKey);

      if (res.ok) {
        const data = await res.json();
        if (data.duplicate) {
          console.log("[LeetTracker02] Duplicate submission skipped:", item.payload.problemName);
        } else {
          console.log("[LeetTracker02] Submission synced:", item.payload.problemName);
        }
        processedIds.push(item.id);
      } else if (res.status === 401) {
        console.warn("[LeetTracker02] Auth expired during queue processing");
        await setAuth({ apiKey: null, userId: null, expiresAt: null });
        notify({ action: ACTIONS.AUTH_EXPIRED });
        authExpired = true;
        break; // stop processing; save queue state below before returning
      } else {
        item.attempts++;
        item.lastAttempt = Date.now();
        console.warn("[LeetTracker02] Submission failed, will retry:", res.status, item.payload.problemName);
      }
    } catch (error) {
      item.attempts++;
      item.lastAttempt = Date.now();
      console.warn("[LeetTracker02] Network error, will retry:", item.payload.problemName, error);
    }
  }

  // Always persist queue mutations (attempt counts, removals) before returning
  const updated = queue.filter((q) => !processedIds.includes(q.id));
  await setQueue(updated);

  if (authExpired) return;

  if (updated.length > 0) {
    chrome.alarms.create(ALARM_NAMES.PROCESS_QUEUE, { delayInMinutes: RETRY_ALARM_DELAY_MIN });
  }
}
