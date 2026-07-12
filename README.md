# LeetCode Galaxy 🌌

**Solve on LeetCode. See your progress on a beautiful dashboard. Get every accepted solution committed to your own GitHub repo — automatically.**

LeetCode Galaxy is the **LeetTracker02** Chrome extension + a web dashboard that tracks your LeetCode journey with zero manual work:

- 🔍 **Auto-detects submissions** the moment you hit Submit on leetcode.com
- 📊 **Dashboard analytics** — activity heatmap, streaks, difficulty breakdown, language usage, performance trends
- 🐙 **GitHub solution backup** — every accepted solution is committed to `github.com/you/leetcode-galaxy` (LeetHub-style, with code + metadata)
- 🔁 **Spaced-repetition reviews** — solved problems come back for review at 7 / 14 / 21 days so they actually stick
- 📦 **History import** — bulk-sync your past LeetCode submissions by date range
- 📴 **Offline queue** — submissions made offline are queued and retried automatically

## How it works (end-to-end)

1. **Sign in with GitHub** on the [dashboard](https://lctracker-webapp.vercel.app). GitHub is your identity — no new password.
2. **Install the LeetTracker02 extension** and click *Sign in with GitHub* in its popup. A tab opens, connects the extension to your account, and closes itself.
3. **Solve a problem** on leetcode.com and submit. The extension captures the result (status, runtime, memory, your code) and sends it to your dashboard.
4. **Watch the dashboard update** — new history row, heatmap square, streak tick.
5. **Check your GitHub** — an accepted solution appears as a commit in your `leetcode-galaxy` repo: `Medium/two-sum/solution.py` plus a metadata README.
6. **Review on schedule** — the Reviews tab (and an extension notification) tells you when a problem is due for its 7/14/21-day review. Solve it again to advance it; miss the window and it resets.

### Where is my data?

| Data | Where it lives |
|------|----------------|
| Your solution code | **Your own GitHub repo** (`leetcode-galaxy`, private by default — flip it public in repo settings any time) |
| Dashboard stats, history, review schedule | The app's Postgres database (used as a fast query index) |
| Your login | GitHub OAuth — the app never sees a password |

## Install (users)

1. Open the dashboard → sign in with GitHub → authorize (the `repo` permission is what lets it create and commit to *your* `leetcode-galaxy` repo).
2. Load the **LeetTracker02** extension (Chrome Web Store listing pending; for now: `chrome://extensions` → Developer mode → *Load unpacked* → select the built `leetcode-srs-extension/dist/` folder).
3. Click the LeetTracker02 icon → *Sign in with GitHub* → done. Solve something!

## Self-hosting

You need: a [Vercel](https://vercel.com) account, a Postgres database ([Neon](https://neon.tech) free tier works), and a GitHub OAuth App.

### 1. GitHub OAuth App
[github.com/settings/developers](https://github.com/settings/developers) → *New OAuth App*:
- Homepage URL: `https://your-app.vercel.app`
- Callback URL: `https://your-app.vercel.app/api/auth/callback/github`

Copy the Client ID and generate a Client Secret.

### 2. Deploy the webapp
```bash
cd webapp
cp .env.example .env.local   # fill in values
npx prisma db push           # create tables
vercel --prod
```

| Env var | Value |
|---------|-------|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | your deployed origin |
| `GITHUB_ID` / `GITHUB_SECRET` | from the OAuth App |
| `DATABASE_URL` | Postgres connection string |

### 3. Build the extension
```bash
cd leetcode-srs-extension
npm install
PROD_API_BASE=https://your-app.vercel.app node scripts/build.js --prod
```
Load `dist/` as an unpacked extension. Also update `manifest.json` → `externally_connectable.matches` to your domain.

## Development

```bash
# webapp — Next.js 16, App Router, TypeScript, Prisma
cd webapp && npm install
npx prisma generate && npx prisma db push   # against local Postgres
npm run dev                                  # localhost:3000

# extension — esbuild, vanilla JS, Manifest V3
cd leetcode-srs-extension && npm install
npm run build      # dev build (API_BASE = localhost:3000)
npm run watch      # rebuild on change
```

Local Postgres: `docker run -d --name lctracker-pg -e POSTGRES_USER=johndoe -e POSTGRES_PASSWORD=randompassword -e POSTGRES_DB=mydb -p 5432:5432 postgres:16-alpine`

## Architecture (short version)

```
leetcode.com ──(MAIN-world fetch interceptor)──▶ extension content script
     │                                                    │
     │  submission JSON (status, runtime, memory, code)   ▼
     │                                    extension service worker (MV3)
     │                                      · offline queue + retry
     │                                      · history bulk import
     │                                      · API-key auth
     ▼                                                    │ x-api-key
GitHub OAuth ◀── webapp (Next.js 16 on Vercel) ◀──────────┘
     │               │
     │               ├─▶ Postgres (Neon): submissions, stats, SRS reviews
     └──────────────▶└─▶ GitHub API: commit accepted solutions to your repo
```

Key details live in [ARCHITECTURE.md](ARCHITECTURE.md); deploy steps in [DEPLOYMENT.md](DEPLOYMENT.md).

- Extension auth is tab-based: popup opens `/auth/extension`, the page mints an API key and hands it to the extension via `chrome.runtime.sendMessage` (`externally_connectable`). No OAuth client inside the extension.
- Submission detection wraps `window.fetch` in the page's MAIN world (an isolated content script can't see the page's own requests) and relays via `postMessage`.
- The GitHub token (`repo` scope) is stored AES-256-GCM-encrypted; solution commits are fire-and-forget and never block tracking.

## FAQ

**Why GitHub sign-in?** Your solutions end up in your GitHub — signing in with GitHub gives the app permission to create that repo and commit to it. One identity, no passwords.

**Does the repo count toward my contribution graph?** Yes — commits are made with your token as you.

**What if a commit fails?** Tracking still works; repo sync is best-effort. Your submission is always saved to the dashboard first.

**Is my code public?** No — `leetcode-galaxy` is created **private**. Make it public in repo settings whenever you like.

## License

MIT
