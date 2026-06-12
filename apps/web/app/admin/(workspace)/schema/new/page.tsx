import { SchemaBuilderRoute } from "@/app/admin/_screens/schema-builder";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminNewSchemaPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <SchemaBuilderRoute mode="create" />
    </AdminWorkspaceProviderFallback>
  );
}
