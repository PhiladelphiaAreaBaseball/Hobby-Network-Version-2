# Implementation checklist

Status legend: **Done** = implemented and verified by tests or browser checks in this build · **Partial** = working core with a documented
gap · **Integration** = architecture in place, needs an external service or credentials · **Not built** = deliberately out of this build.

## Platform and architecture
| Area | Status | Notes |
|---|---|---|
| Multi-league tenancy, isolated data per league | Done | Two demo tenants; read model filtered by league; db paths per league; smoke test verifies no cross-league leakage |
| Roles and granular permissions (10 roles) | Done | `src/core/rbac.ts`; board-member extra permissions editable in Staff & permissions; enforced in `actions.ts` |
| Authentication | Partial | One-click demo mode plus persona sign-in (per browser); read-only visitors automatically use browser-local storage. Real viewer identity from Claude shown on My Account and recorded on audit entries. Production auth provider is an integration step |
| Persistence | Done | Artifact `db` (shared, live) with browser-local fallback and a visible status badge |
| Audit log, consent log | Done | Reports → Audit log; Privacy → recent consent changes |
| Subdomains and custom domains | Integration | Modeled per league; mapping happens at hosting |
| Subscriptions and plans | Done (config) / Integration (billing) | Plans editable by the platform admin; league plan/status editable; invoicing needs a payment processor |

## Public website and registration
| Area | Status | Notes |
|---|---|---|
| Public league homepage with news, games, standings, teams, fields, academy preview, sponsors, volunteer, FAQ, board, policies, documents, fundraising, gallery note | Done | `#site-<slug>`; no roster or player names shown publicly |
| No-code CMS | Done | Hero, banner, about, policies, FAQ, board, contact, documents, section toggles; change verified live on the public site |
| Registration flow (child, division, forms, payment choice, review) | Done | Family discount, capacity + waitlist, waivers, emergency contact, medical notes, assistance request |
| Eligibility: configurable league-age date, residence/school workflow, admin approval | Done | ZIP code never decides; documents verified by registrar |
| Document upload | Partial | Stored via artifact assets for editors inside Claude; otherwise recorded as provided |
| Payments | Integration | Pending/succeeded/refunded model, treasurer reconciliation, refunds and assistance; hosted checkout not connected |
| Confirmation emails | Integration | In-app notifications work; email/SMS providers not connected |

## Teams, scheduling, communication
| Area | Status | Notes |
|---|---|---|
| Team dashboards (roster, schedule, results, announcements, assignments, documents, messages) | Done | Rosters only for families, coaches, staff |
| Scheduling: games, practices, clinics, fields, umpires, statuses, results | Done | Month grid with drag-and-drop day moves, agenda view, event editor |
| Conflict detection (field, team, shared coach, umpire) | Done | Unit-tested; conflicts panel; demo includes a deliberate conflict |
| Rainout tool, field status, notifications | Done | Never automatic from weather; weather feed is an integration |
| Personal family calendar, ICS export | Done | Live subscription URL needs hosting |
| Messaging (team, direct, division, league), guardian visibility, player restrictions | Done | DM can be disabled per league; players cannot send |
| Email / SMS / push delivery | Integration | In-app notifications with preferences; providers not connected |

## Academy and development
| Area | Status | Notes |
|---|---|---|
| Player Academy: 78 lessons with all 16 required parts, library with search, filters, favorites, playlists, progress | Done | Lesson-level production videos are labeled placeholders; 50 drills carry verified YouTube demonstrations shown on lessons, generated practices and the Academy video library |
| Drill video library (50 drills, YouTube) | Done | Every link verified through YouTube oEmbed at authoring time; third-party videos open in a new tab because the artifact frame cannot embed other sites; editable per drill in Content Management |
| Parent Academy: 20 guides in the six-part format, 12-step pathway, progress | Done | |
| Home practice generator (age, level, skill, time, equipment, location, participants) | Done | Rule-based from 96 curated drills; indoor/garage safety and throwing caps unit-tested; save, repeat, complete, timer, copy/download |
| 12-week curricula (beginner, intermediate), division assignment, enrollment, week completion | Done | |
| Baseball IQ classroom: tappable diamond, 50 questions, 15 lessons with diagrams, feedback with animations, scoring, review missed, mastery, practice mode | Done | Multiple defensible answers marked "acceptable" with explanations |
| Player dashboard, goals, weekly practice goal | Done | Private; no leaderboards |
| Challenges, badges, certificates | Done | 22 challenges, 14 badges; PDF certificates |
| Coaches' HQ: team planner, plan library (20 plans), attendance, notes and skill checklist, lineup rotation, pitch counts with configurable table, video review | Done | Pitch-count values are league-configured starting values, labeled as such |
| Coach-to-parent assignment loop | Done | One tap assigns a lesson + home practice to a team; completion visible to coach |
| Video review | Partial | Uploads stored via artifact assets for editors inside Claude; feedback with timestamps; consent, limits, retention; no automated analysis |
| Global search with natural-language phrasing; "Ask the Academy" (Claude) | Done | AI summarizes approved lessons only; hidden when the capability is unavailable |

## Administration and finance
| Area | Status | Notes |
|---|---|---|
| Admin dashboard with attention list and overview cards | Done | |
| Registration admin (review, verify documents, approve, waitlist, assign to team, payments, export) | Done | |
| Teams & rosters, players & guardians, staff & permissions | Done | |
| Volunteers: roles, shifts, assignment, background-check status, training | Done | Reports never stored |
| Finance dashboard, transactions, expenses, assistance, exports | Done | |
| Sponsors, packages, placements, fundraising | Done | Online donations need the payment processor |
| Field Improvement Fund Calculator | Done | Sliders + typed inputs, four summary cards, distribution bar, timeline, progress, 10-year chart with goal marker and tooltips, presets, reset, PDF, print view, share link, saved scenarios; default example verified (3.75 years, 4 cycles) |
| Content management (lessons, questions, curricula, video linking, drafts/publish/archive) | Done | Diamond-tap questions authored in content files |
| Reports and exports | Done | |
| Platform super admin (leagues, subscriptions, plans, usage, support, health) | Done | |

## Testing (this build)
- Unit: 20 tests pass (`npm test`): calculator formulas and default example, clamping, scenario codes, PDF writer, RBAC scoping, router,
  scheduling conflicts, eligibility, pitch counts, search relevance, practice generator safety, team planner timing, standings, ICS, demo data integrity.
- Browser (`npm run e2e`): 108 routes across 10 personas render with no console errors or dead ends; tenant isolation; board-member denial;
  parent workflows (complete lesson, generate and log practice, answer an IQ question, register a child, send a message, search);
  coach workflows (assign home practice, attendance, pitch count rest calculation, planner); admin workflows (field status, announcement,
  approve registration, create event, CMS change visible on the public site); phone-width overflow checks on 16 pages; dark theme render;
  calculator interactions including PDF bytes and saved scenario.

## Known limitations
- Lesson-level production videos are placeholders until instructors supply licensed media; drill videos link to third-party YouTube content that may change or be removed by its owners.
- Payments, email/SMS, weather feed, live calendar subscription, custom domains and real authentication are integrations (see docs/DEPLOYMENT.md).
- The artifact viewer blocks printing and direct downloads; the app offers PDF/CSV/ICS through Claude's download capability and copy boxes otherwise.
- Legal and security review is required before use with real children's data.
