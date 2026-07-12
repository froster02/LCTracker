import { getAuth, setAuth } from "../shared/storage.js";
import { apiPost } from "../shared/api-client.js";
import { AUTH_EXPIRY_BUFFER_MS, AUTH_TTL_MS } from "../config/constants.js";
import { API_BASE } from "../config/env.js";

// Dedup concurrent auth attempts — second caller gets the same promise
let _authInProgress = null;

export function registerAuthMessageListener() {
  chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
    if (message?.type !== "AUTH_SUCCESS" || !message.apiKey) return;
    if (!sender.url?.startsWith(API_BASE)) return;
    // Persist immediately: the webapp revokes the previous key whenever it
    // mints a new one, so an unsolicited AUTH_SUCCESS (e.g. the user opened
    // /auth/extension directly) must replace our stored key or we are left
    // holding a revoked one.
    await setAuth({
      apiKey: message.apiKey,
      userId: message.userId,
      expiresAt: Date.now() + AUTH_TTL_MS,
    });
    // Also mirror to session storage so the polling loop in
    // authenticateWithGitHub resolves even across SW restarts mid-flow.
    await chrome.storage.session.set({
      authResult: { apiKey: message.apiKey, userId: message.userId },
    });
    sendResponse({ ok: true });
  });
}

async function _doAuthenticate() {
  await chrome.storage.session.remove("authResult");
  const authUrl = `${API_BASE}/auth/extension?ext_id=${chrome.runtime.id}`;
  await chrome.tabs.create({ url: authUrl });

  return new Promise((resolve) => {
    // Poll session storage — survives SW sleep/restart because the external
    // message listener writes the result to storage on wake-up.
    const iv = setInterval(async () => {
      const { authResult } = await chrome.storage.session.get("authResult");
      if (authResult) {
        clearInterval(iv);
        await chrome.storage.session.remove("authResult");
        resolve({ apiKey: authResult.apiKey, userId: authResult.userId });
      }
    }, 500);

    // 10-minute timeout
    setTimeout(() => {
      clearInterval(iv);
      resolve(null);
    }, 10 * 60 * 1000);
  });
}

export async function authenticateWithGitHub() {
  if (_authInProgress) return _authInProgress;
  _authInProgress = _doAuthenticate();
  try {
    return await _authInProgress;
  } finally {
    _authInProgress = null;
  }
}

export async function ensureAuth() {
  const auth = await getAuth();
  const isExpiringSoon = auth.expiresAt && Date.now() > auth.expiresAt - AUTH_EXPIRY_BUFFER_MS;

  if (auth.apiKey && !isExpiringSoon) {
    return auth.apiKey;
  }

  if (auth.apiKey) {
    try {
      const res = await apiPost("/api/extension/refresh", { apiKey: auth.apiKey });
      if (res.ok) {
        const data = await res.json();
        const newAuth = {
          apiKey: data.apiKey,
          userId: auth.userId,
          expiresAt: Date.now() + AUTH_TTL_MS,
        };
        await setAuth(newAuth);
        return newAuth.apiKey;
      }
    } catch (e) {
      console.warn("[LeetCode Galaxy] Refresh failed, will re-auth:", e);
    }
  }

  const result = await authenticateWithGitHub();
  if (!result) return null;

  const newAuth = {
    apiKey: result.apiKey,
    userId: result.userId,
    expiresAt: Date.now() + AUTH_TTL_MS,
  };
  await setAuth(newAuth);
  return newAuth.apiKey;
}
