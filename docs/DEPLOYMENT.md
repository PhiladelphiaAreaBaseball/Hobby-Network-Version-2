# Deployment

## Option A: the Claude artifact (what this session ships)

```
npm install
npm run seed       # regenerate fictional demo data around today's date
npm run validate   # validate every content file against docs/CONTENT_SCHEMA.md
npm run build      # esbuild → dist/ (index.html, app.js, data/, assets/)
npm test           # unit tests
npm run e2e        # Playwright smoke + calculator checks against dist/
```

Publish `dist/index.html` with the `files` map (`app.js`, `data/**`, `assets/**`) and the capabilities
`{ db: {}, user: {}, sample: {}, assets: {}, downloads: true }`. React 18.3.1 loads from cdnjs; everything else ships with the page.
Republishing keeps the artifact's database, so saved changes survive updates.

Local preview: `npm run build && npm run serve`, then open http://localhost:4173/ (React is served from node_modules there).

## Option B: hosted SaaS (Next.js, PostgreSQL, Prisma)

The code is organized so the move is mechanical:

1. **Data**: `prisma/schema.prisma` is the target schema. `npx prisma migrate dev` creates the tables. The seed script's output (`data/demo/demo.json`) maps one-to-one onto the models.
2. **API**: `src/core/actions.ts` is the authorization + mutation layer. Each exported action becomes a route handler or server action; its permission checks (`requirePerm`, `requirePlayerAccess`, tenant scoping) stay as they are and run on the server.
3. **Persistence**: `src/core/persistence.ts` defines the adapter interface. Replace the artifact-db adapter with Prisma repositories; the read model in `src/core/select.ts` becomes server queries filtered by `leagueId` plus Postgres row-level security.
4. **Auth**: replace `DemoAuthProvider` (`src/core/auth.ts`) with a real provider (email + password, magic link, or SSO). Memberships drive RBAC exactly as now.
5. **Files**: `assets.upload` → object storage with signed, expiring URLs; enforce the per-player video limits and retention job server-side.
6. **Payments**: Stripe Checkout sessions for registration, donations and sponsorships; webhook writes `Payment` rows. The UI already models pending/succeeded/refunded states.
7. **Email/SMS/push**: `actions.notify` is the single hook for outbound notifications; add provider calls there and respect `notificationPrefs`.
8. **Domains**: route `<slug>.<base-domain>` and custom domains to `#site-<slug>` rendering (`PublicSitePage`).
9. **Calendar subscriptions**: serve `buildIcs()` output at `/api/leagues/:slug/calendar.ics?token=…` for live subscriptions.

## Operational checklist before real families use it

- Legal and security review for COPPA, state privacy law and Little League safeguarding requirements.
- Confirm the current Little League age-determination date, pitch-count table and residency rules in each league's settings.
- Volunteer background-check workflow connected to the league's authorized provider (status only is stored).
- Data retention jobs: video expiry, account deletion requests, audit log retention.
- Backups, monitoring, rate limits and an incident/abuse response contact per league.
- Replace demo personas with real accounts and delete the DVYAA/Harbor Point demo tenants.
