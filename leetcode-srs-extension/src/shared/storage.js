import { STORAGE_KEYS } from "../config/constants.js";

export async function getAuth() {
  const { [STORAGE_KEYS.AUTH]: auth } = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
  return auth ?? { apiKey: null, userId: null, expiresAt: null };
}

export async function setAuth(auth) {
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH]: auth });
}

export async function getQueue() {
  const { [STORAGE_KEYS.QUEUE]: queue } = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
  return queue ?? [];
}

export async function setQueue(queue) {
  await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue });
}

export async function getLastSync() {
  const { [STORAGE_KEYS.LAST_SYNC]: lastSync } = await chrome.storage.local.get(STORAGE_KEYS.LAST_SYNC);
  return lastSync ?? null;
}

export async function setLastSync(timestamp) {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: timestamp });
}
