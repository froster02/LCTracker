import { ACTIONS } from "../shared/messaging.js";
import { markProcessing, markProcessed, isCurrentlyProcessing } from "./submission-state.js";

export function sendSubmission(details) {
  if (isCurrentlyProcessing()) return;
  markProcessing();

  chrome.runtime.sendMessage({ action: ACTIONS.SUBMISSION_CAPTURED, payload: details }, () => {
    if (chrome.runtime.lastError) {
      console.warn("[LeetCode Galaxy] Background unavailable:", chrome.runtime.lastError.message);
    }
    markProcessed();
  });
}
