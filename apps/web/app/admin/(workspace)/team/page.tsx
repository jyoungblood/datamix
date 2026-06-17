import { TeamAndRolesRoute } from "@/app/admin/_screens/team-and-roles";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminTeamPage() {
  return (
    <AdminWorkspacePage>
      <TeamAndRolesRoute />
    </AdminWorkspacePage>
  );
}
