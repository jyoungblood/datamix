import { AdminRoutePlaceholder } from "../_screens/admin-route-placeholder";
import { adminRoutes } from "../_workspace/admin-routes";

export default function AdminMediaPage() {
  return <AdminRoutePlaceholder route={adminRoutes.media()} />;
}
