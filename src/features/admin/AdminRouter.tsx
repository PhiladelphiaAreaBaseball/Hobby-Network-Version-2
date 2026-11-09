import { AdminDashboard } from "./AdminDashboard";
import { CalculatorPage } from "./CalculatorPage";
import { AdminRegistrations, AdminPlayers, AdminTeams, AdminMembers } from "./AdminOps";
import { AdminSchedule, AdminFields } from "./AdminSchedule";
import { AdminFinance, AdminSponsors, AdminReports } from "./AdminMoney";
import { AdminWebsite, AdminCommunications, AdminContent, AdminSettings } from "./AdminContent";
import { AdminVolunteers } from "./AdminVolunteers";
import { AdminTryouts } from "../tryouts/TryoutPages";
import { AdminSafety } from "./AdminSafety";
import { AdminUmpires } from "./AdminUmpires";
import { AdminSeasonClose } from "./AdminSeasonClose";
import { AdminSurveys } from "./AdminSurveys";
import { AdminForms } from "./AdminForms";
import { AdminTournaments } from "./AdminTournaments";
import { AdminFundraising } from "./AdminFundraising";
import { useAppStore, currentMemberships } from "../../core/store";
import { useTenant } from "../../core/select";
import { visibleAdminNav } from "../../app/nav";
import { Notice, Page, PageHead } from "../../components/ui";
import { can } from "../../core/rbac";
export function AdminRouter({ sub }: { sub?: string }) {
  const t = useTenant(); const s = useAppStore(); const memberships = currentMemberships(s);
  const nav = t ? visibleAdminNav(memberships, t.leagueId) : [];
  if (!t || nav.length === 0) return <Page><PageHead title="League administration" /><Notice kind="warn">Administration tools are available to league presidents, board members and division commissioners. Switch to one of those roles to explore them.</Notice></Page>;
  if (!sub) return <AdminDashboard />;
  if (sub.startsWith("calculator")) { const ok = nav.some((n) => n.id === "admin-calculator"); return ok ? <CalculatorPage code={sub.startsWith("calculator-") ? sub.slice("calculator-".length) : undefined} /> : <Denied />; }
  if (sub === "content" && can(memberships, "platform.manage")) return <AdminContent />;
  if (!nav.some((n) => n.route === `admin-${sub}`)) return <Denied />;
  switch (sub) {
    case "registrations": return <AdminRegistrations />; case "players": return <AdminPlayers />; case "teams": return <AdminTeams />; case "members": return <AdminMembers />;
    case "tryouts": return <AdminTryouts />; case "safety": return <AdminSafety />; case "umpires": return <AdminUmpires />; case "season": return <AdminSeasonClose />; case "surveys": return <AdminSurveys />; case "forms": return <AdminForms />; case "tournaments": return <AdminTournaments />; case "schedule": return <AdminSchedule />; case "fields": return <AdminFields />; case "volunteers": return <AdminVolunteers />;
    case "finance": return <AdminFinance />; case "sponsors": return <AdminSponsors />; case "fundraising": return <AdminFundraising />; case "reports": return <AdminReports />;
    case "website": return <AdminWebsite />; case "communications": return <AdminCommunications />; case "content": return <AdminContent />; case "settings": return <AdminSettings />;
    default: return <Denied />;
  }
}
function Denied() { return <Page><PageHead title="Not available" /><Notice kind="warn">Your role does not include this administration area.</Notice></Page>; }
