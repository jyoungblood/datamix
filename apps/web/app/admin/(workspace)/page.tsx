import { AdminHomeRoute } from "@/app/admin/_screens/admin-home";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminPage() {
  return (
    <AdminWorkspacePage>
      <div data-admin-homepage="overview-v1">
        <AdminHomeRoute />
      </div>
    </AdminWorkspacePage>
  );
}
