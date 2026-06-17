import { MediaLibraryRoute } from "@/app/admin/_screens/media-library";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminMediaPage() {
  return (
    <AdminWorkspacePage>
      <MediaLibraryRoute />
    </AdminWorkspacePage>
  );
}
