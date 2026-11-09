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
| Notification center and rules engine | Done | `#notifications` page with unread filter, topic chips, day grouping, deep links resolved through the router; every notification passes a rules catalog (audience, topic switch, urgent kinds bypass quiet hours, ten-minute dedupe); quiet-hours messages carry `deliverAt` for email and push; rules table and manual duty/renewal reminders in Communications; announcements notify their audience |
| Daily and weekly digest | Done | Home page and notification center card: field status, games and practices, claimed duties, home practice due (with overdue), report cards to read, deadlines, coaching to-dos (lineup card, open duties, report cards, draft on the clock, tryouts to evaluate), unread count; copy or download as text for email; defaults to the person's digest preference |
| All-Star nominations and selection | Done | Pools per age bracket with roster size, nominations per team, own-player ballot limit and optional games threshold; eligibility checks (league age, roster, residency verification, games); coach nominations with notes; ranked head-coach ballots with validation; open tally with tie-breaks; commissioner finalizes selected and alternates with private family notifications; nothing public |
| Family calendar (.ics) | Done | One feed per family: games, practices, claimed duties, home practice due dates, registration deadlines, tryouts and certification renewals, each with a reminder alarm; options per category; single-event "Add to my calendar" on every event page |
| Email / SMS / push delivery | Integration | In-app notifications with preferences and `deliverAt`; providers not connected |

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
| Player report cards (mid-season, end of season) | Done | Assistants draft, head coach publishes; coach rates ten skills (pre-filled from the practice checklist), writes strengths, one focus and a note; engine suggests age-matched Academy lessons for the focus skill; publish notifies guardians; parent acknowledges; PDF download; end-of-season card shows change since mid-season |
| Game day: lineup card builder | Done | Copy or download the card as text; auto-rotation with fixed pitcher/catcher, per-inning position grid, diamond view; warnings for league minimum-play rules (configurable per division), consecutive bench innings, pitcher rest, catcher/pitcher rule; season playing-time table with fairness notes |
| Season rollover | Done | Seasons & settings: preview of teams carried, draft placements, players keeping or leaving rosters, league-age updates and warnings; applies finalized drafts, recalculates ages, moves divisions and teams, posts a pinned announcement; standings are season-scoped |
| CSV import of players and guardians | Done | Players & guardians → Import CSV: paste or file, column aliases, date normalisation, duplicate and eligibility checks with a row-by-row preview; creates guardians (deduped by email), memberships, players and optional approved registrations |
| Run practice mode | Done | Full-screen, phone-first runner for any saved home or team plan: big clock, one block at a time, cues, drill video one tap away, +/−1 minute, block list, progress; keeps its place across reloads; finish logs the practice and offers the home assignment |
| Coach certification path | Done | Six modules (abuse awareness, concussion, first aid and emergency plan, pitch counts and arm care, heat/lightning/field safety, conduct and communication) with reading, key points, linked resources and a graded check; renewals per module; per-role requirements; printable certificate; admin tab in Volunteers with readiness (modules + background check) and dashboard attention item |
| Game day: scorebook and pitch counts | Done | Inning-by-inning runs, outs, half-inning advance, per-pitcher tap counter with daily-max and rest-day preview; finalize writes the result, standings and pitching appearances in one action; league staff can reopen |
| Video review | Partial | Uploads stored via artifact assets for editors inside Claude; feedback with timestamps; consent, limits, retention; no automated analysis |
| Global search with natural-language phrasing; "Ask the Academy" (Claude) | Done | AI summarizes approved lessons only; hidden when the capability is unavailable |

## Administration and finance
| Area | Status | Notes |
|---|---|---|
| Admin dashboard with attention list and overview cards | Done | |
| Registration admin (review, verify documents, approve, waitlist, assign to team, payments, export) | Done | |
| Teams & rosters, players & guardians, staff & permissions | Done | |
| Volunteers: roles, shifts, assignment, background-check status, training | Done | Reports never stored |
| Team game-day duties (snacks, scorekeeper, pitch counter, dugout parent, field prep) | Done | Coach adds duties per game or the standard three; team families claim and release slots; coach can assign directly and nudge everyone; confirmation notification; league volunteer pages exclude team duties |
| Tryouts and evaluations | Done | Commissioner creates a tryout per division and season, assigns evaluators (coaches, board); tablet-friendly 1–5 scoring board across six stations with notes; pool derived from registrations; rankings combine all evaluators; close/reopen |
| Draft board | Done | Snake draft with pick order, rounds, protected coaches' children; best-available sorted by tryout rating; coaches pick on the clock, commissioner can pick for anyone or auto-pick; balance warnings (team average, age spread, pitcher depth) advise without blocking; undo; finalize with optional roster application |
| Finance dashboard, transactions, expenses, assistance, exports | Done | |
| Sponsors, packages, placements, fundraising | Done | Online donations need the payment processor |
| Field Improvement Fund Calculator | Done | Sliders + typed inputs, four summary cards, distribution bar, timeline, progress, 10-year chart with goal marker and tooltips, presets, reset, PDF, print view, share link, saved scenarios; default example verified (3.75 years, 4 cycles) |
| Content management (lessons, questions, curricula, video linking, drafts/publish/archive) | Done | Diamond-tap questions authored in content files |
| Reports and exports | Done | |
| Platform super admin (leagues, subscriptions, plans, usage, support, health) | Done | |

