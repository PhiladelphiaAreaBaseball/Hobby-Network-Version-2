/* Team formation for divisions that do not draft (T-ball, coach pitch, many rec Minors).
   Players are grouped by the requests the league honours (siblings, a buddy, a coach), each group is rated by the
   average tryout or evaluation rating, and groups are dealt to teams in a snake so strength and size stay even.
   Everything here is advisory: the commissioner sees the preview and the warnings before anything is written. */
import type { ID, Player, Registration, Team } from "../core/types";

export interface FormationInput { players: Player[]; teams: Team[]; ratings: Map<ID, number>; registrations: Registration[]; coachNames: Map<ID, string>; /* teamId -> head coach full name */ coachKids: Map<ID, ID[]>; /* teamId -> playerIds who are the coach's children */ }
export interface FormationGroup { id: string; playerIds: ID[]; rating: number; reasons: string[]; lockedTeamId?: ID; }
export interface FormationResult { assignments: Map<ID, ID>; groups: FormationGroup[]; teams: { teamId: ID; playerIds: ID[]; strength: number; size: number }[]; warnings: string[]; unmet: string[]; }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
function findPlayerByName(name: string, players: Player[]): Player | undefined { const n = norm(name); if (!n) return undefined; return players.find((p) => norm(`${p.firstName} ${p.lastName}`) === n) ?? players.find((p) => norm(p.firstName) === n.split(" ")[0] && (n.split(" ")[1] ? norm(p.lastName).startsWith(n.split(" ")[1]) : true)); }
/** Union-find over players so chains (A buddies B, B buddies C) stay together. */
export function buildGroups(input: FormationInput): FormationGroup[] {
  const { players, registrations, teams, coachKids, coachNames } = input; const parent = new Map<ID, ID>(); const find = (x: ID): ID => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; return r; }; const union = (a: ID, b: ID, reason: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); reasons.set(find(a), [...(reasons.get(find(a)) ?? []), reason]); };
  for (const p of players) parent.set(p.id, p.id); const reasons = new Map<ID, string[]>(); const locked = new Map<ID, ID>(); const unmet: string[] = [];
  // siblings share a guardian
  for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) if (players[i].guardianUserIds.some((g) => players[j].guardianUserIds.includes(g))) union(players[i].id, players[j].id, `${players[i].firstName} and ${players[j].firstName} are siblings`);
  // coach's children are locked to the coach's team
  for (const [teamId, kids] of coachKids) for (const k of kids) if (players.some((p) => p.id === k)) locked.set(k, teamId);
  // requests on the registration
  for (const r of registrations) { const p = players.find((x) => x.id === r.playerId); if (!p || !r.requests) continue; if (r.requests.buddyName) { const b = findPlayerByName(r.requests.buddyName, players); if (b && b.id !== p.id) union(p.id, b.id, `${p.firstName} asked to play with ${b.firstName} ${b.lastName}`); else unmet.push(`${p.firstName} ${p.lastName} asked for "${r.requests.buddyName}", who is not in this division.`); } if (r.requests.coachName) { const team = teams.find((t) => norm(coachNames.get(t.id) ?? "") === norm(r.requests!.coachName!) || norm(coachNames.get(t.id) ?? "").split(" ").pop() === norm(r.requests!.coachName!).split(" ").pop()); if (team) { locked.set(p.id, team.id); reasons.set(find(p.id), [...(reasons.get(find(p.id)) ?? []), `${p.firstName} asked for coach ${coachNames.get(team.id)}`]); } else unmet.push(`${p.firstName} ${p.lastName} asked for coach "${r.requests.coachName}", who does not coach in this division.`); } }
  const byRoot = new Map<ID, ID[]>(); for (const p of players) { const r = find(p.id); (byRoot.get(r) ?? byRoot.set(r, []).get(r)!).push(p.id); }
  const groups: FormationGroup[] = []; for (const [root, ids] of byRoot) { const lockTeams = [...new Set(ids.map((id) => locked.get(id)).filter(Boolean))] as ID[]; if (lockTeams.length > 1) unmet.push(`A group (${ids.map((id) => players.find((p) => p.id === id)?.firstName).join(", ")}) is tied to two different coaches; the first wins.`); const rs = ids.map((id) => input.ratings.get(id) ?? 3); groups.push({ id: root, playerIds: ids, rating: rs.reduce((a, b) => a + b, 0) / rs.length, reasons: reasons.get(root) ?? [], lockedTeamId: lockTeams[0] }); }
  (groups as any).__unmet = unmet; return groups;
}
export function formTeams(input: FormationInput): FormationResult {
  const groups = buildGroups(input); const unmet: string[] = (groups as any).__unmet ?? []; const teams = input.teams.map((t) => ({ teamId: t.id, playerIds: [] as ID[], strength: 0, size: 0, sum: 0 })); const byTeam = new Map(teams.map((t) => [t.teamId, t])); const assignments = new Map<ID, ID>();
  const place = (g: FormationGroup, teamId: ID) => { const t = byTeam.get(teamId)!; for (const id of g.playerIds) { t.playerIds.push(id); assignments.set(id, teamId); t.sum += input.ratings.get(id) ?? 3; } t.size = t.playerIds.length; t.strength = t.size ? Math.round((t.sum / t.size) * 100) / 100 : 0; };
  for (const g of groups.filter((x) => x.lockedTeamId && byTeam.has(x.lockedTeamId))) place(g, g.lockedTeamId!);
  // strongest groups first; each goes to the team that is currently weakest with room (size, then strength)
  const free = groups.filter((x) => !x.lockedTeamId || !byTeam.has(x.lockedTeamId)).sort((a, b) => b.playerIds.length - a.playerIds.length || b.rating - a.rating);
  for (const g of free) { const target = [...teams].sort((a, b) => a.size - b.size || a.sum - b.sum)[0]; if (!target) break; place(g, target.teamId); }
  const warnings: string[] = []; const sizes = teams.map((t) => t.size); if (Math.max(...sizes) - Math.min(...sizes) > 1) warnings.push(`Team sizes range from ${Math.min(...sizes)} to ${Math.max(...sizes)}; a large sibling or buddy group is the usual cause.`); const strengths = teams.filter((t) => t.size).map((t) => t.strength); if (strengths.length && Math.max(...strengths) - Math.min(...strengths) > 0.6) warnings.push(`Average rating spread is ${(Math.max(...strengths) - Math.min(...strengths)).toFixed(2)} between the strongest and weakest team; consider swapping a pair of singles.`); if (input.ratings.size < input.players.length / 2) warnings.push("Fewer than half the players have a tryout or evaluation rating; unrated players count as average.");
  return { assignments, groups, teams: teams.map(({ teamId, playerIds, strength, size }) => ({ teamId, playerIds, strength, size })), warnings, unmet };
}
