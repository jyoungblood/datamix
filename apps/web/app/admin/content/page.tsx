import { AdminRoutePlaceholder } from "../_screens/admin-route-placeholder";
import { adminRoutes } from "../_workspace/admin-routes";

export default function AdminContentPage() {
  return <AdminRoutePlaceholder route={adminRoutes.content.index()} />;
}
