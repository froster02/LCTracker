let lastProcessedSubmission = 0;
let detectedSubmission = null;
let isProcessing = false;

export function getDetectedSubmission() {
  return detectedSubmission;
}

export function setDetectedSubmission(details) {
  detectedSubmission = details;
}

export function isCurrentlyProcessing() {
  return isProcessing;
}

export function markProcessing() {
  isProcessing = true;
  lastProcessedSubmission = Date.now();
}

export function markProcessed() {
  isProcessing = false;
  detectedSubmission = null;
}

export function timeSinceLastProcessed() {
  return Date.now() - lastProcessedSubmission;
}

export function reset() {
  detectedSubmission = null;
  isProcessing = false;
}
