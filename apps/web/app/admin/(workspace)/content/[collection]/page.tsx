import { ContentCollectionRoute } from "@/app/admin/_screens/content-collection";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

type AdminCollectionPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminCollectionPage({ params }: AdminCollectionPageProps) {
  return (
    <AdminWorkspacePage>
      <ContentCollectionRoute collectionName={params.collection} />
    </AdminWorkspacePage>
  );
}
