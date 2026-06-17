import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

type AdminRecordDetailPageProps = {
  params: {
    recordId: string;
    schemaId: string;
  };
};

export default function AdminRecordDetailPage({
  params,
}: AdminRecordDetailPageProps) {
  return (
    <AdminWorkspacePage>
      <ContentEditorRoute
        mode="edit"
        recordId={params.recordId}
        schemaId={params.schemaId}
      />
    </AdminWorkspacePage>
  );
}
