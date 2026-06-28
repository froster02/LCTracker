# LeetCode Galaxy

> A production-ready SaaS platform that automatically tracks LeetCode submissions and visualizes your progress with rich analytics.

## Architecture Overview

```
Chrome Extension (Manifest V3)
  ├─ Content Script: Intercepts LeetCode submissions
  ├─ Background Worker: Offline queue, retry logic, auth
  └─ Popup: Sign in, sync history, queue status

Web Dashboard (Next.js 15 + TypeScript)
  ├─ Landing Page
  ├─ Auth (Google OAuth via Auth.js v5)
  ├─ Dashboard: Heatmaps, charts, stats, streaks
  ├─ History: Paginated submission table
  └─ Settings: Extension setup guide

Backend (Next.js API Routes + Prisma + PostgreSQL)
  ├─ Auth: /api/auth/*, /api/extension/auth
  ├─ Submissions: /api/submissions
  ├─ Analytics: /api/analytics/*, /api/stats
  ├─ Sync: /api/sync/history
  └─ Security: Rate limiting, CORS, Zod validation
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Auth | Auth.js v5 (NextAuth) + Google OAuth |
| Backend | Next.js API Routes (Serverless) |
| Database | PostgreSQL via Prisma ORM |
| Extension | Manifest V3, vanilla JS |
| Hosting | Vercel |

## Database Schema

### Tables

- **users** — Google OAuth identity, auto-created on sign-in
- **submissions** — Every tracked submission with full metadata (problem, language, runtime, memory, status, timestamp)
- **problems** — Canonical LeetCode problem metadata
- **user_stats** — Materialized aggregates (total solved, streaks, acceptance rate, difficulty breakdown)
- **api_keys** — Hashed API keys for Chrome Extension authentication
- **contest_participations** — Future-ready for contest stats

### Key Design Decisions

- **Deduplication**: Submissions are deduplicated by `(userId, problemId, submittedAt ± 5 min)`
- **Stats are materialized**: `UserStat` table is updated on every submission for fast dashboard reads
- **API keys expire**: 30-day rotation with automatic refresh in the extension

## Authentication Flow

### Dashboard (Web)
1. User clicks "Sign in with Google"
2. Auth.js handles OAuth 2.0 flow
3. User record is created/updated in `users` table
4. Session cookie is stored

### Chrome Extension
1. User clicks "Sign in with Google" in popup
2. Extension uses `chrome.identity.launchWebAuthFlow` for OAuth
3. Receives Google ID token
4. Exchanges ID token for API Key via `/api/extension/auth`
5. Stores API key securely in `chrome.storage.local`
6. All future submissions use `x-api-key` header

### Re-authentication
- Extension detects 401 responses and triggers re-auth popup
- Old API keys are revoked on new sign-in
- Queue processing pauses when auth is invalid and resumes after re-auth

## Chrome Extension Features

- **Real-time Detection**: Intercepts LeetCode's GraphQL API calls to capture submission metadata
- **Full Metadata**: Problem ID, name, difficulty, language, runtime (ms), memory (MB), status, URL, timestamp
- **Offline Queue**: Failed submissions are stored in `chrome.storage.local` with retry logic
- **Exponential Backoff**: Retry delay = `2^attempts` seconds, capped at 60s, max 5 attempts
- **SPA Navigation**: Handles LeetCode's single-page navigation via MutationObserver
- **History Sync**: Bulk import past submissions from LeetCode's API
- **Progress UI**: Popup shows sync progress and queue status

## Dashboard Features

### Analytics Cards
- Total Problems Solved
- Current Streak / Longest Streak
- Easy / Medium / Hard Breakdown
- Acceptance Rate
- Total Submissions

### Charts
- **Calendar Heatmap**: GitHub-style activity grid (last 12 months)
- **Language Chart**: Pie chart of language usage distribution
- **Performance Trends**: Line chart of runtime and memory over time
- **Monthly Activity**: Bar chart of problems solved per month
- **Difficulty Donut**: Conic gradient breakdown by difficulty

### Tables
- **Recent Submissions**: Last 10 submissions with full details
- **Full History**: Paginated table with filtering by status, difficulty, language, date range

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | Cookie | Auth.js OAuth routes |
| POST | `/api/extension/auth` | — | Exchange Google ID token for API key |
| POST | `/api/extension/refresh` | API Key | Refresh API key |
| POST | `/api/submissions` | API Key/Cookie | Create new submission |
| GET | `/api/submissions` | Cookie | Get paginated history |
| GET | `/api/stats` | Cookie | Get user stats + recent submissions |
| GET | `/api/analytics/heatmap` | Cookie | Daily submission counts |
| GET | `/api/analytics/languages` | Cookie | Language distribution |
| GET | `/api/analytics/streaks` | Cookie | Current/longest streaks |
| GET | `/api/analytics/monthly` | Cookie | Monthly activity |
| GET | `/api/analytics/performance` | Cookie | Runtime/memory trends |
| POST | `/api/sync/history` | API Key | Bulk import (up to 1000) |

## Security

- **Rate Limiting**: 60 req/min per IP for submissions, 10 req/min for auth, 120 req/min for dashboard reads
- **API Keys**: SHA-256 hashed, 30-day expiry, revocable
- **CORS**: Extension API routes allow cross-origin requests with `x-api-key` header
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Input Validation**: Strict Zod schemas for all API inputs
- **Row-level Access**: Users can only access their own data via `userId` filtering

## Scaling Strategy (100K+ Users)

1. **Database**: PostgreSQL with connection pooling (PgBouncer), read replicas for analytics, monthly partitioning on `submissions.submittedAt`
2. **Caching**: Redis for user stats (5 min TTL), CDN for static assets
3. **Rate Limiting**: Distributed Redis-based rate limiting (replace in-memory store)
4. **Batching**: Extension sends submissions in batches, bulk sync endpoint for history
5. **Edge Functions**: Use Vercel Edge for simple reads; Serverless Functions for writes

## Deployment

### Prerequisites
- Vercel account
- PostgreSQL database (Supabase, Railway, or self-hosted)
- Google OAuth 2.0 credentials

### Environment Variables
```bash
AUTH_SECRET=your-random-32-char-secret
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # For Prisma migrations
```

### Steps
1. Set up PostgreSQL and run `npx prisma migrate deploy`
2. Configure Google OAuth with your Vercel domain as authorized redirect URI
3. Update `leetcode-srs-extension/manifest.json` with your Google OAuth `client_id`
4. Update `API_BASE` in extension files to your Vercel domain
5. Deploy webapp to Vercel
6. Publish extension to Chrome Web Store (or load unpacked for testing)

## Development

### Webapp
```bash
cd webapp
npm install
npx prisma generate
npm run dev
```

### Extension
1. Open Chrome → Extensions → Developer Mode ON
2. Load Unpacked → Select `leetcode-srs-extension` folder
3. Update `API_BASE` to `http://localhost:3000`
4. Ensure your Google OAuth client allows `http://localhost:3000` redirect