## Families, coaches and the league office (round four)
| Area | Status | Notes |
|---|---|---|
| Carpool coordination | Done | Team page → Carpool: guardians offer rides per game (seats, pickup area, note); only a guardian adds their own child; driver notified; cancel notifies riders |
| Team photo albums | Done | Team page → Photos: uploads through the assets capability, tagged players require photo consent, hidden automatically when consent is withdrawn; uploader, tagged guardian or coach can remove |
| Message the coach from the team page | Done | Opens or creates the direct thread; falls back to the team thread when the league disables direct messages |
| Equipment buying guide | Done | Resource `res-23`, by division, with bat-stamp explanation and what the league provides |
| Run-mode attendance | Done | Take attendance from the practice runner when a team event is on today's schedule |
| Season recap per player | Done | `#recap-<playerId>` with lessons, practices, badges, IQ, attendance, playing time, skills from report cards and change since mid-season; PDF |
| Lesson video lead | Done | Lessons lead with their verified drill video; placeholder is a one-line note |
| Team, sponsor and league logos | Done | Uploads through assets (editors in Claude); marks fall back to initials |
| Incident reports | Done | Coaches, umpires, volunteers and staff file; safety officer (`league.safety`) reviews with status and follow-up; CSV export; Administration → Safety |
| Safety plan builder | Done | Twelve sections with starters, completion, approval and export; content in `data/content/safety.json` |
| First aid kit checks | Done | Per-field checklist with missing items, last check and overdue flags |
| Umpire scheduling and pay | Done | Administration → Umpires: availability-aware assignment with conflict and weekly-load hints, two-umpire divisions, per-division pay rates, pay tally and recorded payments; umpires edit availability and see pay |
| Season close-out | Done | Checklist from content, awards with engraving export, uniform returns, equipment inventory, banquet; season archive page with final standings |
| Surveys | Done | Templates, draft/open/closed, anonymous-to-the-board results by division with year-over-year comparison; home card for open surveys |
| Budget vs actuals | Done | Finance → Budget tab: planned lines by revenue kind and expense category, actuals from transactions, variance |
| Background-check expiry reminders | Done | Volunteers and Communications; through the rules engine |
| Content versions and league overrides | Done | Academy content → League changes: what the league overrides or added, revert to platform, version history with restore |
| Board overview share link | Done | Read-only `#view-<slug>-<token>` page with standings, upcoming games, fields, sponsors and summary figures; no names; rotate or disable from Branding |
| President and coach demo links | Done | `#demo-president`, `#demo-coach` |

## PlayMetrics parity (round five)

| Item | Status | Notes |
| --- | --- | --- |
| Central Registration import presets | Done | Sports Connect and PlayMetrics column presets, auto-detected from the header; positioning copy on marketing, import modal and tour |
| Form builder | Done | Templates (evaluation, medical, volunteer application, coach feedback, field request); per-player or per-person; nine field types; open/close/remind; results aggregated for evaluation and feedback, reviewed one by one otherwise; home card; `#form-<id>` |
| Payment plans | Done | Two to six monthly installments from the registration page or the office; overdue and due-soon reminders via rules engine; Finance tab; processing at deployment |
| Tournaments | Done | Round robin, single and double elimination, pools then bracket; byes; schedule games; scorebook final advances the bracket; `#tournament-<id>` for families |
| Curriculum assignment and follow-through | Done | Per team per season; weeks covered from completed practices and home assignments; coach card and board table |
| Drill diagrammer | Done | Place players, coaches, cones, balls, equipment; throw/run/move arrows; drag to move; shown on lessons and in the practice runner; three platform diagrams shipped |
| Team formation (non-draft) | Done | Siblings, buddy and coach requests, coach's children; snake deal by size then strength; advisory warnings; manual swaps; Place writes rosters and tells families |
| Player history | Done | Seasons, positions from lineups, attendance, tryouts, report cards, badges, pitch counts, evaluations on the player page |
| Fundraising ledger | Done | Own sidebar tab; every dollar in or out is a ledger line with campaign, fund, method and bank deposit; campaign totals derived; reconciliation proves deposits, fund balances and Finance agree; voids keep the line; deposits, pledges and CSV export |
| Head coach game plans | Done | Private 6-inning grid (3B SS 2B 1B LF CF RF C Pitcher Relief Roster Roster); duplicate, rest, catcher-pitcher and minimum-innings checks; share read-only with chosen people; send to the lineup card; dugout PDF |
| Native-style delivery | Planned | Manifest, service worker, push: documented in DEPLOYMENT.md; not possible inside the artifact |

