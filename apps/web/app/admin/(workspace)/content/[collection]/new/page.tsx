import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

type AdminNewRecordPageProps = {
  params: {
    collection: string;
  };
};

export default function AdminNewRecordPage({ params }: AdminNewRecordPageProps) {
  return (
    <AdminWorkspacePage>
      <ContentEditorRoute collectionName={params.collection} mode="create" />
    </AdminWorkspacePage>
  );
}
