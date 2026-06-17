import { SchemaOverviewRoute } from "@/app/admin/_screens/schema-overview";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminSchemaPage() {
  return (
    <AdminWorkspacePage>
      <SchemaOverviewRoute />
    </AdminWorkspacePage>
  );
}
