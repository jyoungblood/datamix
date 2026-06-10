import { AdminRoutePlaceholder } from "../../_screens/admin-route-placeholder";
import { adminRoutes } from "../../_workspace/admin-routes";

type AdminCollectionPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminCollectionPage({ params }: AdminCollectionPageProps) {
  return (
    <AdminRoutePlaceholder
      route={adminRoutes.content.collection(params.collection)}
    />
  );
}
