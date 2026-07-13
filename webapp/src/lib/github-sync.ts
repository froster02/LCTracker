import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

// Commits accepted LeetCode solutions to the user's own GitHub repo
// (github.com/{login}/leettracker02). GitHub is the user-owned home for
// solutions; Postgres remains the query index for the dashboard. Every
// function here is best-effort: callers fire-and-forget and a GitHub failure
// must never block submission ingest.

const REPO_NAME = "leettracker02";
const API = "https://api.github.com";

const LANG_EXT: Record<string, string> = {
  python: "py",
  python3: "py",
  javascript: "js",
  typescript: "ts",
  java: "java",
  "c++": "cpp",
  cpp: "cpp",
  c: "c",
  "c#": "cs",
  csharp: "cs",
  go: "go",
  golang: "go",
  rust: "rs",
  kotlin: "kt",
  swift: "swift",
  ruby: "rb",
  scala: "scala",
  php: "php",
  dart: "dart",
  elixir: "ex",
  erlang: "erl",
  racket: "rkt",
  mysql: "sql",
  mssql: "sql",
  oraclesql: "sql",
  postgresql: "sql",
  bash: "sh",
};

function extFor(language: string): string {
  return LANG_EXT[language.toLowerCase()] ?? "txt";
}

interface SubmissionForSync {
  problemName: string;
  titleSlug: string;
  difficulty: string;
  language: string;
  runtime: number | null;
  memory: number | null;
  code: string | null;
  url: string;
  submittedAt: Date;
}

async function gh(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  return fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function ensureRepo(token: string, login: string): Promise<boolean> {
  const res = await gh(token, "GET", `/repos/${login}/${REPO_NAME}`);
  if (res.ok) return true;
  if (res.status !== 404) return false;
  const create = await gh(token, "POST", "/user/repos", {
    name: REPO_NAME,
    description:
      "My LeetCode solutions, auto-committed by LeetTracker02 🚀",
    private: true,
    auto_init: true,
  });
  return create.ok;
}

// PUT a file, updating in place when it already exists (contents API needs
// the current blob sha for updates).
async function putFile(
  token: string,
  login: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const encodedPath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const url = `/repos/${login}/${REPO_NAME}/contents/${encodedPath}`;

  let sha: string | undefined;
  const existing = await gh(token, "GET", url);
  if (existing.ok) {
    const json = (await existing.json()) as { sha?: string };
    sha = json.sha;
  }

  const res = await gh(token, "PUT", url, {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    ...(sha ? { sha } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub PUT ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

function metadataReadme(sub: SubmissionForSync): string {
  const date = sub.submittedAt.toISOString().split("T")[0];
  return [
    `# ${sub.problemName}`,
    "",
    `| | |`,
    `|---|---|`,
    `| Difficulty | ${sub.difficulty} |`,
    `| Language | ${sub.language} |`,
    `| Runtime | ${sub.runtime != null ? `${sub.runtime} ms` : "—"} |`,
    `| Memory | ${sub.memory != null ? `${sub.memory} MB` : "—"} |`,
    `| Solved on | ${date} |`,
    `| Problem | [leetcode.com/problems/${sub.titleSlug}](${sub.url}) |`,
    "",
    `_Auto-committed by [LeetTracker02](https://lctracker-webapp.vercel.app)._`,
    "",
  ].join("\n");
}

// Commit one accepted solution (solution file + metadata README) to the
// user's repo. Silently no-ops when the user has no stored token or the
// submission carries no code.
export async function commitSolutionToGitHub(
  userId: string,
  sub: SubmissionForSync
): Promise<void> {
  try {
    if (!sub.code) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubLogin: true, githubAccessToken: true },
    });
    if (!user?.githubLogin || !user.githubAccessToken) return;

    const token = await decrypt(user.githubAccessToken);
    if (!token) return;

    if (!(await ensureRepo(token, user.githubLogin))) return;

    const dir = `${sub.difficulty}/${sub.titleSlug}`;
    const message = `Add solution: ${sub.problemName} (Accepted${
      sub.runtime != null ? `, ${sub.runtime} ms` : ""
    })`;

    await putFile(
      token,
      user.githubLogin,
      `${dir}/solution.${extFor(sub.language)}`,
      sub.code,
      message
    );
    await putFile(
      token,
      user.githubLogin,
      `${dir}/README.md`,
      metadataReadme(sub),
      `Update metadata: ${sub.problemName}`
    );
  } catch (error) {
    console.error("[github-sync] commit failed:", error);
  }
}

// Bulk variant used by history sync: commits sequentially with a small
// concurrency to stay well inside GitHub secondary rate limits.
export async function commitManyToGitHub(
  userId: string,
  subs: SubmissionForSync[]
): Promise<void> {
  const CONCURRENCY = 3;
  for (let i = 0; i < subs.length; i += CONCURRENCY) {
    await Promise.all(
      subs.slice(i, i + CONCURRENCY).map((s) => commitSolutionToGitHub(userId, s))
    );
  }
}
