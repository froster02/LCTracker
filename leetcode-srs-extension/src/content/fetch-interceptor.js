// Isolated-world half of submission interception. The MAIN-world script
// (main-world.js) wraps the page's fetch and relays LeetCode GraphQL
// submission responses here via window.postMessage; this listener normalizes
// them and hands off to the background worker.

import { extractProblemInfo, getLanguageFromEditor } from "./problem-extractor.js";
import { normalizeStatus } from "../shared/status-map.js";
import { setDetectedSubmission } from "./submission-state.js";
import { sendSubmission } from "./submission-sender.js";

const BRIDGE_SOURCE = "lcg-interceptor";

// The submit request carries the typed code; the later status-check polls do
// not. Hold the most recent code so it can be attached when the final
// (non-Pending) response arrives.
let _lastTypedCode = null;

function handleSubmissionResponse(data) {
  if (!data?.data) return;

  const submission = data.data.submit?.submission ?? data.data.submissionDetails ?? data.data.checkSubmission;
  if (!submission) return;

  const problemInfo = extractProblemInfo();
  const language = getLanguageFromEditor();

  const status = submission.statusDisplay ?? submission.status_msg ?? "Unknown";
  const normalizedStatus = normalizeStatus(status);

  const details = {
    problemId: problemInfo.problemId ?? "0",
    problemName: problemInfo.problemName ?? "Unknown",
    titleSlug: problemInfo.titleSlug ?? "unknown",
    difficulty: problemInfo.difficulty ?? "Medium",
    language,
    status: normalizedStatus,
    url: problemInfo.url ?? window.location.href,
    submittedAt: new Date().toISOString(),
  };

  if (submission.runtime) {
    const rtMatch = String(submission.runtime).match(/(\d+)/);
    if (rtMatch) details.runtime = parseInt(rtMatch[1], 10);
  }
  if (submission.memory) {
    const memMatch = String(submission.memory).match(/(\d+)/);
    if (memMatch) details.memory = parseInt(memMatch[1], 10);
  }
  if (submission.codeLength) {
    details.codeLength = submission.codeLength;
  }
  if (_lastTypedCode) {
    details.code = _lastTypedCode.slice(0, 100_000); // server schema cap
  }

  setDetectedSubmission(details);

  if (normalizedStatus !== "Pending" && normalizedStatus !== "Unknown") {
    sendSubmission(details);
  }
}

export function installInterceptorBridge() {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    if (event.data?.source !== BRIDGE_SOURCE) return;
    if (typeof event.data.typedCode === "string" && event.data.typedCode) {
      _lastTypedCode = event.data.typedCode;
    }
    handleSubmissionResponse(event.data.data);
  });
}
