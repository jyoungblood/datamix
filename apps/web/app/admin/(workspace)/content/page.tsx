import { ContentIndexRoute } from "@/app/admin/_screens/content-index";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminContentPage() {
  return (
    <AdminWorkspacePage>
      <ContentIndexRoute />
    </AdminWorkspacePage>
  );
}
