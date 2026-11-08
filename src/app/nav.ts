import type { IconName } from "../components/icons";
import type { Membership } from "../core/types";
import { can, hasRole } from "../core/rbac";
export interface NavItem { id: string; label: string; icon: IconName; route: string; section?: "main" | "admin" | "platform"; }
export const MAIN_NAV: NavItem[] = [
  { id: "home", label: "Home", icon: "home", route: "home" }, { id: "league", label: "My League", icon: "league", route: "league" }, { id: "teams", label: "My Teams", icon: "teams", route: "teams" }, { id: "schedule", label: "Schedule", icon: "calendar", route: "schedule" },
  { id: "academy", label: "Player Academy", icon: "academy", route: "academy" }, { id: "parents", label: "Parent Academy", icon: "parents", route: "parents" }, { id: "coaches", label: "Coaches' Headquarters", icon: "coach", route: "coaches" }, { id: "iq", label: "Baseball IQ", icon: "iq", route: "iq" },
  { id: "achievements", label: "Challenges & Achievements", icon: "trophy", route: "achievements" }, { id: "messages", label: "Messages", icon: "message", route: "messages" }, { id: "resources", label: "Resources", icon: "book", route: "resources" }, { id: "notifications", label: "Notifications", icon: "bell", route: "notifications" }, { id: "account", label: "My Account", icon: "user", route: "account" },
];
export const ADMIN_NAV: NavItem[] = [
  { id: "admin", label: "Dashboard", icon: "grid", route: "admin" }, { id: "admin-registrations", label: "Registration", icon: "list", route: "admin-registrations" }, { id: "admin-teams", label: "Teams & rosters", icon: "teams", route: "admin-teams" }, { id: "admin-players", label: "Players & guardians", icon: "user", route: "admin-players" }, { id: "admin-tryouts", label: "Tryouts & draft", icon: "clipboard", route: "admin-tryouts" },
  { id: "admin-schedule", label: "Scheduling", icon: "calendar", route: "admin-schedule" }, { id: "admin-fields", label: "Fields & weather", icon: "cloud", route: "admin-fields" }, { id: "admin-volunteers", label: "Volunteers", icon: "shield", route: "admin-volunteers" }, { id: "admin-finance", label: "Finances", icon: "dollar", route: "admin-finance" }, { id: "admin-calculator", label: "Field improvement calculator", icon: "target", route: "admin-calculator" },
  { id: "admin-sponsors", label: "Sponsors & fundraising", icon: "star", route: "admin-sponsors" }, { id: "admin-website", label: "Website", icon: "external", route: "admin-website" }, { id: "admin-communications", label: "Communications", icon: "megaphone", route: "admin-communications" }, { id: "admin-content", label: "Academy content", icon: "book", route: "admin-content" },
  { id: "admin-members", label: "Staff & permissions", icon: "lock", route: "admin-members" }, { id: "admin-reports", label: "Reports", icon: "list", route: "admin-reports" }, { id: "admin-settings", label: "Seasons & settings", icon: "settings", route: "admin-settings" },
];
export const MOBILE_TABS = ["home", "academy", "schedule", "messages"];
export function visibleAdminNav(memberships: Membership[], leagueId: string): NavItem[] {
  const checks: Record<string, () => boolean> = {
    "admin": () => true, "admin-registrations": () => can(memberships, "league.registrations", { leagueId }), "admin-teams": () => can(memberships, "team.manage", { leagueId }) && (can(memberships, "league.manage", { leagueId }) || can(memberships, "division.manage", { leagueId })),
    "admin-players": () => can(memberships, "league.registrations", { leagueId }) || can(memberships, "league.members", { leagueId }), "admin-tryouts": () => can(memberships, "league.tryouts", { leagueId }), "admin-schedule": () => can(memberships, "league.schedule", { leagueId }), "admin-fields": () => can(memberships, "league.fields", { leagueId }), "admin-volunteers": () => can(memberships, "league.volunteers", { leagueId }),
    "admin-finance": () => can(memberships, "league.finance.view", { leagueId }) || can(memberships, "league.finance", { leagueId }), "admin-calculator": () => can(memberships, "league.finance.view", { leagueId }) || can(memberships, "league.finance", { leagueId }) || can(memberships, "league.manage", { leagueId }), "admin-sponsors": () => can(memberships, "league.sponsors", { leagueId }), "admin-website": () => can(memberships, "league.website", { leagueId }), "admin-communications": () => can(memberships, "league.communications", { leagueId }),
    "admin-content": () => can(memberships, "league.content", { leagueId }), "admin-members": () => can(memberships, "league.members", { leagueId }), "admin-reports": () => can(memberships, "league.reports", { leagueId }), "admin-settings": () => can(memberships, "league.settings", { leagueId }),
  };
  const anyAdmin = can(memberships, "league.manage", { leagueId }) || can(memberships, "division.manage", { leagueId }) || hasRole(memberships, "board_member", leagueId);
  if (!anyAdmin) return [];
  return ADMIN_NAV.filter((n) => checks[n.id]?.() ?? false);
}
