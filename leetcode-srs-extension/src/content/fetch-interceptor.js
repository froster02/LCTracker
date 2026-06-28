import { extractProblemInfo, getLanguageFromEditor } from "./problem-extractor.js";
import { normalizeStatus } from "../shared/status-map.js";
import { setDetectedSubmission } from "./submission-state.js";
import { sendSubmission } from "./submission-sender.js";

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

  setDetectedSubmission(details);

  if (normalizedStatus !== "Pending" && normalizedStatus !== "Unknown") {
    sendSubmission(details);
  }
}

export function installFetchInterceptor() {
  if (window.fetch.__lcgIntercepted) return;

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [url, init] = args;
    const urlStr = typeof url === "string" ? url : url.toString();

    if (urlStr.includes("leetcode.com") && urlStr.includes("/graphql/")) {
      const body = init?.body?.toString() ?? "";
      if (body.includes("submit") || body.includes("checkSubmission")) {
        try {
          const response = await originalFetch.apply(this, args);
          const clone = response.clone();
          clone.text().then((text) => {
            try {
              handleSubmissionResponse(JSON.parse(text));
            } catch {}
          }).catch(() => {});
          return response;
        } catch (e) {
          return originalFetch.apply(this, args);
        }
      }
    }

    return originalFetch.apply(this, args);
  };
  window.fetch.__lcgIntercepted = true;
}
