# Architecture

GamePlanIQ is a multi-tenant Little League operating system. This build runs **entirely on Claude** as a published artifact: a
TypeScript/React single-page application bundled with esbuild, published with its content and demo data as supporting files,
using the artifact runtime's `db`, `user`, `sample`, `assets` and `downloads` capabilities instead of Supabase or Vercel.

## Why this shape

| Decision | Reason | Trade-off |
|---|---|---|
| React 18 + TypeScript, bundled with esbuild, React loaded from cdnjs | Real codebase (typed domain model, reusable components, testable engines) while staying inside the artifact page contract | No server-side rendering; one bundle (≈520 KB) |
| Content as JSON files, never hardcoded in components | Instructors and the CMS can change lessons without touching code; the same files seed a Postgres deployment | A content validator (`npm run validate`) guards the shape |
| Seed data + mutable overlay | Demo league ships as static JSON; every change is a small document in the artifact database (or browser storage) merged over the seed | Reads merge two sources (cached per collection) |
| Authorization in `actions.ts`, not in the UI | Every mutation re-checks role, league, team and guardian ownership; menus hide what you cannot do, but the action layer enforces it | In a hosted deployment this file becomes the API |
| Demo personas instead of passwords | The user wanted to test every role without external auth | Sign-in is a per-browser convenience; a real provider replaces `DemoAuthProvider` |

## Layers

```
artifact/index.template.html   page shell (title, inline CSS, React UMD scripts, app.js)
src/main.tsx                   boot: load content + demo JSON, init capabilities, restore session, start persistence
src/app/                       App, routes (hash router), shell (rail, topbar, tab bar, persona switcher)
src/core/                      types (domain model), rbac, auth, store, persistence adapters, select (tenant read model), actions
src/engines/                   pure logic: practice generator, coach planner, scheduling conflicts, eligibility, pitch counts,
                               achievements, search, standings, ICS, turf calculator, PDF writer, draft board (ratings, snake order,
                               balance warnings), report cards (lesson recommendations), game day (lineup rules, scorebook, playing time),
                               certification (quiz grading, per-role status and renewals), importer (CSV parsing and validation), season (rollover preview),
                               notify (audience, preferences, quiet hours, link resolution), familyCalendar (one .ics feed with alarms), digest (daily/weekly summary), allstars (eligibility, ranked tally, ballot rules)
src/components/                design system (ui.tsx), icons, Diamond (SVG field), Calendar, Brand
src/features/                  one folder per product area (home, academy, parents, practice, iq, coaches, league, admin, tryouts, reports, gameday, …)
data/content/                  educational library (validated by scripts/validate-content.mjs)
data/demo/demo.json            DVYAA + Harbor Point fictional data (scripts/seed-demo.mjs)
```

## Tenant isolation

- Every tenant-owned record carries `leagueId`. `selectTenant()` builds the read model for exactly one league and pages only ever
  receive that object. Users are platform-wide; memberships bind a user to roles inside a league.
- Mutable documents are stored at `t/<leagueId>/<collection>/<id>` in the artifact database; platform documents at
  `platform/<collection>/<id>`. Switching leagues (platform admin, or the Harbor Point president persona) restarts the tenant subscription.
- `can(memberships, permission, { leagueId, teamId, divisionId })` scopes coaches to their teams and commissioners to their divisions.
  Guardians act only on their own children (`requirePlayerAccess`).
- Tests: `tests/unit/engines.test.mjs` (RBAC and demo-data integrity), `tests/unit/features.test.mjs` (draft, report cards, game day) and `tests/e2e/smoke.mjs` (Harbor Point sees no DVYAA data).
- New permissions: `league.tryouts` (commissioners for their divisions, league admins), `tryout.evaluate` (coaches, commissioners; an evaluator must also be assigned to the tryout), `team.gameday` (coaches of that team; scorekeepers assigned to a game's duty and umpires on the game may also keep score).
- Tryout pools and draft pools are derived from registrations for the season and division, never stored, so late registrations appear automatically. Finalizing a draft records picks and only moves players onto rosters when the commissioner chooses to.

## Routing

The artifact host passes only plain `#name` hashes, so routes are flat tokens (`#lesson-hit-01`, `#admin-calculator-p400-f300-l150-t100-c150000`)
parsed by known prefixes. Deep links and the calculator's share links work inside and outside the viewer.

## Persistence modes

| Mode | When | Behaviour |
|---|---|---|
| `artifact-db` | Signed-in viewer inside Claude | Live `onSnapshot` per collection, optimistic writes, shared across devices and viewers with access |
| `local` | Signed-out viewer, local preview | Browser storage; badge says "This browser only" |
| `memory` | Storage unavailable | Kept for the visit only |

## Safety and privacy by design

Guardian-managed child accounts, no public player profiles, players cannot send messages, guardians see every team conversation,
consent toggles per child with a consent log, video review behind consent with retention and upload limits, background checks stored as
status only, audit log for sensitive actions, no leaderboards. See docs/DEPLOYMENT.md for the legal/security review required before production.
