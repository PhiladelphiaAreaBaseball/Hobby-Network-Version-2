/* Tenant-scoped read model. Merges static seed data with the mutable overlay (artifact db / local) and exposes
   league-filtered collections. Nothing outside the active league is ever returned to a page. */
import { useMemo } from "react";
import { useAppStore, type AppState, type Overlay } from "./store";
import type * as T from "./types";

const mergeCache = new WeakMap<object, WeakMap<object, any[]>>();
function merge<X extends { id: string }>(seed: X[], overlay: Overlay | undefined): X[] {
  const ov = overlay ?? EMPTY;
  let inner = mergeCache.get(seed); if (!inner) { inner = new WeakMap(); mergeCache.set(seed, inner); }
  const hit = inner.get(ov); if (hit) return hit as X[];
  const out: X[] = []; const seen = new Set<string>();
  for (const s of seed) { const o = ov[s.id]; if (o) { seen.add(s.id); if (!o._deleted) out.push(o as X); } else out.push(s); }
  for (const [id, o] of Object.entries(ov)) if (!seen.has(id) && !o._deleted) out.push(o as X);
  inner.set(ov, out); return out;
}
const EMPTY: Overlay = {};
const EMPTY_ARR: any[] = [];
const drillCache = new WeakMap<object, { key: string; out: T.Drill[] }>();
function drillsWithVideos(drills: T.Drill[], videos: Map<string, T.DrillVideo>): T.Drill[] { const key = [...videos.values()].map((v) => v.drillId + ":" + v.videoId).sort().join("|"); const hit = drillCache.get(drills); if (hit && hit.key === key) return hit.out; const out = drills.map((d) => { const v = videos.get(d.id); return v ? { ...d, video: v } : d; }); drillCache.set(drills, { key, out }); return out; }
const byLeague = <X extends { leagueId?: string | null }>(arr: X[], leagueId: string) => arr.filter((x) => x.leagueId === leagueId);
function indexBy<X extends { id: string }>(arr: X[]) { const m = new Map<string, X>(); for (const a of arr) m.set(a.id, a); return m; }

export interface Tenant {
  leagueId: string; league: T.League; seasons: T.Season[]; activeSeason: T.Season | undefined; divisions: T.Division[]; teams: T.Team[]; players: T.Player[]; registrations: T.Registration[]; payments: T.Payment[]; expenses: T.Expense[];
  fields: T.Field[]; events: T.ScheduleEvent[]; attendance: T.Attendance[]; pitching: T.PitchingAppearance[]; volunteers: T.Volunteer[]; shifts: T.VolunteerShift[]; sponsors: T.Sponsor[]; fundraisers: T.Fundraiser[]; announcements: T.Announcement[]; threads: T.MessageThread[]; notifications: T.Notification[];
  completions: T.LessonCompletion[]; assignments: T.Assignment[]; iqProgress: T.IQProgress[]; awards: T.AchievementAward[]; enrollments: T.CurriculumEnrollment[]; notes: T.PlayerNote[]; practicePlans: T.PracticePlan[]; videos: T.VideoSubmission[]; favorites: T.Favorite[]; playlists: T.Playlist[]; siteContent: T.SiteContent; audit: T.AuditLog[];
  users: T.User[]; memberships: T.Membership[]; lessons: T.Lesson[]; iqQuestions: T.IQQuestion[]; curricula: T.Curriculum[]; scenarios: T.FinancialScenario[]; guideProgress: T.GuideProgress[]; drills: T.Drill[]; drillVideos: T.DrillVideo[];
  tryouts: T.Tryout[]; evaluations: T.Evaluation[]; drafts: T.Draft[]; reportCards: T.ReportCard[]; gameSheets: T.GameSheet[]; certifications: T.Certification[];
  teamById: Map<string, T.Team>; playerById: Map<string, T.Player>; userById: Map<string, T.User>; divisionById: Map<string, T.Division>; fieldById: Map<string, T.Field>; lessonById: Map<string, T.Lesson>; eventById: Map<string, T.ScheduleEvent>;
  userName: (id: string | undefined) => string; teamName: (id: string | undefined) => string;
}

