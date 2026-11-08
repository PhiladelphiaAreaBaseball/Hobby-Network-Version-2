# Handoff: continuing the GamePlanIQ build in a new chat

## Where things live
- **Published app (Claude artifact):** https://claude.ai/artifact/K8t2w35433THXNjagfhfqF
  To update it from a new conversation, publish `dist/index.html` with `url` set to that link (a publish without `url` creates a separate artifact).
  Supporting files to publish with `root: "dist"`: `app.js`, `assets/gameplaniq-logo.png`, every file in `data/content/`, and `data/demo/demo.json`.
  Capabilities already declared and carried forward: `db`, `user`, `sample`, `assets`, `downloads`.
- **Repository branches:** `claude/gameplaniq-restore-source-ceah9g` (current session) and `claude/little-league-platform-hkhs8v` point at the same restored tree. Pushing is blocked (403 from both `git push` and the GitHub app API) until the Claude GitHub App is installed for `PhiladelphiaAreaBaseball/Hobby-Network-Version-2` or GitHub is reconnected from claude.ai settings.
- **Source snapshot inside the artifact:** asset `4120a9218e4441eb8a9f9d57ac612f07` (`gameplaniq-src.tar.gz.b64.txt`) is a base64 git archive of commit `01f9ed6`. Restore with `base64 -d > src.tar.gz && tar -xzf src.tar.gz`, then `npm install`. Refresh this snapshot after major changes while GitHub remains unreachable.

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
- **Team game-day duties**: team page → Sign-ups tab (families claim snacks, scorekeeper, pitch counter, dugout parent); coaches manage from team tools → Game-day duties. Stored as `VolunteerShift` with `teamId`/`eventId`; league volunteer pages exclude them.
- Drill video library: `data/content/drill-videos.json` holds one oEmbed-verified YouTube video per drill (target 50). Edit per drill in Administration → Academy content → Videos. Research part files, if any remain, are merged with `npm run merge-videos`.

## Open items
- Push to GitHub (access).
- More drill videos beyond the first 50; lesson-level production videos (placeholders today).
- Hosted deployment steps in docs/DEPLOYMENT.md (payments, email/SMS, auth, domains).

See docs/CHECKLIST.md for the full implemented/partial/integration matrix.