## Demo readiness
| Area | Status | Notes |
|---|---|---|
| Demo dates stay fresh | Done | Seed records `meta.seededOn`; on load every date moves forward by the days since seeding (birth dates and the age determination date never move) so today always has games, duties and live deadlines; `localStorage gameplaniq:v1:freezeDates=1` disables it |
| Demo reset | Done | Persona switcher and presenter guide: clears every saved change for the current league and the platform (artifact owner or editor for the shared database; anyone for browser-local data) and reloads |
| Guided tour | Done | "Go into demo mode" and `#demo` start a self-running tour: 6 parts, 50 stops, every screen explained with a spotlight on what to try; Next, Back, Skip this section, Hide/Resume, Jump to a section, Exit; signs in as the right persona per part; state survives a reload; content in `data/content/tour.json`; `#demo-president` and `#demo-coach` still land directly |
| Presenter guide | Done | `#demo-guide`: five acts, 25 minutes, one Go button per step that switches persona and opens the screen; say/click notes; progress; copyable script; content in `data/content/demo-guide.json` |
| League onboarding wizard | Done | Platform → Onboard a league: league and president, season, divisions from templates, teams, fields, review; creates league, president account, season, divisions, teams, fields, starter website and welcome announcement, then opens the new league's administration; platform operators can open any league from the Leagues tab |

## Testing (this build)
- Unit: 30 tests pass (`npm test`): calculator formulas and default example, clamping, scenario codes, PDF writer, RBAC scoping, router,
  scheduling conflicts, eligibility, pitch counts, search relevance, practice generator safety, team planner timing, standings, ICS, demo data integrity,
  draft ratings/snake order/balance warnings, report card recommendations, lineup auto-rotation and play-rule warnings, scorebook state, demo tryout/draft/report-card consistency, certification grading and status, CSV importer parsing and validation, rollover preview and season-scoped standings, notification rules (quiet hours, preferences, link resolution) and the family calendar feed, digest composition, All-Star eligibility, tally and ballot rules, demo date shifting.
- Browser (`npm run e2e`): 134 routes across 10 personas render with no console errors or dead ends; tenant isolation; board-member denial (including tryouts);
  parent workflows (complete lesson, generate and log practice, answer an IQ question, register a child, send a message, search);
  coach workflows (assign home practice, attendance, pitch count rest calculation, tryout scoring, publish a report card, lineup card, scorebook through
  a finalized game, certification quiz to a certificate, run-mode timer to completion, planner); commissioner draft pick; coach All-Star nomination and digest card; commissioner All-Star tally and finalize; platform onboarding wizard through to the new league's pages and public site; presenter guide Go and demo reset; carpool offer, survey answer, share view (with wrong-token rejection), incident filing, recap page, umpire availability, safety plan and kit check, umpire assignment and pay tally, close-out task toggle, survey results, budget tab, share-link controls, content changes tab; admin workflows (field status, announcement, approve registration, create event, CMS change visible
  on the public site, tryout rankings, certification readiness tab, CSV import with preview, play-rules editor, rollover preview); parent team-duty sign-up, report-card acknowledgement, notification center (open and mark all read), family calendar export and single-event calendar file; phone-width overflow checks on 22 pages; dark theme render;
  calculator interactions including PDF bytes and saved scenario.

## Known limitations
- Lesson-level production videos are placeholders until instructors supply licensed media; drill videos link to third-party YouTube content that may change or be removed by its owners.
- Payments, email/SMS, weather feed, live calendar subscription, custom domains and real authentication are integrations (see docs/DEPLOYMENT.md).
- The artifact viewer blocks printing and direct downloads; the app offers PDF/CSV/ICS through Claude's download capability and copy boxes otherwise.
- Legal and security review is required before use with real children's data.
