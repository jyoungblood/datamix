import { SettingsApiKeysRoute } from "@/app/admin/_screens/settings-api-keys";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export default function AdminSettingsPage() {
  return (
    <AdminWorkspacePage>
      <SettingsApiKeysRoute />
    </AdminWorkspacePage>
  );
}
