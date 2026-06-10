import { AdminRoutePlaceholder } from "../_screens/admin-route-placeholder";
import { adminRoutes } from "../_workspace/admin-routes";

export default function AdminSettingsPage() {
  return <AdminRoutePlaceholder route={adminRoutes.settings()} />;
}
