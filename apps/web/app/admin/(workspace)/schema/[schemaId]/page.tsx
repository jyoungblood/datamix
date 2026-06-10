import { SchemaBuilderRoute } from "@/app/admin/_screens/schema-builder";

type AdminSchemaDetailPageProps = {
  params: {
    schemaId: string;
  };
};

export default function AdminSchemaDetailPage({
  params,
}: AdminSchemaDetailPageProps) {
  return <SchemaBuilderRoute mode="edit" schemaId={params.schemaId} />;
}
