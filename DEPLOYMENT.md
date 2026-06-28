# LeetCode Galaxy — Deployment Guide

## 1. Database Setup (Supabase Recommended)

1. Create a project at [Supabase](https://supabase.com)
2. Go to Project Settings → Database → Connection String
3. Copy the `URI` connection string (choose the Transaction Pooler for serverless)
4. Set `DATABASE_URL` in your Vercel env vars

```bash
# Supabase Transaction Pooler (recommended for serverless)
DATABASE_URL=postgresql://postgres.xxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# For Prisma migrations (Direct Connection)
DIRECT_URL=postgresql://postgres.xxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

5. Run migrations:
```bash
cd webapp
npx prisma migrate deploy
npx prisma generate
```

## 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: **Web application**
5. Authorized redirect URIs:
   - `https://your-domain.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for dev)
6. Copy Client ID and Client Secret

### Extension OAuth
The extension uses the **same** Google OAuth client ID via `chrome.identity.launchWebAuthFlow`.

You need to add the extension's OAuth redirect URI:
- Format: `https://<EXTENSION_ID>.chromiumapp.org/`
- To find your extension ID: load the extension in Chrome developer mode, the ID is shown on the extensions page
- Add `https://YOUR_EXTENSION_ID.chromiumapp.org/` to Authorized redirect URIs

Update `leetcode-srs-extension/manifest.json`:
```json
"oauth2": {
  "client_id": "YOUR_GOOGLE_CLIENT_ID",
  "scopes": ["openid", "email", "profile"]
}
```

## 3. Vercel Deployment

### Environment Variables
```bash
AUTH_SECRET=$(openssl rand -base64 32)  # Generate a random secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
DATABASE_URL=your-supabase-pooler-url
DIRECT_URL=your-supabase-direct-url
```

### Build Settings
Vercel auto-detects Next.js. Just connect your Git repo and deploy.

Make sure to add these build commands in Vercel project settings:
```bash
# Build Command
prisma generate && next build

# Install Command
npm install
```

### Custom Domain (Recommended)
1. Buy a domain (e.g., `lc-galaxy.com`)
2. Add it to Vercel project settings
3. Update `API_BASE` in extension files to `https://lc-galaxy.com`
4. Update Google OAuth redirect URIs with custom domain

## 4. Extension Setup

### Development (Unpacked)
1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked** → Select `leetcode-srs-extension` folder
4. Update `API_BASE` in `background.js` and `content.js` to `http://localhost:3000`
5. Update `manifest.json` `oauth2.client_id` with your Google Client ID

### Production (Chrome Web Store)
1. Create a ZIP of the `leetcode-srs-extension` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. Upload the ZIP
4. Fill in store listing details
5. Submit for review

## 5. Post-Deployment Checklist

- [ ] Database migrations applied successfully
- [ ] Google OAuth sign-in works on dashboard
- [ ] Extension sign-in works and returns API key
- [ ] Submission tracking works (submit a LeetCode problem)
- [ ] Dashboard shows new submission in Recent Submissions
- [ ] Stats update correctly (total solved, streaks)
- [ ] Heatmap shows activity
- [ ] History page paginates correctly
- [ ] Offline queue works (disconnect internet, submit, reconnect)
- [ ] Rate limiting responds with 429 when exceeded
- [ ] Re-authentication flow works (revoke API key, extension prompts re-sign-in)

## 6. Scaling Checklist

For 100K+ users:
- [ ] Migrate from in-memory rate limiting to Redis (Upstash)
- [ ] Add PostgreSQL read replicas for analytics queries
- [ ] Partition `submissions` table by month
- [ ] Add Redis caching for `UserStat` and `getSubmissionHeatmap`
- [ ] Set up monitoring (Sentry, Vercel Analytics)
- [ ] Configure CDN for static assets
- [ ] Implement tiered rate limits (free vs paid users)
- [ ] Add database connection pooling (PgBouncer already in Supabase)

## 7. Troubleshooting

### Extension won't sign in
- Check `oauth2.client_id` in manifest.json matches Google Console
- Verify redirect URI `https://<EXT_ID>.chromiumapp.org/` is in Google Console
- Check extension ID in Chrome developer mode matches the redirect URI

### Submissions not appearing
- Check browser console for content script errors
- Check background service worker console for network errors
- Verify API key is valid (check `chrome.storage.local` in extension devtools)
- Check `/api/submissions` responds with 200

### Database connection errors
- Ensure `DATABASE_URL` uses the Transaction Pooler (port 6543) for serverless
- Use `DIRECT_URL` (port 5432) only for Prisma migrations
- Check connection limit isn't exceeded

### Build fails on Vercel
- Ensure `prisma generate` runs before `next build`
- Check that `DATABASE_URL` is set in Vercel environment variables
- Verify `next.config.ts` doesn't have invalid config
