import { SettingsApiKeysRoute } from "@/app/admin/_screens/settings-api-keys";
import { AdminWorkspaceProviderFallback } from "@/app/admin/_workspace/admin-workspace-provider";

export default function AdminSettingsPage() {
  return (
    <AdminWorkspaceProviderFallback>
      <SettingsApiKeysRoute />
    </AdminWorkspaceProviderFallback>
  );
}
