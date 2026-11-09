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
npm run seed       # fictional demo data (one league, DVYAA)
npm run build      # dist/
npm test           # unit tests
npm run e2e        # Playwright: every route per role, workflows, tenant isolation, mobile
npm run serve      # local preview on http://localhost:4173/
```

## Demo access

Open the artifact and click **Go into demo mode** for the guided tour, or pick any role on the sign-in screen. The `#demo` link starts the tour from anywhere. The demo holds one league, DVYAA, and every person you can sign in as is named for their role:

| Persona | What they are | What to try |
|---|---|---|
| Parent | Parent of a 9-year-old (Minor Comets) and a 6-year-old (T-ball Otters) | Home, report card, team duties, carpools, forms, register the T-ball Player for spring |
| Player | The 9-year-old, guardian-managed account | Player dashboard, Baseball IQ quiz, badges |
| Head Coach | Head coach, Minor Comets | Coaches' HQ, game plans, practice planner, game day, evaluations |
| Assistant Coach | Assistant coach, Minor Comets | Team tools, shared game plans |
| League President | Runs the league | Administration: registrations, scheduling, tournaments, forms, finance, website |
| Treasurer | Board member | Finance and sponsors only; scheduling is denied |
| Minor Commissioner | Division commissioner | Division-scoped teams, tryouts and schedule |
| Umpire / Volunteer | Umpire, concessions volunteer | Assignments, availability, pay, shifts |
| Platform Admin | GamePlanIQ operator | Onboard a league (a new league starts empty and never sees DVYAA data), plans, platform content |

League officers are also named for their titles (Safety Officer, Information Officer, Player Agent, the other division commissioners, Umpire 2 to 6). Other families, children and coaches keep fictional names so rosters stay readable.

## Documentation

- `docs/ARCHITECTURE.md`: stack, layers, tenant isolation, persistence modes, trade-offs
- `docs/DEPLOYMENT.md`: publishing the artifact; moving to a hosted Next.js + PostgreSQL deployment; operational checklist
- `docs/ENVIRONMENT.md`: capabilities used by the artifact; environment variables for a hosted deployment
- `docs/CONTENT_SCHEMA.md`: the educational content model
- `docs/CHECKLIST.md`: implemented, partial and not-yet-implemented functionality, with test results
- `prisma/schema.prisma`: the target relational schema

Demo data is fictional. GamePlanIQ is not affiliated with Little League International. Production use with real children's data
requires legal and security review (COPPA, state privacy law, Little League safeguarding).
