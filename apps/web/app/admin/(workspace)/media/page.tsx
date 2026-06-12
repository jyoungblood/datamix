import { MediaLibraryRoute } from "@/app/admin/_screens/media-library";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminMediaPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <MediaLibraryRoute />
    </AdminWorkspaceProviderFallback>
  );
}
