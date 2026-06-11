import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const buttonComponent = path.join(repoRoot, "apps/web/components/ui/button.tsx");
const globalStyles = path.join(repoRoot, "apps/web/styles/globals.css");
const adminRoot = path.join(repoRoot, "apps/web/app/admin");
const workspaceGroup = path.join(adminRoot, "(workspace)");
const workspaceLayout = path.join(workspaceGroup, "layout.tsx");
const adminFrame = path.join(adminRoot, "_components/admin-frame.tsx");
const adminSkeleton = path.join(adminRoot, "_components/admin-skeleton.tsx");
const commandPaletteDialog = path.join(
  adminRoot,
  "_components/command-palette-dialog.tsx",
);
const adminCommandPalette = path.join(
  adminRoot,
  "_workspace/admin-command-palette.tsx",
);
const userAccountScreen = path.join(adminRoot, "_screens/user-account.tsx");
const workspaceRouteFrame = path.join(
  adminRoot,
  "_workspace/admin-workspace-route-frame.tsx",
);
const adminRoutesSourcePath = path.join(
  adminRoot,
  "_workspace/admin-routes.ts",
);
const settingsApiKeysScreen = path.join(
  adminRoot,
  "_screens/settings-api-keys.tsx",
);
const manualRefreshFreeScreens = [
  "admin-home.tsx",
  "content-index.tsx",
  "media-library.tsx",
  "schema-overview.tsx",
  "settings-api-keys.tsx",
  "team-and-roles.tsx",
];
const workspaceProvider = path.join(
  adminRoot,
  "_workspace/admin-workspace-provider.tsx",
);
const nextShimTypes = path.join(repoRoot, "apps/web/types/next-shims.d.ts");

const protectedWorkspacePages = [
  "page.tsx",
  "account/page.tsx",
  "content/page.tsx",
  "content/[collection]/page.tsx",
  "content/[collection]/new/page.tsx",
  "content/[collection]/[recordId]/page.tsx",
  "media/page.tsx",
  "schema/page.tsx",
  "schema/new/page.tsx",
  "schema/[schemaId]/page.tsx",
  "settings/page.tsx",
  "team/page.tsx",
];

const standaloneAuthPages = [
  "forgot-password/page.tsx",
  "login/page.tsx",
  "reset-password/page.tsx",
  "setup/page.tsx",
];

const screenFiles = [
  "admin-home.tsx",
  "content-collection.tsx",
  "content-editor.tsx",
  "content-index.tsx",
  "media-library.tsx",
  "schema-builder.tsx",
  "schema-overview.tsx",
  "settings-api-keys.tsx",
  "team-and-roles.tsx",
  "user-account.tsx",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  existsSync(workspaceLayout),
  "Protected admin routes should share apps/web/app/admin/(workspace)/layout.tsx.",
);

const layoutSource = readFileSync(workspaceLayout, "utf8");

assert(
  layoutSource.includes("AdminWorkspaceProvider") &&
    layoutSource.includes("<AdminWorkspaceProvider>"),
  "The protected admin layout should mount one persistent AdminWorkspaceProvider.",
);

for (const pagePath of protectedWorkspacePages) {
  assert(
    existsSync(path.join(workspaceGroup, pagePath)),
    `Protected admin page should live under the shared workspace group: ${pagePath}.`,
  );
}

for (const pagePath of standaloneAuthPages) {
  assert(
    existsSync(path.join(adminRoot, pagePath)),
    `Auth/setup page should remain outside the protected workspace group: ${pagePath}.`,
  );
}

for (const screenFile of screenFiles) {
  const source = readFileSync(path.join(adminRoot, "_screens", screenFile), "utf8");

  assert(
    !source.includes("AdminWorkspaceProvider"),
    `${screenFile} should consume the shared provider instead of mounting its own.`,
  );
}

const providerSource = readFileSync(workspaceProvider, "utf8");
const adminFrameSource = readFileSync(adminFrame, "utf8");
const workspaceRouteFrameSource = readFileSync(workspaceRouteFrame, "utf8");
const buttonComponentSource = readFileSync(buttonComponent, "utf8");
const globalStylesSource = readFileSync(globalStyles, "utf8");
const commandPaletteDialogSource = readFileSync(commandPaletteDialog, "utf8");
const adminCommandPaletteSource = readFileSync(adminCommandPalette, "utf8");
const settingsApiKeysSource = readFileSync(settingsApiKeysScreen, "utf8");
const userAccountSource = readFileSync(userAccountScreen, "utf8");
const adminHomeSource = readFileSync(path.join(adminRoot, "_screens/admin-home.tsx"), "utf8");
const adminRoutesSource = readFileSync(adminRoutesSourcePath, "utf8");

for (const transientTitle of ["Checking your session", "Loading access profile"]) {
  assert(
    !providerSource.includes(transientTitle),
    `Transient auth gate title should not be shown during admin navigation: ${transientTitle}.`,
  );
}

assert(
  adminFrameSource.includes("sticky top-0") &&
    adminFrameSource.includes("h-screen") &&
    adminFrameSource.includes("overflow-y-auto"),
  "The admin sidebar should stay pinned to the viewport so the account link remains visible on every admin screen.",
);

