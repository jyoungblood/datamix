import { ContentIndexRoute } from "@/app/admin/_screens/content-index";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminContentPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <ContentIndexRoute />
    </AdminWorkspaceProviderFallback>
  );
}