export function selectTenant(s: AppState, leagueId: string): Tenant | null {
  const d = s.demo, c = s.content; if (!d || !c) return null;
  const ov = s.overlayTenantId === leagueId ? s.tenantOverlays : {};
  const leagues = merge(d.leagues, { ...(s.platformOverlays.leagues ?? {}), ...(ov.leagues ?? {}) });
  const league = leagues.find((l) => l.id === leagueId); if (!league) return null;
  const users = merge(d.users, ov.users); const memberships = merge(d.memberships, ov.memberships).filter((m) => m.leagueId === leagueId || m.role === "platform_admin");
  const seasons = byLeague(merge(d.seasons, ov.seasons), leagueId); const divisions = byLeague(merge(d.divisions, ov.divisions), leagueId); const teams = byLeague(merge(d.teams, ov.teams), leagueId); const players = byLeague(merge(d.players, ov.players), leagueId);
  const events = byLeague(merge(d.events, ov.events), leagueId); const fields = byLeague(merge(d.fields, ov.fields), leagueId);
  const lessons = merge(c.lessons, ov.lessons).filter((l) => !l.leagueId || l.leagueId === leagueId);
  const drillVideos = merge(c.drillVideos, ov.drillVideos).filter((v) => !v.leagueId || v.leagueId === leagueId); const videoByDrill = new Map(drillVideos.map((v) => [v.drillId, v])); const drills = drillsWithVideos(c.drills, videoByDrill);
  const scList = merge(d.siteContent as unknown as Array<T.SiteContent & { id: string }>, ov.siteContent) as T.SiteContent[]; const siteContent = (scList.find((x) => x.leagueId === leagueId) ?? d.siteContent.find((x) => x.leagueId === leagueId)) as T.SiteContent;
  const userById = indexBy(users); const teamById = indexBy(teams);
  const t: Tenant = {
    leagueId, league, seasons, activeSeason: seasons.find((x) => x.status === "active" || x.status === "registration") ?? seasons[0], divisions, teams, players,
    registrations: byLeague(merge(d.registrations, ov.registrations), leagueId), payments: byLeague(merge(d.payments, ov.payments), leagueId), expenses: byLeague(merge(d.expenses, ov.expenses), leagueId),
    fields, events, attendance: byLeague(merge(d.attendance, ov.attendance), leagueId), pitching: byLeague(merge(d.pitching, ov.pitching), leagueId), volunteers: byLeague(merge(d.volunteers, ov.volunteers), leagueId), shifts: byLeague(merge(d.shifts, ov.shifts), leagueId),
    sponsors: byLeague(merge(d.sponsors, ov.sponsors), leagueId), fundraisers: byLeague(merge(d.fundraisers, ov.fundraisers), leagueId), announcements: byLeague(merge(d.announcements, ov.announcements), leagueId), threads: byLeague(merge(d.threads, ov.threads), leagueId), notifications: byLeague(merge([] as T.Notification[], ov.notifications), leagueId),
    completions: byLeague(merge(d.completions, ov.completions), leagueId), assignments: byLeague(merge(d.assignments, ov.assignments), leagueId), iqProgress: byLeague(merge(d.iqProgress, ov.iqProgress), leagueId), awards: byLeague(merge(d.awards, ov.awards), leagueId), enrollments: byLeague(merge(d.enrollments, ov.enrollments), leagueId),
    notes: byLeague(merge(d.notes, ov.notes), leagueId), practicePlans: byLeague(merge(d.practicePlans, ov.practicePlans), leagueId), videos: byLeague(merge(d.videos, ov.videos), leagueId), favorites: byLeague(merge([] as T.Favorite[], ov.favorites), leagueId), playlists: byLeague(merge([] as T.Playlist[], ov.playlists), leagueId), siteContent, audit: byLeague(merge([] as T.AuditLog[], ov.audit), leagueId),
    users, memberships, lessons, iqQuestions: merge(c.iqQuestions, ov.iqQuestions).filter((q) => !q.leagueId || q.leagueId === leagueId), curricula: merge(c.curricula, ov.curricula).filter((q) => !q.leagueId || q.leagueId === leagueId), scenarios: byLeague(merge([] as T.FinancialScenario[], ov.scenarios), leagueId), guideProgress: byLeague(merge([] as T.GuideProgress[], ov.guideProgress), leagueId), drills, drillVideos,
    tryouts: byLeague(merge(d.tryouts ?? EMPTY_ARR, ov.tryouts), leagueId), evaluations: byLeague(merge(d.evaluations ?? EMPTY_ARR, ov.evaluations), leagueId), drafts: byLeague(merge(d.drafts ?? EMPTY_ARR, ov.drafts), leagueId), reportCards: byLeague(merge(d.reportCards ?? EMPTY_ARR, ov.reportCards), leagueId), gameSheets: byLeague(merge(d.gameSheets ?? EMPTY_ARR, ov.gameSheets), leagueId), certifications: byLeague(merge(d.certifications ?? EMPTY_ARR, ov.certifications), leagueId),
    teamById, playerById: indexBy(players), userById, divisionById: indexBy(divisions), fieldById: indexBy(fields), lessonById: indexBy(lessons), eventById: indexBy(events),
    userName: (id) => { const u = id ? userById.get(id) : undefined; return u ? `${u.firstName} ${u.lastName}` : "Unknown"; },
    teamName: (id) => (id ? teamById.get(id)?.name ?? "Unassigned" : "Unassigned"),
  };
  return t;
}
export function useTenant(): Tenant | null {
  const s = useAppStore();
  const leagueId = s.session?.leagueId ?? s.demo?.leagues[0]?.id ?? null;
  return useMemo(() => (leagueId ? selectTenant(s, leagueId) : null), [s.demo, s.content, s.tenantOverlays, s.platformOverlays, s.overlayTenantId, leagueId]);
}
export function useTenantFor(leagueId: string | null): Tenant | null {
  const s = useAppStore();
  return useMemo(() => (leagueId ? selectTenant(s, leagueId) : null), [s.demo, s.content, s.tenantOverlays, s.platformOverlays, s.overlayTenantId, leagueId]);
}
/** Children of a guardian (tenant-scoped). */
export function childrenOf(t: Tenant, userId: string) { return t.players.filter((p) => p.guardianUserIds.includes(userId)); }
export function teamsForUser(t: Tenant, userId: string, memberships: T.Membership[]) {
  const ids = new Set<string>();
  for (const m of memberships) if (m.leagueId === t.leagueId) for (const id of m.teamIds ?? []) ids.add(id);
  for (const p of childrenOf(t, userId)) if (p.teamId) ids.add(p.teamId);
  return t.teams.filter((x) => ids.has(x.id));
}
export function rosterOf(t: Tenant, teamId: string) { return t.players.filter((p) => p.teamId === teamId); }
export function allPlatformLeagues(s: AppState): T.League[] { if (!s.demo) return []; return merge(s.demo.leagues, s.platformOverlays.leagues); }
