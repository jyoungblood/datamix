import { AdminHomeRoute } from "@/app/admin/_screens/admin-home";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <div data-admin-homepage="overview-v1">
        <AdminHomeRoute />
      </div>
    </AdminWorkspaceProviderFallback>
  );
}
