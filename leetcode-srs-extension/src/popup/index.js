import { API_BASE } from "../config/env.js";
import { ACTIONS } from "../shared/messaging.js";
import { createInitialState, AuthStatus, SyncStatus } from "./state.js";
import { render } from "./view.js";
import * as api from "./api.js";

const els = {
  authSection: document.getElementById("authSection"),
  authStatus: document.getElementById("authStatus"),
  authText: document.getElementById("authText"),
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  trackingSection: document.getElementById("trackingSection"),
  queueStatus: document.getElementById("queueStatus"),
  lastSync: document.getElementById("lastSync"),
  syncBtn: document.getElementById("syncBtn"),
  progressSection: document.getElementById("progressSection"),
  progressText: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  dashboardLink: document.getElementById("dashboardLink"),
  startDateInput: document.getElementById("startDateInput"),
  endDateInput: document.getElementById("endDateInput"),
  errorBanner: document.getElementById("errorBanner"),
};

let state = createInitialState();

function setState(patch) {
  state = { ...state, ...patch };
  render(state, els);
}

function setError(message) {
  setState({ error: message ? { message } : null });
}

async function refreshAuth() {
  const auth = await api.getAuthStatus();
  setState({ auth: auth?.authenticated ? AuthStatus.SIGNED_IN : AuthStatus.SIGNED_OUT });
  if (auth?.authenticated) refreshQueue();
}

async function refreshQueue() {
  const status = await api.getQueueStatus();
  setState({ queuePending: status?.pending ?? 0 });
}

els.dashboardLink.href = `${API_BASE}/dashboard`;

els.signInBtn.addEventListener("click", async () => {
  setState({ auth: AuthStatus.SIGNING_IN, error: null });
  const result = await api.signIn();
  if (result?.success) {
    await refreshAuth();
  } else {
    setState({ auth: AuthStatus.SIGNED_OUT });
    setError("Sign in failed. Please try again.");
  }
});

els.signOutBtn.addEventListener("click", async () => {
  await api.signOut();
  await refreshAuth();
});

els.syncBtn.addEventListener("click", async () => {
  const startDate = els.startDateInput.value;
  const endDate = els.endDateInput.value;

  if (!startDate || !endDate) {
    setError("Please select both start and end dates.");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const todayDate = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  todayDate.setHours(23, 59, 59, 999);

  if (start > end) {
    setError("Start date must be before or equal to the end date.");
    return;
  }
  if (start > todayDate || end > todayDate) {
    setError("Dates cannot be in the future.");
    return;
  }

  setState({ error: null, sync: { status: SyncStatus.RUNNING, current: 0, total: 0 } });

  const result = await api.triggerHistorySync(startDate, endDate);
  if (result?.error) {
    setState({ sync: { status: SyncStatus.ERROR, current: 0, total: 0 } });
    setError(result.error);
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === ACTIONS.SYNC_PROGRESS) {
    if (request.phase === "batch") {
      setState({ sync: { status: SyncStatus.RUNNING, current: request.current, total: request.total } });
    } else if (request.phase === "complete") {
      setState({ sync: { status: SyncStatus.DONE, current: request.synced ?? 0, total: request.synced ?? 0 }, lastSyncAt: Date.now() });
      setTimeout(() => {
        setState({ sync: { status: SyncStatus.IDLE, current: 0, total: 0 } });
        refreshQueue();
      }, 1500);
    } else if (request.phase === "error") {
      setState({ sync: { status: SyncStatus.ERROR, current: 0, total: 0 } });
      setError(request.error);
    }
  }

  if (request.action === ACTIONS.AUTH_EXPIRED) {
    refreshAuth();
  }
});

render(state, els);
refreshAuth();
setInterval(refreshQueue, 10000);

const todayStr = new Date().toISOString().split("T")[0];
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

els.startDateInput.value = thirtyDaysAgoStr;
els.endDateInput.value = todayStr;
els.startDateInput.max = todayStr;
els.endDateInput.max = todayStr;
