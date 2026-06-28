import { API_BASE } from "../config/env.js";

export async function apiPost(path, body, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiGet(path, apiKey) {
  const headers = {};
  if (apiKey) headers["x-api-key"] = apiKey;
  return fetch(`${API_BASE}${path}`, { headers });
}
