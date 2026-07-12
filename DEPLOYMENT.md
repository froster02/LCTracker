# LeetCode Galaxy — Deployment Guide

## 1. Database Setup (Neon recommended)

1. Create a project at [Neon](https://neon.tech) (or Supabase / any Postgres)
2. Copy the pooled connection string → `DATABASE_URL` in Vercel env vars
3. Apply the schema (this repo uses `db push`, not migrations):
```bash
cd webapp
npx prisma db push
npx prisma generate
```

## 2. GitHub OAuth App Setup

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Homepage URL: `https://your-domain.vercel.app`
3. Authorization callback URL: `https://your-domain.vercel.app/api/auth/callback/github`
4. Register → copy **Client ID** → generate a **Client Secret** (copy it immediately; shown once)

Notes:
- The app requests `read:user user:email repo` scope. `repo` is what lets it create the user's `leetcode-galaxy` repo and commit accepted solutions to it.
- The extension needs **no OAuth config** — it authenticates through a webapp tab (`/auth/extension`) and receives an API key via `externally_connectable` messaging.

## 3. Vercel Deployment

### Environment Variables
```bash
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_URL=https://your-domain.vercel.app
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
DATABASE_URL=your-postgres-pooler-url
```

### Build Settings
`webapp/vercel.json` already sets `npx prisma generate && npm run build`. Set the project's Root Directory to `webapp/`. Deploy with `vercel --prod` or connect the Git repo.

### Custom Domain
1. Add domain in Vercel project settings
2. Update GitHub OAuth App homepage + callback URLs
3. Rebuild the extension with `PROD_API_BASE=https://your-domain` and update `manifest.json` → `externally_connectable.matches`

## 4. Extension Setup

### Development (unpacked)
1. `cd leetcode-srs-extension && npm install && npm run build` (dev build points at `http://localhost:3000`)
2. Chrome → `chrome://extensions/` → Developer mode → **Load unpacked** → select the **`dist/`** folder (not the repo root)

### Production build
```bash
PROD_API_BASE=https://your-domain.vercel.app node scripts/build.js --prod
# or for the default deployment: npm run zip  (builds + zips dist/ for the Web Store)
```

### Chrome Web Store
1. `npm run zip` → upload `leetcode-galaxy.zip` at the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Fill in listing, submit for review

## 5. Post-Deployment Checklist

- [ ] `prisma db push` applied against production DB
- [ ] GitHub sign-in works on dashboard (`/auth/signin`)
- [ ] Extension popup sign-in opens `/auth/extension`, connects, popup shows "Signed in"
- [ ] Submit a LeetCode problem → appears in dashboard History
- [ ] Accepted solution committed to `github.com/<you>/leetcode-galaxy`
- [ ] Stats/heatmap/streaks update
- [ ] Reviews tab shows the new problem at stage 0 (due +7 days)
- [ ] History sync imports a date range; re-running it creates 0 duplicates
- [ ] Offline queue: disconnect, submit, reconnect → submission arrives
- [ ] Rate limiting returns 429 when hammered

## 6. Scaling Checklist

For 100K+ users:
- [ ] Redis-based rate limiting (in-memory store is per-serverless-instance)
- [ ] Read replicas for analytics queries
- [ ] Partition `submissions` by month
- [ ] Cache `UserStat` / heatmap in Redis
- [ ] Queue GitHub commits (background jobs) instead of fire-and-forget
- [ ] Monitoring (Sentry, Vercel Analytics)

## 7. Troubleshooting

### Extension won't sign in
- Reload the extension after any rebuild (`chrome://extensions`)
- `manifest.json` → `externally_connectable.matches` must include your webapp origin
- Check the service worker console (extensions page → "service worker") for errors

### Submissions not appearing
- Content script console (leetcode.com devtools) for interceptor errors
- Service worker console for network errors
- API key present? (extension devtools → `chrome.storage.local`)
- `/api/submissions` returns 200?

### Solutions not appearing on GitHub
- Settings page → GitHub Solution Sync must say "Connected"; if not, sign out/in to grant `repo` scope
- Commits only happen for **Accepted** submissions that include code
- Check Vercel function logs for `[github-sync]` errors

### Sign-in "Server error"
- `GITHUB_ID`/`GITHUB_SECRET` in Vercel must exactly match the OAuth App (watch for O/0 lookalikes — copy-paste, never retype)
- Callback URL must be `https://<domain>/api/auth/callback/github`

### Database connection errors
- Use the pooled connection string for serverless; `DIRECT_URL` only for `db push`
