import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminNewRecordPage() {
  return (
    <AdminWorkspacePage>
      <ContentEditorRoute mode="create" />
    </AdminWorkspacePage>
  );
}
