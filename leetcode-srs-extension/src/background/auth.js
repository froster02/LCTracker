import { apiPost } from "../shared/api-client.js";
import { getAuth, setAuth } from "../shared/storage.js";
import { AUTH_EXPIRY_BUFFER_MS, AUTH_TTL_MS, DEV_BYPASS_CLIENT_ID_PLACEHOLDER } from "../config/constants.js";
import { API_BASE } from "../config/env.js";

async function exchangeIdTokenForApiKey(idToken) {
  const res = await fetch(`${API_BASE}/api/extension/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    console.error("[LeetCode Galaxy] API auth failed:", res.status);
    return null;
  }
  const data = await res.json();
  if (!data.apiKey) {
    console.error("[LeetCode Galaxy] No apiKey in response");
    return null;
  }
  return { apiKey: data.apiKey, userId: data.userId };
}

export async function authenticateWithGoogle() {
  const clientId = chrome.runtime.getManifest().oauth2?.client_id;
  if (!clientId) {
    console.error("[LeetCode Galaxy] No OAuth2 client_id in manifest");
    return null;
  }

  if (clientId === DEV_BYPASS_CLIENT_ID_PLACEHOLDER) {
    console.log("[LeetCode Galaxy] Using local development authentication bypass");
    try {
      return await exchangeIdTokenForApiKey("dev-bypass-token");
    } catch (error) {
      console.error("[LeetCode Galaxy] Local bypass error:", error);
      return null;
    }
  }

  const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("nonce", Math.random().toString(36).substring(2));

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    if (!responseUrl) {
      console.error("[LeetCode Galaxy] OAuth cancelled or failed");
      return null;
    }

    const hash = new URL(responseUrl).hash;
    const params = new URLSearchParams(hash.slice(1));
    const idToken = params.get("id_token");

    if (!idToken) {
      console.error("[LeetCode Galaxy] No id_token in OAuth response");
      return null;
    }

    return await exchangeIdTokenForApiKey(idToken);
  } catch (error) {
    console.error("[LeetCode Galaxy] Auth error:", error);
    return null;
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

  const result = await authenticateWithGoogle();
  if (!result) return null;

  const newAuth = {
    apiKey: result.apiKey,
    userId: result.userId,
    expiresAt: Date.now() + AUTH_TTL_MS,
  };
  await setAuth(newAuth);
  return newAuth.apiKey;
}
