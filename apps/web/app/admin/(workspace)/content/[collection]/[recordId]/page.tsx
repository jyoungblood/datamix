import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

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
    <AdminWorkspaceProviderFallback>
      <ContentEditorRoute
        collectionName={params.collection}
        mode="edit"
        recordId={params.recordId}
      />
    </AdminWorkspaceProviderFallback>
  );
}
