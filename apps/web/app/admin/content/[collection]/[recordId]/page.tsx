import { AdminRoutePlaceholder } from "../../../_screens/admin-route-placeholder";
import { adminRoutes } from "../../../_workspace/admin-routes";

type AdminRecordDetailPageProps = {
  params: {
    collection: string;
    recordId: string;
  };
};

export default function AdminRecordDetailPage({
  params,
}: AdminRecordDetailPageProps) {
  return (
    <AdminRoutePlaceholder
      route={adminRoutes.content.record(params.collection, params.recordId)}
    />
  );
}
