import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

type AdminNewRecordPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminNewRecordPage({ params }: AdminNewRecordPageProps) {
  return (
    <AdminWorkspaceProviderFallback>
      <ContentEditorRoute collectionName={params.collection} mode="create" />
    </AdminWorkspaceProviderFallback>
  );
}
