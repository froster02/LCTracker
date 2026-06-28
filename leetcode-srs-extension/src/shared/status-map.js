export const STATUS_MAP = {
  "Accepted": "Accepted",
  "Wrong Answer": "Wrong Answer",
  "Time Limit Exceeded": "Time Limit Exceeded",
  "Memory Limit Exceeded": "Memory Limit Exceeded",
  "Runtime Error": "Runtime Error",
  "Compile Error": "Compile Error",
  "Output Limit Exceeded": "Output Limit Exceeded",
};

export function normalizeStatus(raw) {
  return STATUS_MAP[raw] ?? raw ?? "Unknown";
}
