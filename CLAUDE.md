# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LeetCode Galaxy: a Chrome extension that auto-detects LeetCode submissions and a Next.js web dashboard that visualizes them (streaks, difficulty breakdown, heatmap, spaced-repetition review schedule). Two independent apps in one repo, connected only over HTTP:

- `leetcode-srs-extension/` — Manifest V3 extension, vanilla JS bundled with esbuild.
- `webapp/` — Next.js 16 (App Router) + TypeScript + Prisma/PostgreSQL, deployed to Vercel.

There is no shared package between them — the wire contract (submission JSON shape) is duplicated by convention: Zod schemas in `webapp/src/lib/schemas.ts` on one side, plain object literals in the extension's `src/shared/` on the other. When changing one, check the other.

## Commands

### webapp/
```bash
cd webapp
npm install
npx prisma generate        # regenerate client after any schema.prisma change
npx prisma db push         # sync schema to DB (no migrations/ dir in this repo — db push, not migrate dev)
npm run dev                # Next dev server, localhost:3000
npm run build               # production build (also runs `next typegen` + generates route types)
npm run lint                # eslint
npx tsc --noEmit            # typecheck only
```
No test runner is configured in `webapp/package.json`.

**Read `webapp/AGENTS.md` before writing webapp code.** This project pins Next.js 16, a version with breaking changes vs. what most training data assumes — check `webapp/node_modules/next/dist/docs/` for current API/convention before using anything Next-specific.

### leetcode-srs-extension/
```bash
cd leetcode-srs-extension
npm install
npm run build               # esbuild -> dist/ (background.js, content.js, content-main.js, popup.js + static files copied in)
npm run watch                # esbuild --watch
npm run zip                  # production build + zip dist/ for Chrome Web Store upload
```
Load `leetcode-srs-extension/dist/` (not the repo root) as an unpacked extension in `chrome://extensions` — the manifest, popup HTML/CSS, and icon are all copied into `dist/` by the build script, and `dist/` is gitignored.

No test runner. No lint config in this package.

### Local Postgres for development
No bundled dev-db script; a manually-run Docker container is the working pattern:
```bash
docker run -d --name lctracker-pg -e POSTGRES_USER=johndoe -e POSTGRES_PASSWORD=randompassword -e POSTGRES_DB=mydb -p 5432:5432 postgres:16-alpine
```
matching `DATABASE_URL` in `webapp/.env.local` (`postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public`).

## Architecture

### Extension (`leetcode-srs-extension/src/`)
Four independent esbuild entry points, each a separate execution context:
- `background/` — MV3 service worker. `index.js` wires `message-router.js` (handles all `chrome.runtime.onMessage` actions) and `alarms.js` (periodic queue processing + daily review-reminder check). `auth.js` does the Google OAuth / dev-bypass token exchange; `queue.js` is the offline retry queue with exponential backoff; `history-sync.js` does bulk history import by executing a script *inside* the LeetCode tab via `chrome.scripting.executeScript`.
- `content/` — runs on leetcode.com in two separate injected scripts:
  - `main-world.js` — injected with `"world": "MAIN"` at `document_start`. Only this script can see LeetCode's own `window.fetch` calls (a normal isolated-world content script cannot intercept page-context fetches). It wraps fetch, and relays captured GraphQL submission responses to the isolated world via `window.postMessage`.
  - `index.js` / `fetch-interceptor.js` — the isolated-world half; listens for the postMessage bridge, normalizes the payload, and falls back to `dom-watcher.js` (MutationObserver-based detection) if the fetch path misses a submission. `submission-state.js` holds encapsulated module state (not bare globals) to dedupe double-detection between the two paths.
  - **If you touch submission detection, understand this MAIN-world/isolated-world split first** — it's the fix for a real bug (the original single-world interceptor never fired) and reintroducing a single-world fetch override will silently break detection again.
