export const STORAGE_KEYS = {
  AUTH: "auth",
  QUEUE: "queue",
  LAST_SYNC: "lastSync",
};

export const ALARM_NAMES = {
  PROCESS_QUEUE: "processQueue",
};

export const DEV_BYPASS_CLIENT_ID_PLACEHOLDER = "YOUR_GOOGLE_CLIENT_ID";

export const AUTH_EXPIRY_BUFFER_MS = 24 * 60 * 60 * 1000; // re-auth a day before expiry
export const AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const QUEUE_POLL_INTERVAL_MIN = 5;
export const RETRY_ALARM_DELAY_MIN = 1;
export const MAX_QUEUE_ATTEMPTS = 5;
export const BASE_BACKOFF_MS = 1000;
export const MAX_BACKOFF_MS = 60000;

export const HISTORY_PAGE_SIZE = 50;
export const HISTORY_PAGE_DELAY_MS = 800;
export const HISTORY_BATCH_SIZE = 100;

export const SUBMISSION_DEDUP_WINDOW_MS = 5000;
export const DOM_DEBOUNCE_MS = 800;

export const DIFFICULTY_VALUES = ["Easy", "Medium", "Hard"];
