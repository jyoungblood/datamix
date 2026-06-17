import { SchemaBuilderRoute } from "@/app/admin/_screens/schema-builder";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminNewSchemaPage() {
  return (
    <AdminWorkspacePage>
      <SchemaBuilderRoute mode="create" />
    </AdminWorkspacePage>
  );
}
