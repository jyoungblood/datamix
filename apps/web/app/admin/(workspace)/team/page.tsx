import { TeamAndRolesRoute } from "@/app/admin/_screens/team-and-roles";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminTeamPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <TeamAndRolesRoute />
    </AdminWorkspaceProviderFallback>
  );
}
