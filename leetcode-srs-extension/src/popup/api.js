import { sendMessage, ACTIONS } from "../shared/messaging.js";

export function getAuthStatus() {
  return sendMessage({ action: ACTIONS.GET_AUTH_STATUS });
}

export function getQueueStatus() {
  return sendMessage({ action: ACTIONS.GET_QUEUE_STATUS });
}

export function signIn() {
  return sendMessage({ action: ACTIONS.SIGN_IN });
}

export function signOut() {
  return sendMessage({ action: ACTIONS.SIGN_OUT });
}

export function triggerHistorySync(startDate, endDate) {
  return sendMessage({ action: ACTIONS.TRIGGER_HISTORY_SYNC, startDate, endDate });
}
