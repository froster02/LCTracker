import { apiGet } from "../shared/api-client.js";
import { getAuth } from "../shared/storage.js";
import { API_BASE } from "../config/env.js";
import { STORAGE_KEYS } from "../config/constants.js";

const NOTIFICATION_ID = "reviewReminder";
const MAX_TITLES_IN_MESSAGE = 3;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export async function checkDueReviews() {
  const auth = await getAuth();
  if (!auth.apiKey) return;

  // At most one reminder per day, even if both the startup hook and the
  // daily alarm fire.
  const { [STORAGE_KEYS.LAST_REVIEW_NOTIFY]: lastNotify } =
    await chrome.storage.local.get(STORAGE_KEYS.LAST_REVIEW_NOTIFY);
  if (lastNotify === todayStr()) return;

  const res = await apiGet("/api/reviews/due", auth.apiKey);
  if (!res.ok) {
    console.warn("[LeetCode Galaxy] Due-reviews check failed:", res.status);
    return;
  }

  const { count, due } = await res.json();
  if (!count) return;

  const titles = due.slice(0, MAX_TITLES_IN_MESSAGE).map((d) => d.problemName);
  const extra = count > MAX_TITLES_IN_MESSAGE ? ` +${count - MAX_TITLES_IN_MESSAGE} more` : "";
  const clickUrl = count === 1 ? due[0].url : `${API_BASE}/dashboard`;

  await chrome.storage.local.set({
    [STORAGE_KEYS.REVIEW_CLICK_URL]: clickUrl,
    [STORAGE_KEYS.LAST_REVIEW_NOTIFY]: todayStr(),
  });

  chrome.notifications.create(NOTIFICATION_ID, {
    type: "basic",
    iconUrl: "icon.png",
    title: `${count} LeetCode review${count > 1 ? "s" : ""} due today`,
    message: `Today you need to do: ${titles.join(", ")}${extra}`,
  });
}

export function registerReviewReminder() {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    if (notificationId !== NOTIFICATION_ID) return;
    const { [STORAGE_KEYS.REVIEW_CLICK_URL]: url } =
      await chrome.storage.local.get(STORAGE_KEYS.REVIEW_CLICK_URL);
    if (url) chrome.tabs.create({ url });
    chrome.notifications.clear(notificationId);
  });
}