assert(
  adminFrameSource.includes('from "next/link"') &&
    adminFrameSource.includes("prefetch={item.prefetch") &&
    adminFrameSource.includes("onMouseEnter") &&
    adminFrameSource.includes("onFocus") &&
    adminFrameSource.includes("onPrefetch"),
  "Sidebar navigation should use Vinext/Next Link prefetching and warm routes on hover/focus.",
);

assert(
  providerSource.includes("prefetchAdminRoute") &&
    providerSource.includes("prefetchedRouteSectionsRef") &&
    workspaceRouteFrameSource.includes("prefetchAdminRoute") &&
    workspaceRouteFrameSource.includes("onPrefetch"),
  "The workspace provider and route frame should expose route-aware data prefetching for sidebar hover/focus.",
);

assert(
  adminRoutesSource.includes("// adminRoutes.home(),") &&
    workspaceRouteFrameSource.includes('brandRoute={adminRoutes.home()}'),
  "The admin home route should stay commented out of visible sidebar items while the brand link continues to prefetch the dashboard.",
);

assert(
  providerSource.includes('route.section === "home"') &&
    providerSource.includes("dashboardPrefetchTasks") &&
    adminHomeSource.includes('void prefetchAdminRoute({ section: "home" })'),
  "The admin dashboard should use the same route-aware data prefetcher for initial dashboard loads and sidebar hover/focus warmups.",
);

assert(
  adminHomeSource.includes('from "next/link"') &&
    adminHomeSource.includes("prefetch={item.route.section !== route.section}") &&
    adminHomeSource.includes("prefetch={true}"),
  "Dashboard navigation links should use Vinext/Next Link prefetching instead of plain anchors.",
);

assert(
  !adminHomeSource.includes("Refresh overview") &&
    !adminHomeSource.includes("handleRefreshOverview"),
  "The admin dashboard should not render a manual Refresh overview action or keep its local refresh handler.",
);

assert(
  existsSync(nextShimTypes) &&
    readFileSync(nextShimTypes, "utf8").includes('declare module "next/link"'),
  "The app should provide TypeScript declarations for the Vinext next/link shim used by the sidebar.",
);

assert(existsSync(adminSkeleton), "Admin screens should share skeleton primitives.");

const adminSkeletonSource = readFileSync(adminSkeleton, "utf8");

for (const skeletonExport of [
  "AdminDetailListSkeleton",
  "AdminMetricSkeleton",
  "AdminMiniListSkeleton",
  "AdminTableSkeleton",
]) {
  assert(
    adminSkeletonSource.includes(skeletonExport),
    `Admin skeleton primitives should export ${skeletonExport}.`,
  );
}

for (const [screenFile, expectedSkeleton] of [
  ["content-index.tsx", "AdminTableSkeleton"],
  ["media-library.tsx", "AdminMiniListSkeleton"],
  ["schema-overview.tsx", "AdminTableSkeleton"],
  ["settings-api-keys.tsx", "AdminMiniListSkeleton"],
  ["team-and-roles.tsx", "AdminMiniListSkeleton"],
]) {
  const source = readFileSync(path.join(adminRoot, "_screens", screenFile), "utf8");

  assert(
    source.includes(expectedSkeleton),
    `${screenFile} should render ${expectedSkeleton} during initial data loads.`,
  );
}

for (const screenFile of manualRefreshFreeScreens) {
  const source = readFileSync(path.join(adminRoot, "_screens", screenFile), "utf8");

  assert(
    !source.includes("RefreshCcw"),
    `${screenFile} should not render normal/manual refresh icon buttons.`,
  );
}

assert(
  adminCommandPaletteSource.includes("<input") &&
    adminCommandPaletteSource.includes("readOnly") &&
    adminCommandPaletteSource.includes("⌘ + K") &&
    !adminCommandPaletteSource.includes("Command palette</Button>"),
  "The command palette trigger should be an input-like search field with a keyboard hint, not a text button.",
);

const accountSignOutCount = (userAccountSource.match(/Sign out/g) ?? []).length;
const accountSaveProfileIndex = userAccountSource.indexOf("Save profile");
const accountFormSignOutIndex = userAccountSource.indexOf(
  "Sign out",
  accountSaveProfileIndex,
);

assert(
  accountSignOutCount === 1 && accountFormSignOutIndex === -1,
  "The account profile form should not render a second Sign out button next to Save profile.",
);

assert(
  !adminCommandPaletteSource.includes("placeholder=") &&
    !commandPaletteDialogSource.includes("placeholder="),
  "The command palette trigger and dialog should not render placeholder text.",
);

assert(
  !commandPaletteDialogSource.includes("document.body.style.overflow"),
  "Opening the command palette should not remove page scrollbars or shift the admin layout.",
);

assert(
  buttonComponentSource.includes("bg-primary text-primary-foreground") &&
    !buttonComponentSource.includes("text-[var(--primary-foreground)]"),
  "Primary buttons should keep using the semantic primary foreground utility.",
);

assert(
  globalStylesSource.includes('[data-slot="button"][data-variant="default"]') &&
    globalStylesSource.includes("color: var(--primary-foreground);"),
  "The design-system stylesheet should enforce high-contrast text for default primary buttons.",
);

assert(
  !settingsApiKeysSource.includes('"Refresh API keys"') &&
    settingsApiKeysSource.includes('title="Public API keys"') &&
    !settingsApiKeysSource.includes('{isLoadingApiKeys ? "Refreshing" : "Refresh"}'),
  "Settings should not render manual refresh buttons for Public API keys.",
);
