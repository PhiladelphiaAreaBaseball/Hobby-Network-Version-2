import { useMemo } from "react";
import { useAppStore, currentMemberships, store } from "./store";
import { useTenant, childrenOf, teamsForUser, type Tenant } from "./select";
import { can } from "./rbac";
import type { Membership, Persona, Player, User, Team, Permission } from "./types";
import { safeLocalSet, safeLocalGet } from "./util";
export interface SessionInfo { tenant: Tenant | null; userId: string; user: User | undefined; persona: Persona | undefined; memberships: Membership[]; role: Persona["role"] | null; children: Player[]; activeChild: Player | null; teams: Team[]; coachTeams: Team[]; isGuardian: boolean; isCoach: boolean; isPlayer: boolean; isStaff: boolean; isPlatform: boolean; can: (p: Permission, scope?: { teamId?: string; divisionId?: string }) => boolean; }
export function useSession(): SessionInfo {
  const s = useAppStore(); const tenant = useTenant(); const memberships = useMemo(() => currentMemberships(s), [s.session, s.demo, s.tenantOverlays, s.platformOverlays]);
  return useMemo(() => {
    const userId = s.session?.userId ?? ""; const persona = s.demo?.personas.find((p) => p.id === s.session?.personaId); const user = tenant?.userById.get(userId);
    const children = tenant ? childrenOf(tenant, userId) : []; const stored = s.ui.activeChildId ?? safeLocalGet("gameplaniq:v1:activeChild");
    const activeChild = persona?.role === "player" && persona.playerId ? (tenant?.playerById.get(persona.playerId) ?? null) : (children.find((c) => c.id === stored) ?? children[0] ?? null);
    const teams = tenant ? teamsForUser(tenant, userId, memberships) : []; const coachTeams = tenant ? tenant.teams.filter((t) => memberships.some((m) => m.leagueId === tenant.leagueId && (m.role === "head_coach" || m.role === "assistant_coach") && (m.teamIds ?? []).includes(t.id))) : [];
    const leagueId = tenant?.leagueId; const canDo = (p: Permission, scope: { teamId?: string; divisionId?: string } = {}) => can(memberships, p, { leagueId, ...scope });
    const role = persona?.role ?? null;
    return { tenant, userId, user, persona, memberships, role, children, activeChild, teams, coachTeams, isGuardian: role === "guardian", isCoach: coachTeams.length > 0, isPlayer: role === "player", isStaff: !!leagueId && (canDo("league.manage") || canDo("division.manage") || memberships.some((m) => m.role === "board_member" && m.leagueId === leagueId)), isPlatform: memberships.some((m) => m.role === "platform_admin"), can: canDo };
  }, [s.session, s.demo, s.ui.activeChildId, tenant, memberships]);
}
export function setActiveChild(id: string) { safeLocalSet("gameplaniq:v1:activeChild", id); store.set((x) => ({ ui: { ...x.ui, activeChildId: id } })); }
export function useContent() { return useAppStore().content!; }
export function lessonProgress(t: Tenant, playerId: string | null) { const done = new Set(t.completions.filter((c) => c.playerId === playerId).map((c) => c.lessonId)); return done; }
