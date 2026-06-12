import { UserAccountRoute } from "@/app/admin/_screens/user-account";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminAccountPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <UserAccountRoute />
    </AdminWorkspaceProviderFallback>
  );
}
