# LeetCode Galaxy — Webapp

Next.js 16 dashboard + API for [LeetCode Galaxy](../README.md). See the root README for the full picture (features, self-hosting, architecture).

## Dev

```bash
npm install
cp .env.example .env.local   # fill in values (GitHub OAuth App + Postgres)
npx prisma generate
npx prisma db push           # sync schema (this repo uses db push, not migrations)
npm run dev                  # localhost:3000
```

Checks: `npm run lint` · `npx tsc --noEmit` · `npm run build`

Deploy: [../DEPLOYMENT.md](../DEPLOYMENT.md)
