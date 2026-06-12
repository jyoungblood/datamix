import { ContentCollectionRoute } from "@/app/admin/_screens/content-collection";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

type AdminCollectionPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminCollectionPage({ params }: AdminCollectionPageProps) {
  return (
    <AdminWorkspaceProviderFallback>
      <ContentCollectionRoute collectionName={params.collection} />
    </AdminWorkspaceProviderFallback>
  );
}
