import { ALARM_NAMES, QUEUE_POLL_INTERVAL_MIN } from "../config/constants.js";
import { processQueue } from "./queue.js";

export function registerAlarms() {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAMES.PROCESS_QUEUE) {
      processQueue().catch(console.error);
    }
  });

  chrome.runtime.onStartup.addListener(() => {
    processQueue().catch(console.error);
  });

  self.addEventListener("online", () => {
    console.log("[LeetCode Galaxy] Network online, processing queue...");
    processQueue().catch(console.error);
  });

  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(ALARM_NAMES.PROCESS_QUEUE, { periodInMinutes: QUEUE_POLL_INTERVAL_MIN });
  });
}
