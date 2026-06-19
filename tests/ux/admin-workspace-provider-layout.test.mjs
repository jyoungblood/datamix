import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const buttonComponent = path.join(repoRoot, "apps/web/src/components/ui/button.tsx");
const globalStyles = path.join(repoRoot, "apps/web/src/styles/globals.css");
const adminRoot = path.join(repoRoot, "apps/web/src/admin");
const workspaceGroup = path.join(adminRoot, "(workspace)");
const workspaceLayout = path.join(workspaceGroup, "layout.tsx");
const workspacePage = path.join(adminRoot, "_workspace/admin-workspace-page.tsx");
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
const adminHomeSourcePath = path.join(adminRoot, "_screens/admin-home.tsx");
const contentEditorSourcePath = path.join(
  adminRoot,
  "_screens/content-editor.tsx",
);
const contentIndexSourcePath = path.join(
  adminRoot,
  "_screens/content-index.tsx",
);
const mediaLibrarySourcePath = path.join(
  adminRoot,
  "_screens/media-library.tsx",
);
const schemaBuilderSourcePath = path.join(
  adminRoot,
  "_screens/schema-builder.tsx",
);
const schemaOverviewSourcePath = path.join(
  adminRoot,
  "_screens/schema-overview.tsx",
);
const teamAndRolesSourcePath = path.join(
  adminRoot,
  "_screens/team-and-roles.tsx",
);
const manualRefreshFreeScreens = [
  "admin-home.tsx",
  "content-editor.tsx",
  "content-index.tsx",
  "media-library.tsx",
  "schema-builder.tsx",
  "schema-overview.tsx",
  "settings-api-keys.tsx",
  "team-and-roles.tsx",
];
const workspaceProvider = path.join(
  adminRoot,
  "_workspace/admin-workspace-provider.tsx",
);
const nextShimTypes = path.join(repoRoot, "apps/web/src/types/next-shims.d.ts");

const protectedWorkspacePages = [
  "page.tsx",
  "account/page.tsx",
  "content/page.tsx",
  "content/new/page.tsx",
  "content/[schemaId]/[recordId]/page.tsx",
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
  existsSync(workspacePage),
  "Protected admin routes should share an explicit AdminWorkspacePage wrapper.",
);

const workspacePageSource = readFileSync(workspacePage, "utf8");

assert(
  workspacePageSource.includes("AdminWorkspaceProvider") &&
    workspacePageSource.includes("<AdminWorkspaceProvider>"),
  "AdminWorkspacePage should mount the AdminWorkspaceProvider.",
);

assert(
  !existsSync(workspaceLayout) ||
    !readFileSync(workspaceLayout, "utf8").includes("AdminWorkspaceProvider"),
  "Protected admin routes should not rely on a route-group layout for AdminWorkspaceProvider.",
);

for (const pagePath of protectedWorkspacePages) {
  const source = readFileSync(path.join(workspaceGroup, pagePath), "utf8");

  assert(
    existsSync(path.join(workspaceGroup, pagePath)),
    `Protected admin page should live under the shared workspace group: ${pagePath}.`,
  );
  assert(
    source.includes("AdminWorkspacePage") &&
      source.includes("<AdminWorkspacePage>"),
    `Protected admin page should explicitly wrap its screen with AdminWorkspacePage: ${pagePath}.`,
  );
  assert(
    !source.includes("AdminWorkspaceProviderFallback"),
    `Protected admin page should use the shared workspace layout provider instead of a fallback wrapper: ${pagePath}.`,
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
const adminHomeSource = readFileSync(adminHomeSourcePath, "utf8");
const contentEditorSource = readFileSync(contentEditorSourcePath, "utf8");
const contentIndexSource = readFileSync(contentIndexSourcePath, "utf8");
const mediaLibrarySource = readFileSync(mediaLibrarySourcePath, "utf8");
const schemaBuilderSource = readFileSync(schemaBuilderSourcePath, "utf8");
const schemaOverviewSource = readFileSync(schemaOverviewSourcePath, "utf8");
const teamAndRolesSource = readFileSync(teamAndRolesSourcePath, "utf8");
const userAccountSource = readFileSync(userAccountScreen, "utf8");
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
  adminFrameSource.includes("prefetchAccountRoute") &&
    adminFrameSource.includes("onFocus={prefetchAccountRoute}") &&
    adminFrameSource.includes("onMouseEnter={prefetchAccountRoute}") &&
    adminFrameSource.includes("prefetch={account.prefetch ?? true}") &&
    workspaceRouteFrameSource.includes("section: accountRoute.section"),
  "The sidebar account link should use Vinext/Next Link prefetching and warm the account route on hover/focus.",
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
  "AdminDetailPanelSkeleton",
  "AdminLoadingReserve",
  "AdminMiniListSkeleton",
  "AdminTableSkeleton",
  "useDelayedLoadingIndicator",
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
    !source.includes("RefreshCcw") &&
      !source.includes("refreshCollections") &&
      !source.includes("refreshMediaAssets") &&
      !source.includes("refreshRecords") &&
      !source.includes("refreshAvailableRoles") &&
      !source.includes("refreshUserList") &&
      !source.includes("Retry refresh") &&
      !source.includes("Retry schema refresh") &&
      !source.includes("Refreshing "),
    `${screenFile} should not render manual refresh controls or keep refresh-specific handlers.`,
  );
}

