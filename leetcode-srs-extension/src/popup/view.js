import { AuthStatus, SyncStatus } from "./state.js";

export function render(state, els) {
  renderAuth(state, els);
  renderQueue(state, els);
  renderSync(state, els);
  renderError(state, els);
}

function renderAuth(state, els) {
  const dot = els.authStatus.querySelector(".status-dot");
  const signedIn = state.auth === AuthStatus.SIGNED_IN;
  const signingIn = state.auth === AuthStatus.SIGNING_IN;

  els.authText.textContent = signingIn ? "Signing in..." : signedIn ? "Signed in" : "Not signed in";
  dot?.classList.remove("online", "offline", "pending");
  dot?.classList.add(signingIn ? "pending" : signedIn ? "online" : "offline");

  els.signInBtn.classList.toggle("hidden", signedIn);
  els.signInBtn.disabled = signingIn;
  els.signOutBtn.classList.toggle("hidden", !signedIn);
  els.trackingSection.classList.toggle("hidden", !signedIn);
}

function renderQueue(state, els) {
  els.queueStatus.textContent = `${state.queuePending} pending`;
  els.queueStatus.classList.toggle("badge--pending", state.queuePending > 0);
  els.queueStatus.classList.toggle("badge--clear", state.queuePending === 0);

  els.lastSync.textContent = state.lastSyncAt
    ? new Date(state.lastSyncAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";
}

function renderSync(state, els) {
  const { status, current, total } = state.sync;
  const running = status === SyncStatus.RUNNING;

  els.syncBtn.disabled = running;
  els.syncBtn.textContent = running ? "Syncing..." : "Sync History";

  els.progressSection.classList.toggle("hidden", status === SyncStatus.IDLE);

  if (status === SyncStatus.RUNNING) {
    const pct = total > 0 ? Math.round((current / total) * 90) + 10 : 10;
    els.progressFill.style.width = `${pct}%`;
    els.progressText.textContent = total > 0 ? `Synced ${current} / ${total}` : "Reading submission history...";
  } else if (status === SyncStatus.DONE) {
    els.progressFill.style.width = "100%";
    els.progressText.textContent = total > 0 ? `Sync complete — ${total} problems synced.` : "No new submissions to sync.";
  } else if (status === SyncStatus.ERROR) {
    els.progressFill.style.width = "0%";
  }
}

function renderError(state, els) {
  els.errorBanner.classList.toggle("hidden", !state.error);
  if (state.error) {
    els.errorBanner.textContent = state.error.message;
  }
}
