import { ACTIONS } from "../shared/messaging.js";
import { markProcessing, markProcessed, isCurrentlyProcessing } from "./submission-state.js";

export function sendSubmission(details) {
  if (
    details.problemId === "9999" ||
    details.problemName.includes("SRS Test") ||
    details.titleSlug.startsWith("srs-")
  ) {
    console.log("[LeetTracker02] Ignoring test submission:", details.problemName);
    return;
  }

  if (isCurrentlyProcessing()) return;
  markProcessing();

  chrome.runtime.sendMessage({ action: ACTIONS.SUBMISSION_CAPTURED, payload: details }, () => {
    if (chrome.runtime.lastError) {
      console.warn("[LeetTracker02] Background unavailable:", chrome.runtime.lastError.message);
    }
    markProcessed();
  });
}
