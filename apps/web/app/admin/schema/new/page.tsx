import { AdminRoutePlaceholder } from "../../_screens/admin-route-placeholder";
import { adminRoutes } from "../../_workspace/admin-routes";

export default function AdminNewSchemaPage() {
  return <AdminRoutePlaceholder route={adminRoutes.schema.new()} />;
}
