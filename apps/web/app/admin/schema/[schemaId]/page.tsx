import { AdminRoutePlaceholder } from "../../_screens/admin-route-placeholder";
import { adminRoutes } from "../../_workspace/admin-routes";

type AdminSchemaDetailPageProps = {
  params: {
    schemaId: string;
  };
};

export default function AdminSchemaDetailPage({
  params,
}: AdminSchemaDetailPageProps) {
  return <AdminRoutePlaceholder route={adminRoutes.schema.detail(params.schemaId)} />;
}
