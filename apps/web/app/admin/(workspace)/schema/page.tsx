import { SchemaOverviewRoute } from "@/app/admin/_screens/schema-overview";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminSchemaPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <SchemaOverviewRoute />
    </AdminWorkspaceProviderFallback>
  );
}
