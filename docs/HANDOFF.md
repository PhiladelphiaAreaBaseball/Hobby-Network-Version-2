# Handoff: continuing the GamePlanIQ build in a new chat

## Where things live
- **Published app (Claude artifact):** https://claude.ai/artifact/K8t2w35433THXNjagfhfqF
  To update it from a new conversation, publish `dist/index.html` with `url` set to that link (a publish without `url` creates a separate artifact).
  Supporting files to publish with `root: "dist"`: `app.js`, `assets/gameplaniq-logo.png`, every file in `data/content/`, and `data/demo/demo.json`.
  Capabilities already declared and carried forward: `db`, `user`, `sample`, `assets`, `downloads`.
- **Repository branch:** `claude/little-league-platform-hkhs8v` (local commits are ahead of origin; pushing is blocked until the Claude GitHub App is installed for `PhiladelphiaAreaBaseball/Hobby-Network-Version-2`).

## Rebuild and verify
```
npm install
npm run validate      # content files
npm run seed          # regenerate demo data around today's date
npm run build         # dist/
npm test              # unit tests (engines, RBAC, data integrity, drill videos)
npm run e2e           # Playwright smoke across roles + calculator checks
```

## Product state
- League: **DVYAA** (internal id `lg_riverside` kept for saved-data compatibility) with divisions T-ball, Coach pitch, Minor, Major; a second tenant, Harbor Point, proves isolation.
- Personas: Kenny Koplove (president), Mark Galasso (head coach, Minor Comets), Tyler Hill (parent of Jack and Owen), Steve Koplove (treasurer), plus generic male names elsewhere. "Go into demo mode" signs in as Tyler.
- Field Improvement Fund Calculator under Administration (and admin dashboard / Finance).
- Drill video library: `data/content/drill-videos.json` holds one oEmbed-verified YouTube video per drill (target 50). Edit per drill in Administration → Academy content → Videos. Research part files, if any remain, are merged with `npm run merge-videos`.

## Open items
- Push to GitHub (access).
- More drill videos beyond the first 50; lesson-level production videos (placeholders today).
- Hosted deployment steps in docs/DEPLOYMENT.md (payments, email/SMS, auth, domains).

See docs/CHECKLIST.md for the full implemented/partial/integration matrix.
