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

## Native-style delivery (installable app, push, offline schedule)

The artifact build cannot register a service worker or a web-app manifest, so these are deployment tasks for Option B, not
something to fake in the demo:

1. **Web app manifest** at `/manifest.webmanifest` (name GamePlanIQ, league colors from `League.colors`, the logo asset as
   icons at 192 and 512 px, `display: standalone`, `start_url: /#home`). Families add the app to their home screen from Safari
   or Chrome; no app store listing is needed for a league.
2. **Service worker** that precaches the shell (`index.html`, `app.js`, content JSON) and caches the tenant's `events`,
   `teams`, `players` and `notifications` reads with a stale-while-revalidate policy, so the schedule, duties and carpools open at a
   field with no signal. Writes (score, attendance, sign-ups) queue in IndexedDB and replay when the connection returns; the
   actions layer is already idempotent by document id, so replays are safe.
3. **Push notifications** through Web Push (VAPID keys in the environment). The notification rules engine already decides
   audience, category and quiet hours; the push adapter sends the same `Notification` document the in-app center stores,
   honouring `deliverAt`. Email and SMS adapters sit beside it (see the communications settings).
4. **Offline-first scorebook**: the game-day sheet is small; keep it in IndexedDB keyed by event and sync on `finalizeGame`.

Until deployment, the demo is a web page: the family calendar feed (`.ics`) is the way reminders reach phones today.

## Operational checklist before real families use it

- Legal and security review for COPPA, state privacy law and Little League safeguarding requirements.
- Confirm the current Little League age-determination date, pitch-count table and residency rules in each league's settings.
- Volunteer background-check workflow connected to the league's authorized provider (status only is stored).
- Data retention jobs: video expiry, account deletion requests, audit log retention.
- Backups, monitoring, rate limits and an incident/abuse response contact per league.
- Replace demo personas with real accounts and delete the DVYAA demo tenant.
