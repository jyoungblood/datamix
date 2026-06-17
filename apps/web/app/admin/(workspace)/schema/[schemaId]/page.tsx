import { SchemaBuilderRoute } from "@/app/admin/_screens/schema-builder";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

type AdminSchemaDetailPageProps = {
  params: {
    schemaId: string;
  };
};

export default function AdminSchemaDetailPage({
  params,
}: AdminSchemaDetailPageProps) {
  return (
    <AdminWorkspacePage>
      <SchemaBuilderRoute mode="edit" schemaId={params.schemaId} />
    </AdminWorkspacePage>
  );
}