assert(
  !providerSource.includes("isRefreshingCollections") &&
    !providerSource.includes("isRefreshingMediaAssets") &&
    !providerSource.includes("isRefreshingRecords") &&
    !providerSource.includes("refreshAccess") &&
    !providerSource.includes("refreshApiKeyData") &&
    !providerSource.includes("refreshAvailableRoles") &&
    !providerSource.includes("refreshCollections") &&
    !providerSource.includes("refreshMediaAssets") &&
    !providerSource.includes("refreshRecords") &&
    !providerSource.includes("refreshUserList"),
  "The admin workspace provider should not expose manual refresh state or refresh-specific context functions.",
);

assert(
  !adminCommandPaletteSource.includes("refreshCurrentRoute") &&
    !adminCommandPaletteSource.includes("Refresh ") &&
    !adminCommandPaletteSource.includes("group: \"refresh\"") &&
    !adminCommandPaletteSource.includes("keywords: [\"refresh\"") &&
    !commandPaletteDialogSource.includes('"refresh"') &&
    !commandPaletteDialogSource.includes("Refresh"),
  "The command palette should not include refresh commands or a refresh command group.",
);

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
  globalStylesSource.includes('html:has([data-page-canvas="muted"])') &&
    globalStylesSource.includes("--page-canvas: var(--muted);") &&
    adminFrameSource.includes('data-page-canvas="muted"'),
  "Admin workspace pages should tint the reserved scrollbar gutter to match the muted main canvas.",
);

assert(
  workspaceRouteFrameSource.includes("max-w-6xl") &&
    workspaceRouteFrameSource.includes("mx-auto") &&
    workspaceRouteFrameSource.includes("AdminWorkspaceCommandPalette") &&
    workspaceRouteFrameSource.includes("{children}"),
  "The shared workspace route frame should own one centered max-w-6xl content rail for every admin screen.",
);

for (const screenFile of screenFiles) {
  const source = readFileSync(path.join(adminRoot, "_screens", screenFile), "utf8");

  assert(
    !/mx-auto\s+flex\s+max-w-(?:5xl|6xl)/.test(source),
    `${screenFile} should not define its own centered admin route width wrapper.`,
  );
}

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

assert(
  contentIndexSource.includes("const shouldShowCollectionSkeleton =") &&
    contentIndexSource.includes("permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError") &&
    contentIndexSource.includes("const shouldShowContentRecordsSkeleton =") &&
    /!hasCurrentContentRecords\s*&&\s*!recordLoadError/.test(contentIndexSource) &&
    contentIndexSource.includes("const shouldShowSkeleton =") &&
    /shouldShowCollectionSkeleton\s*\|\|\s*shouldShowContentRecordsSkeleton/.test(contentIndexSource) &&
    /const shouldShowDelayedSkeleton\s*=\s*useDelayedLoadingIndicator\(shouldShowSkeleton\)/.test(contentIndexSource) &&
    contentIndexSource.includes("shouldShowDelayedSkeleton ?") &&
    contentIndexSource.includes("AdminLoadingReserve"),
  "Content index should keep first-paint collection/content empty states hidden and delay skeletons until loading is perceptible.",
);

assert(
  contentEditorSource.includes(
    "permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError",
  ) &&
    contentEditorSource.includes("const isInitialRecordLoad =") &&
    contentEditorSource.includes("!recordLoadError") &&
    contentEditorSource.includes("(!isActiveRecordCollection || !hasLoadedRecords)") &&
    contentEditorSource.includes("shouldShowContentSchemaLoadingState") &&
    contentEditorSource.includes("shouldShowContentRecordLoadingState") &&
    !contentEditorSource.includes("Loading content record id"),
  "Content editor should hide route-param placeholders and delay visible loading states until API loading is perceptible.",
);

assert(
  schemaBuilderSource.includes(
    "permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError",
  ) &&
    schemaBuilderSource.includes("shouldBlockSchemaUntilLoaded") &&
    schemaBuilderSource.includes("shouldShowSchemaLoadingState") &&
    schemaBuilderSource.includes("AdminLoadingReserve") &&
    !schemaBuilderSource.includes("`${decodedSchemaId} schema`") &&
    !schemaBuilderSource.includes(
      "const isInitialCollectionLoad = isLoadingCollections && !hasLoadedCollections;",
    ),
  "Schema builder edit routes should not show the route id as the page title before schema data loads.",
);

assert(
  adminHomeSource.includes("AdminMiniListSkeleton") &&
    /const shouldShowRecentSchemaSkeleton\s*=\s*useDelayedLoadingIndicator\(isInitialCollectionLoad\)/.test(adminHomeSource) &&
    adminHomeSource.includes("shouldShowRecentSchemaSkeleton ?") &&
    adminHomeSource.includes("const isInitialCollectionLoad =") &&
    adminHomeSource.includes("permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError") &&
    adminHomeSource.includes("if (!hasLoaded)") &&
    !adminHomeSource.includes('label: "Queued"'),
  "The dashboard should reserve loading UI on first paint instead of rendering queued or empty overview states.",
);

assert(
  settingsApiKeysSource.includes("setupStatus.isPending") &&
    settingsApiKeysSource.includes("shouldShowOAuthSkeleton") &&
    settingsApiKeysSource.includes("shouldShowApiKeySkeleton") &&
    settingsApiKeysSource.includes("shouldShowRoleSkeleton"),
  "Settings OAuth/API key/role panels should delay skeletons while setup/runtime details are pending.",
);

for (const [screenLabel, source] of [
  ["schema overview", schemaOverviewSource],
  ["media library", mediaLibrarySource],
  ["team and roles", teamAndRolesSource],
]) {
  assert(
    source.includes("useDelayedLoadingIndicator") &&
      source.includes("AdminLoadingReserve"),
    `${screenLabel} should delay skeleton display and reserve layout during fast initial loads.`,
  );
}
