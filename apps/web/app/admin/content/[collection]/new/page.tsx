import { AdminRoutePlaceholder } from "../../../_screens/admin-route-placeholder";
import { adminRoutes } from "../../../_workspace/admin-routes";

type AdminNewRecordPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminNewRecordPage({ params }: AdminNewRecordPageProps) {
  return (
    <AdminRoutePlaceholder
      route={adminRoutes.content.newRecord(params.collection)}
    />
  );
}
