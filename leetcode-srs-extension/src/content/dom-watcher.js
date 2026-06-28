import { extractProblemInfo, getLanguageFromEditor } from "./problem-extractor.js";
import { normalizeStatus, STATUS_MAP } from "../shared/status-map.js";
import { getDetectedSubmission, isCurrentlyProcessing, reset, timeSinceLastProcessed } from "./submission-state.js";
import { sendSubmission } from "./submission-sender.js";
import { DOM_DEBOUNCE_MS, SUBMISSION_DEDUP_WINDOW_MS } from "../config/constants.js";

const STATUS_SELECTORS = [
  '[data-e2e-locator="submission-result"]',
  '[class*="success"] span',
  '[class*="result"]',
  'div[class*="status"]',
];

function checkSubmissionResult() {
  if (isCurrentlyProcessing()) return;
  if (timeSinceLastProcessed() < SUBMISSION_DEDUP_WINDOW_MS) return;

  let statusText = "";
  for (const sel of STATUS_SELECTORS) {
    const el = document.querySelector(sel);
    if (el?.textContent) {
      statusText = el.textContent.trim();
      break;
    }
  }

  if (!Object.keys(STATUS_MAP).includes(statusText)) return;
  const normalizedStatus = normalizeStatus(statusText);

  const detected = getDetectedSubmission();
  if (detected && detected.status === normalizedStatus) {
    // Already captured via fetch interception
    return;
  }

  const problemInfo = extractProblemInfo();
  const language = getLanguageFromEditor();

  let runtime;
  let memory;

  const runtimeEl = document.querySelector('[class*="runtime"]');
  if (runtimeEl?.textContent) {
    const match = runtimeEl.textContent.match(/(\d+)\s*ms/);
    if (match) runtime = parseInt(match[1], 10);
  }
  const memoryEl = document.querySelector('[class*="memory"]');
  if (memoryEl?.textContent) {
    const match = memoryEl.textContent.match(/(\d+)\s*MB/);
    if (match) memory = parseInt(match[1], 10);
  }

  const details = {
    problemId: problemInfo.problemId ?? "0",
    problemName: problemInfo.problemName ?? "Unknown",
    titleSlug: problemInfo.titleSlug ?? "unknown",
    difficulty: problemInfo.difficulty ?? "Medium",
    language,
    status: normalizedStatus,
    runtime,
    memory,
    url: problemInfo.url ?? window.location.href,
    submittedAt: new Date().toISOString(),
  };

  sendSubmission(details);
}

export function installDomWatcher() {
  let submissionTimeout;
  const observer = new MutationObserver(() => {
    if (submissionTimeout) clearTimeout(submissionTimeout);
    submissionTimeout = setTimeout(checkSubmissionResult, DOM_DEBOUNCE_MS);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      reset();
    }
  }).observe(document, { subtree: true, childList: true });
}
