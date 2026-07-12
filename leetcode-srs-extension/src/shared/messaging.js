export const ACTIONS = {
  SUBMISSION_CAPTURED: "submissionCaptured",
  GET_AUTH_STATUS: "getAuthStatus",
  SIGN_IN: "signIn",
  SIGN_OUT: "signOut",
  TRIGGER_HISTORY_SYNC: "triggerHistorySync",
  GET_QUEUE_STATUS: "getQueueStatus",
  SYNC_PROGRESS: "syncProgress",
  AUTH_EXPIRED: "authExpired",
};

export function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
        return;
      }
      resolve(response);
    });
  });
}

export function notify(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}