- `popup/` — state-driven UI: `state.js` defines the state shape, `view.js` has one `render(state, els)` function that all DOM updates flow through, `index.js` owns the mutable state and calls `render()` after every mutation. Don't reintroduce direct DOM mutation scattered across event handlers.
- `shared/` — cross-context helpers: `status-map.js` (single source of truth for LeetCode status strings), `api-client.js` (fetch wrapper injecting `x-api-key`), `storage.js` (`chrome.storage.local` wrappers), `messaging.js` (typed action constants + `chrome.runtime.lastError`-safe sendMessage), `submission-shape.js` (boundary validation before a submission crosses a process boundary).
- `config/constants.js` — every magic number/string (storage keys, alarm names, retry backoff, review intervals) lives here, not inline.
- `config/env.js` — `API_BASE` is injected at build time via esbuild `define` (dev vs `--prod`); there is no runtime config file.

### Webapp (`webapp/src/`)
- `app/api/` — route handlers are the only backend surface (no separate server). Two auth paths converge in every extension-facing route: `x-api-key` header (SHA-256 hashed, looked up via `validateApiKey`) or the Auth.js session cookie. The shared resolver is `lib/request-auth.ts`'s `getUserIdFromRequest` — use it for new routes instead of re-inlining the two-path check (older routes like `api/submissions/route.ts` still have it inlined; that's legacy, not the pattern to copy).
- `lib/stats.ts` — `recalculateUserStats(userId)` recomputes the materialized `UserStat` row from the full `Submission` history. Called fire-and-forget after a single ingest, awaited after bulk sync.
- `lib/reviews.ts` — the spaced-repetition state machine (7d → 14d → 21d → mastered). `applyAccepted(state, submittedAt)` is a **pure** transition function shared by both the incremental path (`upsertReviewOnAccepted`, called per-submission) and the bulk-replay path (`recalculateReviewsFromHistory`, which reprocesses a user's entire Accepted history chronologically). Never duplicate this transition logic elsewhere — both ingest routes must call through these two functions, not reimplement the stage math.
- Both `api/submissions/route.ts` (single) and `api/sync/history/route.ts` (bulk) independently dedupe by `(userId, problemId, submittedAt ± 5min)` before writing, then trigger both `recalculateUserStats` and the review-state update. If you add a third ingest path, it needs the same dedup + both side-effect calls.
- `app/dashboard/page.tsx` is a **single route** — Overview/Reviews/History are client-side tabs (`OverviewPanel.tsx`, `ReviewsPanel.tsx`, `HistoryTable.tsx`), not separate pages. Panels stay mounted after first visit (toggled with the `hidden` attribute) so switching tabs doesn't refetch or reset scroll. Don't reintroduce `/dashboard/history` or `/dashboard/reviews` as routes — nothing links to them and the extension's notification click-through points at `/dashboard`.
- Theming: `next-themes` via `ThemeProvider.tsx`/`ThemeToggle.tsx`, `class` attribute strategy, dark variant driven by Tailwind's `.dark` class in `globals.css`. Font is Geist Sans (`layout.tsx`), already sans-serif app-wide — no per-component font overrides needed.
- `prisma/schema.prisma` — six models: `User`, `Submission`, `Problem` (canonical LeetCode metadata, largely unpopulated — most components denormalize `problemName`/`difficulty`/`url` onto their own rows rather than joining), `UserStat` (materialized aggregates), `ApiKey` (hashed, revocable, 30-day expiry), `ProblemReview` (SRS state, one row per `(userId, titleSlug)`). This repo uses `prisma db push`, not `prisma migrate` — there's no `prisma/migrations/` directory.

### Cross-cutting
- Wire contract: extension sends `{problemId, problemName, titleSlug, difficulty, language, runtime?, memory?, status, codeLength?, url, submittedAt}` — matches `submissionSchema` in `webapp/src/lib/schemas.ts`. Difficulty and status are closed enums on both sides; keep the extension's `STATUS_MAP` (`src/shared/status-map.js`) and the webapp's Zod enum in sync.
- Auth: dashboard uses Auth.js v5 (Google OAuth, session cookie). Extension exchanges a Google ID token for a long-lived API key via `POST /api/extension/auth` — same OAuth client ID must be configured in both `webapp/.env.local` (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`) and `leetcode-srs-extension/manifest.json` (`oauth2.client_id`). A `dev-bypass-token` idToken value short-circuits real OAuth for local testing (`webapp/src/app/api/extension/auth/route.ts`) — only works when `manifest.json`'s client_id is still the placeholder.
