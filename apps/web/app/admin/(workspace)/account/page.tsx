import { UserAccountRoute } from "@/app/admin/_screens/user-account";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminAccountPage() {
  return (
    <AdminWorkspacePage>
      <UserAccountRoute />
    </AdminWorkspacePage>
  );
}
