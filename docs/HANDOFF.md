# Handoff: continuing the GamePlanIQ build in a new chat

## Where things live
- **Published app (Claude artifact):** https://claude.ai/artifact/K8t2w35433THXNjagfhfqF
  To update it from a new conversation, publish `dist/index.html` with `url` set to that link (a publish without `url` creates a separate artifact).
  Supporting files to publish with `root: "dist"`: `app.js`, `assets/gameplaniq-logo.png`, every file in `data/content/`, and `data/demo/demo.json`.
  Capabilities already declared and carried forward: `db`, `user`, `sample`, `assets`, `downloads`.
- **Repository branches:** `claude/gameplaniq-restore-source-ceah9g` (current session) and `claude/little-league-platform-hkhs8v` point at the same tree and are pushed to GitHub. A pull request from `claude/gameplaniq-restore-source-ceah9g` to `main` carries the whole build.
- **Source snapshot inside the artifact:** asset `ce1ed5c13f55fc32940bd930f9c9675d` (`gameplaniq-src-latest.tar.gz.b64.txt`) is a base64 git archive of commit `dcfbe0d`. GitHub is the primary copy; snapshots are a backup. Older: `36f409687132973b001bc71cc0b6e3bd` (`7725431`), `8fae46aa91cc16ddd60d5198d1f9360f` (`48d1243`), `abedcec1840412e788b8a00d06cfe00f` (`c15c4a3`), `ca93130d219b2680246105d8342a6006` (`a14f253`), `0e8b890c0eb0987522b65080df24e293` (`ffeb88f`), `68b479f81639291736dbd6f555ba7ee9` (`f61bbe1`), `4120a9218e4441eb8a9f9d57ac612f07` (`01f9ed6`).

## Round-four features (where they live)
- Safety: `#admin-safety` (incidents, safety plan, kit checks); `IncidentModal` is reused from Coaches' HQ and the umpire page. Permission `league.safety` (Kwame Mbeki has it as the safety officer).
- Umpires: `#admin-umpires`; pay rates in league settings `umpires`; payments of kind `umpire_pay`. Permission `league.umpires`.
- Season close-out: `#admin-season`; archive at `#season-<seasonId>`; content in `data/content/season-close.json`.
- Surveys: `#admin-surveys`; families answer at `#survey-<id>`; templates in `data/content/surveys.json`.
- Budget: Finance → Budget vs actual (`budgets` collection). Recap: `#recap-<playerId>`. Carpool and Photos: team page tabs.
- Share link: Branding tab; demo token `board2026demo` → `#view-dvyaa-board2026demo`.
- Content versions: Academy content → League changes (`contentVersions` collection).

## Running a demo
- Open `#demo-guide` (Presenter guide in the rail, or from the welcome page) for the 20-minute script; every step has a Go button.
- Reset demo data from the persona switcher or the guide before presenting. Shared-database resets need the artifact owner.
- Dates: `npm run seed` stamps `meta.seededOn`; the app shifts all demo dates to today on load, so no re-seed is needed between demos. Set `localStorage gameplaniq:v1:freezeDates=1` to see the seed as generated.
- New league: Platform (Alex Chen) → Onboard a league. The platform operator can then open any league from the Leagues tab.

## Rebuild and verify
```
npm install
npm run validate      # content files
npm run seed          # regenerate demo data around today's date
npm run build         # dist/
npm test              # unit tests (engines, RBAC, data integrity, drill videos, draft, report cards, game day)
npm run e2e           # Playwright smoke across roles + calculator checks
```

## Product state
- League: **DVYAA** (internal id `lg_riverside` kept for saved-data compatibility) with divisions T-ball, Coach pitch, Minor, Major; a second tenant, Harbor Point, proves isolation.
- Personas: Kenny Koplove (president), Mark Galasso (head coach, Minor Comets), Tyler Hill (parent of Jack and Owen), Steve Koplove (treasurer), plus generic male names elsewhere. "Go into demo mode" signs in as Tyler.
- Field Improvement Fund Calculator under Administration (and admin dashboard / Finance).
- **Tryouts & draft** under Administration (`#admin-tryouts`): tryout scoring board (`#tryout-<id>`, open to assigned evaluators), live snake draft board (`#draft-<id>`, coaches pick on the clock). Demo: Minor tryout complete + draft live; Major tryout upcoming with Mark Galasso as an evaluator.
- **Report cards**: Coaches' HQ → team tools → Report cards tab; families open `#report-<id>` from the player dashboard, team page or home. Jack Hill has a published mid-season card.
- **Game day** (`#gameday-<eventId>`): lineup card, scorebook with pitch counts, finalize → result + standings + pitching appearances. Linked from the event page, team page, Coaches' HQ and the coach strip on Home. Engines: `src/engines/gameDay.ts`, `draft.ts`, `reportCard.ts`.
- **Run practice** (`#run-<planId>`, no app shell): any saved plan runs as a full-screen timer; "Run this practice" on the planner saves the plan first. Demo team plan `plan_team_demo1` (Comets).
- **Coach certification** (`#coaches-certification`, modules at `#cert-<moduleId>`): content in `data/content/certification.json` (six modules, quizzes, pass mark 80). Records in the `certifications` collection; admin view is the Coach certification tab in Volunteers. Demo: Mark Galasso is missing the heat/lightning module.
- **Digest**: `src/engines/digest.ts` + `DigestCard` on Home and the notification center; text export via the shared ExportModal.
- **All-Stars**: Administration → Tryouts, draft & All-Stars → All-Stars tab; pool page `#allstars-<poolId>`. Engine `src/engines/allstars.ts`. Demo: 11-12 pool in voting (4 of 6 ballots), 9-10 pool taking nominations (Comets have none yet so Mark can nominate).
- **Notifications**: `actions.notify` is the single entry point and applies `src/engines/notify.ts` rules (preferences, quiet hours → `deliverAt`, dedupe). The center is `#notifications`; links are plain route tokens resolved with `parseRoute`. Communications has the rules table and manual reminder buttons (duties today/tomorrow, certification renewals); a scheduler would call `sendDutyReminders` and `sendCertificationReminders` daily in a hosted deployment.
- **Family calendar**: `src/engines/familyCalendar.ts`; Schedule → "Family calendar" and "Add to my calendar" on event pages.
- **Season rollover**: Seasons & settings → Seasons → "Roll over to the next season" (preview, acknowledgement, then `actions.rolloverSeason`). Standings pass `t.activeSeason?.id` so old seasons stop counting.
- **CSV import**: Players & guardians → Import CSV (`src/engines/importer.ts`, `actions.importPlayers`). Template in `IMPORT_TEMPLATE`.
- **Team game-day duties**: team page → Sign-ups tab (families claim snacks, scorekeeper, pitch counter, dugout parent); coaches manage from team tools → Game-day duties. Stored as `VolunteerShift` with `teamId`/`eventId`; league volunteer pages exclude them.
- Drill video library: `data/content/drill-videos.json` holds one oEmbed-verified YouTube video per drill (target 50). Edit per drill in Administration → Academy content → Videos. Research part files, if any remain, are merged with `npm run merge-videos`.

## Open items
- Push to GitHub (access).
- More drill videos beyond the first 50; lesson-level production videos (placeholders today).
- Hosted deployment steps in docs/DEPLOYMENT.md (payments, email/SMS, auth, domains).

See docs/CHECKLIST.md for the full implemented/partial/integration matrix.
