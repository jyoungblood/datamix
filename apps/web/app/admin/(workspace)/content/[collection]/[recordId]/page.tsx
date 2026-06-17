import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

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
    <AdminWorkspacePage>
      <ContentEditorRoute
        collectionName={params.collection}
        mode="edit"
        recordId={params.recordId}
      />
    </AdminWorkspacePage>
  );
}
