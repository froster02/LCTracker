export const AuthStatus = {
  UNKNOWN: "unknown",
  SIGNED_OUT: "signed_out",
  SIGNED_IN: "signed_in",
  SIGNING_IN: "signing_in",
};

export const SyncStatus = {
  IDLE: "idle",
  RUNNING: "running",
  DONE: "done",
  ERROR: "error",
};

export function createInitialState() {
  return {
    auth: AuthStatus.UNKNOWN,
    queuePending: 0,
    lastSyncAt: null,
    sync: { status: SyncStatus.IDLE, current: 0, total: 0 },
    error: null, // { message } — surfaced as a banner
  };
}
