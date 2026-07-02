// Runs in the page's MAIN world (see manifest "world": "MAIN") so it can wrap
// the same window.fetch LeetCode's own scripts use — an isolated-world content
// script only sees its own copy of fetch and never observes page requests.
// No chrome.* APIs exist here; captured responses are relayed to the isolated
// content script via window.postMessage.

export const BRIDGE_SOURCE = "lcg-interceptor";

function isSubmissionRequest(urlStr, body) {
  return (
    urlStr.includes("leetcode.com") &&
    urlStr.includes("/graphql/") &&
    (body.includes("submit") || body.includes("checkSubmission"))
  );
}

export function installMainWorldInterceptor() {
  if (window.fetch.__lcgIntercepted) return;

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [url, init] = args;
    const urlStr = typeof url === "string" ? url : url.toString();
    const body = init?.body?.toString() ?? "";

    if (isSubmissionRequest(urlStr, body)) {
      try {
        const response = await originalFetch.apply(this, args);
        const clone = response.clone();
        clone.text().then((text) => {
          try {
            const data = JSON.parse(text);
            window.postMessage({ source: BRIDGE_SOURCE, data }, window.location.origin);
          } catch {}
        }).catch(() => {});
        return response;
      } catch (e) {
        return originalFetch.apply(this, args);
      }
    }

    return originalFetch.apply(this, args);
  };
  window.fetch.__lcgIntercepted = true;
}

installMainWorldInterceptor();
