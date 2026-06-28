import { ACTIONS } from "../shared/messaging.js";
import { getAuth, getQueue, setAuth, setQueue } from "../shared/storage.js";
import { ensureAuth } from "./auth.js";
import { enqueueSubmission } from "./queue.js";
import { syncHistoryFromLeetCode } from "./history-sync.js";

export function registerMessageRouter() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === ACTIONS.SUBMISSION_CAPTURED) {
      enqueueSubmission(request.payload).then(() => sendResponse({ success: true }));
      return true;
    }

    if (request.action === ACTIONS.GET_AUTH_STATUS) {
      getAuth().then((auth) => {
        sendResponse({
          authenticated: !!auth.apiKey && !!(auth.expiresAt && Date.now() < auth.expiresAt),
          userId: auth.userId,
        });
      });
      return true;
    }

    if (request.action === ACTIONS.SIGN_IN) {
      ensureAuth().then((apiKey) => {
        sendResponse({ success: !!apiKey, apiKey });
      });
      return true;
    }

    if (request.action === ACTIONS.SIGN_OUT) {
      setAuth({ apiKey: null, userId: null, expiresAt: null }).then(() => {
        setQueue([]).then(() => sendResponse({ success: true }));
      });
      return true;
    }

    if (request.action === ACTIONS.TRIGGER_HISTORY_SYNC) {
      chrome.tabs.query({ url: ["*://leetcode.com/*", "*://*.leetcode.com/*"] }, (tabs) => {
        if (tabs.length === 0) {
          sendResponse({ error: "Please open leetcode.com in a tab first." });
          return;
        }
        sendResponse({ success: true });
        syncHistoryFromLeetCode(tabs[0].id, request.startDate, request.endDate);
      });
      return true;
    }

    if (request.action === ACTIONS.GET_QUEUE_STATUS) {
      getQueue().then((queue) => {
        sendResponse({ pending: queue.length });
      });
      return true;
    }
  });
}
