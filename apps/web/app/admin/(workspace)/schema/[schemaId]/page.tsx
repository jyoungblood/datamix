import { SchemaBuilderRoute } from "@/app/admin/_screens/schema-builder";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

type AdminSchemaDetailPageProps = {
  params: {
    schemaId: string;
  };
};

export default function AdminSchemaDetailPage({
  params,
}: AdminSchemaDetailPageProps) {
  return (
    <AdminWorkspaceProviderFallback>
      <SchemaBuilderRoute mode="edit" schemaId={params.schemaId} />
    </AdminWorkspaceProviderFallback>
  );
}
