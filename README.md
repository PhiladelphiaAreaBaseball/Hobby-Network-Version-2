# GamePlanIQ

A multi-tenant Little League management and player development platform, built to run **entirely on Claude** as a published artifact.
No Supabase, no Vercel: a TypeScript/React app bundled with esbuild, stored and served by Claude, using the artifact runtime for
shared data, identity, AI assistance, file storage and downloads.

Two problems, one product:

1. **Running a league is hard.** Registration with configurable eligibility, drag-and-drop scheduling with conflict detection, field
   status, volunteers and background-check status, finances, sponsors, a no-code public website, communications and a financial
   planning calculator.
2. **Most parents never played.** A Player Academy (78 lessons, 96 drills), a Parent Academy (20 guides and a 12-step "New to baseball?"
   pathway), a personalized home practice generator, two 12-week curricula, an interactive Baseball IQ classroom (15 lessons, 50 questions
   on a tappable diamond), badges and certificates, and a coach-to-parent assignment loop.

## Quick start

```
npm install
npm run validate   # content files
npm run seed       # fictional demo data (DVYAA + Harbor Point)
npm run build      # dist/
npm test           # unit tests
npm run e2e        # Playwright: every route per role, workflows, tenant isolation, mobile
npm run serve      # local preview on http://localhost:4173/
```

## Demo access

Open the artifact and click **Go into demo mode** (you become Tyler Hill, a parent) or pick any role on the sign-in screen. The `#demo` link does the same from anywhere. Every person is fictional:

| Persona | Role | What to try |
|---|---|---|
| Tyler Hill | Parent of Jack (9) and Owen (6) | Home → "Build a 10-minute practice", Parent Academy pathway, mark a lesson done, register Owen for spring |
| Jack Hill | Player (guardian-managed) | Player dashboard, Baseball IQ quiz, badges |
| Mark Galasso | Head coach, Minor Comets | Coaches' HQ → planner, assign home practice, pitch counts, video review |
| Kenny Koplove | League president | Administration dashboard, registrations, scheduling, fields, website CMS, Field Improvement Fund Calculator |
| Steve Koplove | Board member (treasurer) | Finance and sponsors only; scheduling is denied |
| Luis Ortega | Minor commissioner | Division-scoped teams and schedule |
| Tom Garrity / Nate Okafor | Umpire / volunteer | Assignments, shifts |
| Alex Chen | Platform super administrator | Leagues, plans, platform content, health |
| Sam Delgado | President of Harbor Point LL | Proves tenant isolation: a second league with its own data |

## Documentation

- `docs/ARCHITECTURE.md`: stack, layers, tenant isolation, persistence modes, trade-offs
- `docs/DEPLOYMENT.md`: publishing the artifact; moving to a hosted Next.js + PostgreSQL deployment; operational checklist
- `docs/ENVIRONMENT.md`: capabilities used by the artifact; environment variables for a hosted deployment
- `docs/CONTENT_SCHEMA.md`: the educational content model
- `docs/CHECKLIST.md`: implemented, partial and not-yet-implemented functionality, with test results
- `prisma/schema.prisma`: the target relational schema

Demo data is fictional. GamePlanIQ is not affiliated with Little League International. Production use with real children's data
requires legal and security review (COPPA, state privacy law, Little League safeguarding).
