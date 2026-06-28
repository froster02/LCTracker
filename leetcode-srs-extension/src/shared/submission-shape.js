import { DIFFICULTY_VALUES } from "../config/constants.js";
import { STATUS_MAP } from "./status-map.js";

const REQUIRED_FIELDS = ["problemId", "problemName", "titleSlug", "difficulty", "status", "url"];

/**
 * Boundary validation for a submission payload before it crosses a process
 * boundary (content -> background message, or background -> webapp POST).
 * Returns a list of human-readable problems; empty array means valid.
 */
export function validateSubmission(details) {
  const problems = [];
  if (!details || typeof details !== "object") {
    return ["submission payload is not an object"];
  }
  for (const field of REQUIRED_FIELDS) {
    if (!details[field]) problems.push(`missing field: ${field}`);
  }
  if (details.difficulty && !DIFFICULTY_VALUES.includes(details.difficulty)) {
    problems.push(`invalid difficulty: ${details.difficulty}`);
  }
  if (details.status && !Object.values(STATUS_MAP).includes(details.status) && details.status !== "Unknown") {
    problems.push(`invalid status: ${details.status}`);
  }
  return problems;
}
