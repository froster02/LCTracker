# LeetTracker02 — Architecture & Implementation Plan

> Production-ready SaaS for tracking LeetCode submissions with a Chrome Extension + Web Dashboard.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│  ┌──────────────────┐          ┌────────────────────────────┐   │
│  │ Chrome Extension │◄────────►│ leetcode.com (content    │   │
│  │ (Manifest V3)    │          │   script monitors SPA)   │   │
│  │  - Service Worker│          └────────────────────────────┘   │
│  │  - OAuth (GitHub)│                                           │
│  │  - Offline Queue │                                           │
│  └────────┬─────────┘                                           │
│           │ HTTPS POST /api/submissions                         │
│           │ (Bearer JWT + API Key)                                │
│           ▼                                                     │
│  ┌──────────────────┐                                           │
│  │  Web Dashboard   │                                           │
│  │  (Next.js 15)    │                                           │
│  │  - Auth.js OAuth │                                           │
│  │  - Recharts UI   │                                           │
│  └────────┬─────────┘                                           │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL HOSTING                               │
│  ┌──────────────────┐          ┌────────────────────────────┐   │
│  │  Next.js App      │          │  API Routes (Serverless)   │   │
│  │  - SSR Pages      │          │  - /api/auth/*  (Auth.js)  │   │
│  │  - Static Assets  │          │  - /api/submissions        │   │
│  └──────────────────┘          │  - /api/analytics/*        │   │
│                                │  - /api/sync               │   │
│                                └────────────┬───────────────┘   │
│                                             │                   │
│                                ┌────────────▼────────────┐      │
│                                │    Prisma ORM         │      │
│                                │  (Connection Pool)    │      │
│                                └────────────┬──────────┘      │
└─────────────────────────────────────────────┼────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE / POSTGRES                          │
│  - users (synced from GitHub OAuth)                               │
│  - submissions (detailed per-submission records)                   │
│  - problems (canonical LeetCode problem metadata)                  │
│  - user_stats (materialized aggregates for fast reads)             │
│  - contest_participations (future-ready)                           │
│  - api_keys (for extension auth)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (Prisma)

```prisma
// User — synced from GitHub OAuth
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  githubId      String?   @unique
  githubLogin   String?
  githubAccessToken String?  // AES-256-GCM encrypted; used for solution repo sync
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  submissions   Submission[]
  stats         UserStat?
  apiKeys       ApiKey[]
  contestParticipations ContestParticipation[]
}

// Submission — every LeetCode submit captured by the extension
model Submission {
  id            String    @id @default(cuid())
  userId        String
  problemId     String    // LeetCode problem number
  problemName   String
  titleSlug     String
  difficulty    String    // Easy | Medium | Hard
  language      String
  runtime       Int?      // ms
  memory        Int?      // MB
  status        String    // Accepted | Wrong Answer | TLE | MLE | etc.
  codeLength    Int?      // characters
  url           String
  submittedAt   DateTime  @default(now())
  
  user          User      @relation(fields: [userId], references: [id])
}

// Problem — canonical metadata (can be populated from LeetCode API or manually)
model Problem {
  id            String    @id @default(cuid())
  problemId     String    @unique // LeetCode number
  title         String
  titleSlug     String    @unique
  difficulty    String
  tags          String[]  // e.g. ["array", "two-pointers"]
  totalAccepted Int       @default(0)
  totalSubmitted Int      @default(0)
}

// UserStat — materialized aggregates (updated on each submission)
model UserStat {
  id              String   @id @default(cuid())
  userId          String   @unique
  totalSolved     Int      @default(0)
  easySolved      Int      @default(0)
  mediumSolved    Int      @default(0)
  hardSolved      Int      @default(0)
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastSubmissionDate DateTime?
  acceptanceRate  Float    @default(0)
  
  user            User     @relation(fields: [userId], references: [id])
}

// ApiKey — secure key for Chrome Extension authentication
model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  keyHash   String   @unique
  name      String   // e.g. "Chrome Extension"
  lastUsedAt DateTime?
  createdAt DateTime @default(now())
  expiresAt DateTime?
  revoked   Boolean  @default(false)
  
  user      User     @relation(fields: [userId], references: [id])
}

// ContestParticipation — future-ready for LeetCode contests
model ContestParticipation {
  id          String   @id @default(cuid())
  userId      String
  contestName String
  rank        Int?
  score       Int?
  problemsSolved Int?
  rating      Int?
  ratingDelta Int?
  participatedAt DateTime
  
  user        User     @relation(fields: [userId], references: [id])
}
```

---

## 3. Authentication Flow

### Dashboard Auth (Auth.js v5 + GitHub OAuth)
1. User visits dashboard → clicks Sign in with GitHub
2. Auth.js handles OAuth 2.0 flow with GitHub (scope: `read:user user:email repo`)
3. Backend upserts `User` (githubId, githubLogin, encrypted access token)
4. Session cookie stored in browser
5. Dashboard reads session via `useSession()` / `auth()`

### Extension Auth (tab-based + API Key)
1. Extension popup → "Sign in with GitHub" button
2. Background opens a tab at `{webapp}/auth/extension?ext_id={extensionId}`
3. Page (session-authenticated via GitHub OAuth) mints an API key and delivers it
   with `chrome.runtime.sendMessage(extId, …)` (`externally_connectable`)
4. Service worker stores the key in `chrome.storage.local`; a
   `chrome.storage.session` poll survives MV3 worker sleep during the flow
5. All future submissions use `x-api-key` header for authentication

### GitHub Solution Sync
- On every **Accepted** submission carrying code, the server commits
  `{Difficulty}/{titleSlug}/solution.{ext}` + a metadata README to the user's
   `leettracker02` repo (created private on first use) using the stored
  encrypted token. Fire-and-forget: repo failures never block ingest.

### Token Refresh Strategy
- Extension stores `apiKey` + `apiKeyExpiry`
- Before each submission, checks expiry; if near expiry, calls `/api/extension/refresh`
- Backend returns new API Key if the old one is valid
- If API Key is revoked or expired, extension shows re-authentication popup

---

## 4. API Design

### Auth Routes
```
GET  /api/auth/[...nextauth]       — Auth.js OAuth routes
POST /api/extension/auth-session   — Mint API key from the signed-in session
POST /api/extension/refresh        — Refresh API Key
POST /api/extension/logout         — Revoke API Key
```

### Submission Routes
```
POST /api/submissions              — Create new submission (extension)
GET  /api/submissions              — Get user's submission history (paginated)
GET  /api/submissions/stats        — Get submission statistics
GET  /api/submissions/heatmap      — Get daily submission counts for heatmap
GET  /api/submissions/languages    — Get language usage distribution
GET  /api/submissions/streaks      — Get current and longest streaks
```

### Sync Routes
```
POST /api/sync/history             — Bulk import historical submissions
```

---

## 5. Chrome Extension Architecture

```
extension/
├── manifest.json              — Manifest V3
├── background.ts              — Service worker (offline queue, sync, auth)
├── content.ts                 — Content script (SPA submission detection)
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── auth/
│   └── github-sync.ts         — Commit accepted solutions to the user's repo
├── lib/
│   ├── api.ts                 — API client with retry logic
│   ├── queue.ts               — Offline submission queue
│   └── storage.ts             — Secure storage wrapper
├── types/
│   └── index.ts
└── tsconfig.json
```

### Key Features
- **Submission Detection**: MutationObserver on SPA + intercept fetch/XHR for LeetCode's submission API
- **Metadata Capture**: Problem ID, name, difficulty, language, runtime, memory, status, timestamp, URL
- **Offline Queue**: IndexedDB or chrome.storage.local for queueing submissions
- **Retry Logic**: Exponential backoff with jitter
- **Re-auth Detection**: 401 responses trigger sign-in popup
- **Minimal Permissions**: `storage`, `activeTab`, `host: leetcode.com`

---

## 6. Dashboard Architecture

```
app/
├── page.tsx                     — Landing page
├── auth/signin/page.tsx         — Sign-in page
├── dashboard/page.tsx           — Main dashboard (protected)
├── dashboard/history/page.tsx   — Full submission history
├── dashboard/contests/page.tsx  — Contest stats (future)
├── api/                         — API routes
├── layout.tsx                   — Root layout with providers
└── globals.css                  — Tailwind + theme

components/
├── ui/                          — shadcn/ui components
├── Navbar.tsx                   — Navigation
├── StatsCards.tsx               — KPI cards (total, easy, med, hard, streak)
├── CalendarHeatmap.tsx          — GitHub-style heatmap
├── LanguageChart.tsx            — Language usage pie/bar chart
├── DifficultyChart.tsx          — Difficulty distribution
├── SubmissionTrends.tsx         — Line chart of submissions over time
├── RecentSubmissions.tsx        — Table of recent submissions
├── StreakCard.tsx               — Current + longest streak display
├── PerformanceChart.tsx         — Runtime / memory trends
└── FilterBar.tsx                — Date range + difficulty + language filters
```

---

## 7. Security Considerations

1. **API Key Security**
   - API Keys are hashed with bcrypt/scrypt before storage
   - Only the raw key is shown once during creation
   - Keys have expiration (30 days) and can be revoked

2. **Rate Limiting**
   - `/api/submissions`: 60 req/min per API key (normal usage)
   - `/api/sync/history`: 5 req/hour per user (bulk import)
   - Dashboard API: 120 req/min per session
   - Using Vercel KV or Upstash Redis for rate limiting

3. **Data Validation**
   - Strict Zod schemas for all API inputs
   - Sanitize problem names, URLs
   - Validate difficulty enum
   - Enforce max payload size (1MB)

4. **CORS**
   - Extension origin allowed only for POST /api/submissions
   - Dashboard API routes require session cookie

5. **Database Security**
   - Row-level security (RLS) if using Supabase
   - Connection pooling (PGBouncer)
   - Prepared statements via Prisma

---

## 8. Scaling Strategy (100K+ Users)

1. **Database**
   - PostgreSQL with connection pooling (PgBouncer)
   - Read replicas for analytics queries
   - Materialized views for aggregated stats (UserStat table)
   - Partitioning submissions by `submittedAt` (monthly)

2. **Caching**
   - Redis for user stats (cache for 5 min)
   - Redis for leaderboard / public data (cache for 1 hour)
   - CDN for static assets (Vercel Edge)

3. **Rate Limiting**
   - Distributed rate limiting with Redis
   - Tiered limits: free vs paid users

4. **Extension Sync**
   - Batch submissions (send up to 10 at once)
   - Deduplication on backend using `problemId + submittedAt`

5. **Vercel**
   - Use Edge Functions for simple reads
   - Serverless Functions for writes
   - ISR for public pages

---

## 9. Vercel Deployment Plan

```
# Environment Variables
AUTH_SECRET=<random-32-char-string>
GITHUB_ID=<github-oauth-client-id>
GITHUB_SECRET=<github-oauth-client-secret>
DATABASE_URL=postgresql://... (or Supabase connection string)
DIRECT_URL=postgresql://... (for Prisma migrations)
REDIS_URL=redis://... (Upstash)
API_KEY_SALT=<random-string>

# Build
vercel --prod

# Database
npx prisma migrate deploy
npx prisma generate
```

---

## 10. Implementation Roadmap

### Phase 1: MVP (Week 1-2)
- [x] Database schema (Prisma + PostgreSQL)
- [x] Auth.js setup with GitHub OAuth
- [x] Extension API key authentication
- [x] Basic submission capture + storage
- [x] Dashboard with stats cards + heatmap

### Phase 2: Analytics (Week 3)
- [ ] Language usage chart
- [ ] Submission trends over time
- [ ] Performance metrics (runtime/memory)
- [ ] Streak calculation (current + longest)
- [ ] Full submission history table

### Phase 3: Robustness (Week 4)
- [ ] Offline queue in extension
- [ ] Retry with exponential backoff
- [ ] Rate limiting
- [ ] Bulk history sync
- [ ] Re-authentication flow

### Phase 4: Polish & Scale (Week 5+)
- [ ] Contest statistics
- [ ] Public profile pages
- [ ] Leaderboards
- [ ] Dark mode optimization
- [ ] Mobile responsive dashboard
- [ ] Performance monitoring (Sentry)
```