## Project Structure

```
LCTracker/
├── ARCHITECTURE.md               # Full architecture document
├── webapp/
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── api/              # API routes
│   │   │   ├── dashboard/        # Dashboard + history pages
│   │   │   ├── auth/signin/        # Sign-in page
│   │   │   ├── settings/           # Settings page
│   │   │   ├── layout.tsx          # Root layout
│   │   │   └── page.tsx            # Landing page
│   │   ├── components/           # UI components
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── StatsCards.tsx
│   │   │   ├── CalendarHeatmap.tsx
│   │   │   ├── DifficultyDonut.tsx
│   │   │   ├── LanguageChart.tsx
│   │   │   ├── StreakCard.tsx
│   │   │   ├── RecentSubmissions.tsx
│   │   │   ├── PerformanceChart.tsx
│   │   │   ├── SubmissionTrends.tsx
│   │   │   └── Navbar.tsx
│   │   ├── lib/                  # Utilities
│   │   │   ├── auth.ts             # Auth.js config
│   │   │   ├── prisma.ts           # Prisma client
│   │   │   ├── api-keys.ts         # API key utilities
│   │   │   ├── stats.ts            # Stats calculation
│   │   │   ├── schemas.ts          # Zod schemas
│   │   │   └── rate-limit.ts       # Rate limiting
│   │   └── middleware.ts         # Next.js middleware
│   ├── package.json
│   ├── next.config.ts
│   └── .env.example
└── leetcode-srs-extension/
    ├── manifest.json             # Manifest V3
    ├── background.js             # Service worker
    ├── content.js                # Submission detection
    ├── popup.html                # Popup UI
    ├── popup.js                  # Popup logic
    ├── popup.css                 # Popup styles
    └── icon.png                  # Extension icon
```

## License

MIT
