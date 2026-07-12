import { ACTIONS } from "../shared/messaging.js";
import { markProcessing, markProcessed, isCurrentlyProcessing } from "./submission-state.js";

export function sendSubmission(details) {
  if (
    details.problemId === "9999" ||
    details.problemName.includes("SRS Test") ||
    details.titleSlug.startsWith("srs-")
  ) {
    console.log("[LeetCode Galaxy] Ignoring test submission:", details.problemName);
    return;
  }

  if (isCurrentlyProcessing()) return;
  markProcessing();

  chrome.runtime.sendMessage({ action: ACTIONS.SUBMISSION_CAPTURED, payload: details }, () => {
    if (chrome.runtime.lastError) {
      console.warn("[LeetCode Galaxy] Background unavailable:", chrome.runtime.lastError.message);
    }
    markProcessed();
  });
}
