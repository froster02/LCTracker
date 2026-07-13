import { ALARM_NAMES, QUEUE_POLL_INTERVAL_MIN, REVIEW_REMINDER_PERIOD_MIN } from "../config/constants.js";
import { processQueue } from "./queue.js";
import { checkDueReviews } from "./review-reminder.js";

export function registerAlarms() {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAMES.PROCESS_QUEUE) {
      processQueue().catch(console.error);
    }
    if (alarm.name === ALARM_NAMES.REVIEW_REMINDER) {
      checkDueReviews().catch(console.error);
    }
  });

  chrome.runtime.onStartup.addListener(() => {
    processQueue().catch(console.error);
    checkDueReviews().catch(console.error);
  });

  self.addEventListener("online", () => {
    console.log("[LeetTracker02] Network online, processing queue...");
    processQueue().catch(console.error);
  });

  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_NAMES.PROCESS_QUEUE, { periodInMinutes: QUEUE_POLL_INTERVAL_MIN });
    chrome.alarms.create(ALARM_NAMES.REVIEW_REMINDER, {
      periodInMinutes: REVIEW_REMINDER_PERIOD_MIN,
      delayInMinutes: 1,
    });
  });
}
