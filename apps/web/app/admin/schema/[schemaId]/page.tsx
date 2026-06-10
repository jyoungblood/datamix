import { SchemaBuilderRoute } from "../../_screens/schema-builder";

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
