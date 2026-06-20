import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const buttonComponent = path.join(repoRoot, "apps/web/src/components/ui/button.tsx");
const globalStyles = path.join(repoRoot, "apps/web/src/styles/globals.css");
const adminRoot = path.join(repoRoot, "apps/web/src/admin");
const adminPagesRoot = path.join(repoRoot, "apps/web/src/pages/admin");
const adminShell = path.join(repoRoot, "apps/web/src/components/admin/AdminWorkspaceShell.astro");
const accountRouteBody = path.join(
  repoRoot,
  "apps/web/src/components/admin/AccountRouteBody.astro",
);
const schemaOverviewRouteBody = path.join(
  repoRoot,
  "apps/web/src/components/admin/SchemaOverviewRouteBody.astro",
);
const contentIndexRouteBody = path.join(
  repoRoot,
  "apps/web/src/components/admin/ContentIndexRouteBody.astro",
);
const adminSidebar = path.join(
  repoRoot,
  "apps/web/src/components/admin/AdminWorkspaceSidebar.astro",
);
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
const workspaceRoutesIsland = path.join(adminRoot, "islands/workspace-routes.tsx");
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
  repoRoot,
  "apps/web/src/components/admin/ContentIndexRouteBody.astro",
);
const mediaLibrarySourcePath = path.join(
  adminRoot,
  "_screens/media-library.tsx",
);
const schemaBuilderSourcePath = path.join(
  adminRoot,
  "_screens/schema-builder.tsx",
);
const teamAndRolesSourcePath = path.join(
  adminRoot,
  "_screens/team-and-roles.tsx",
);
const manualRefreshFreeScreens = [
  "admin-home.tsx",
  "content-editor.tsx",
  "media-library.tsx",
  "schema-builder.tsx",
  "settings-api-keys.tsx",
  "team-and-roles.tsx",
];
const reactClientDirective = `client:only=${'"react"'}`;
const nextLinkImport = `from "next${"/"}link"`;

const protectedWorkspacePages = [
  ["index.astro", "AdminDashboardRouteBody", "resolveWorkspacePage"],
  ["content/new.astro", "ContentEditorRouteBody", "resolveContentEditorPage"],
  [
    "content/[schemaId]/[recordId].astro",
    "ContentEditorRouteBody",
    "resolveContentEditorPage",
  ],
  ["media.astro", "MediaLibraryRouteBody", "resolveMediaLibraryPage"],
  ["schema/new.astro", "SchemaBuilderRouteBody", "resolveSchemaBuilderPage"],
  ["schema/[schemaId].astro", "SchemaBuilderRouteBody", "resolveSchemaBuilderPage"],
  ["settings.astro", "SettingsRouteBody", "resolveSettingsPage"],
  ["team.astro", "TeamRouteBody", "resolveTeamPage"],
];
const astroNativeWorkspacePages = ["account.astro"];

const standaloneAuthPages = [
  "forgot-password.astro",
  "login.astro",
  "reset-password.astro",
  "setup.astro",
];

const screenFiles = [
  "admin-home.tsx",
  "content-editor.tsx",
  "media-library.tsx",
  "schema-builder.tsx",
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
  existsSync(adminShell),
  "Protected admin routes should share an Astro AdminWorkspaceShell template.",
);

assert(
  existsSync(adminSidebar),
  "Protected admin routes should share an Astro AdminWorkspaceSidebar template.",
);

assert(
  !existsSync(path.join(adminRoot, "_workspace/admin-workspace-page.tsx")) &&
    !existsSync(path.join(adminRoot, "_workspace/admin-workspace-provider.tsx")) &&
    !existsSync(path.join(adminRoot, "_workspace/admin-workspace-hooks.ts")),
  "Protected admin route islands should not depend on the old workspace provider wrapper or context hooks.",
);

for (const [pagePath, bodyName, resolverName] of protectedWorkspacePages) {
  const fullPath = path.join(adminPagesRoot, pagePath);

  assert(
    existsSync(fullPath),
    `Protected admin page should live under Astro admin pages: ${pagePath}.`,
  );

  const source = readFileSync(fullPath, "utf8");

  assert(
    source.includes("AdminWorkspaceShell"),
    `Protected admin page should render the Astro workspace shell: ${pagePath}.`,
  );
  assert(
    source.includes(bodyName) &&
      new RegExp(`<${bodyName}\\b`).test(source) &&
      !source.includes(reactClientDirective),
    `Protected admin page should render its Astro-native route body: ${pagePath}.`,
  );
  assert(
    source.includes(resolverName),
    `Protected admin page should resolve workspace access in Astro frontmatter: ${pagePath}.`,
  );
  assert(
    !source.includes("AdminWorkspaceProviderFallback"),
    `Protected admin page should not use a workspace provider fallback wrapper: ${pagePath}.`,
  );
}

for (const pagePath of astroNativeWorkspacePages) {
  const fullPath = path.join(adminPagesRoot, pagePath);

  assert(
    existsSync(fullPath),
    `Astro-native admin page should live under Astro admin pages: ${pagePath}.`,
  );

  const source = readFileSync(fullPath, "utf8");

  assert(
    source.includes("AdminWorkspaceShell"),
    `Astro-native admin page should render the Astro workspace shell: ${pagePath}.`,
  );
  assert(
    source.includes("AccountRouteBody") &&
      source.includes("routeAccess={page.workspace.routeAccess}") &&
      source.includes("workspace={page.workspace}"),
    `Astro-native admin page should pass serialized workspace props into its route body: ${pagePath}.`,
  );
  assert(
    source.includes("resolveWorkspacePage"),
    `Astro-native admin page should resolve workspace access in Astro frontmatter: ${pagePath}.`,
  );
  assert(
    !source.includes("AccountIsland") &&
      !source.includes("AdminWorkspaceProviderFallback"),
    `Astro-native admin page should not mount the retained whole-route account island: ${pagePath}.`,
  );
}

const schemaOverviewPageSource = readFileSync(
  path.join(adminPagesRoot, "schema/index.astro"),
  "utf8",
);
const contentIndexPageSource = readFileSync(
  path.join(adminPagesRoot, "content/index.astro"),
  "utf8",
);

assert(
  schemaOverviewPageSource.includes("AdminWorkspaceShell") &&
    schemaOverviewPageSource.includes("SchemaOverviewRouteBody") &&
    schemaOverviewPageSource.includes("resolveSchemaOverviewPage") &&
    schemaOverviewPageSource.includes("collections={page.schemaOverview.collections}") &&
    schemaOverviewPageSource.includes(
      "collectionLoadError={page.schemaOverview.collectionLoadError}",
    ) &&
    schemaOverviewPageSource.includes("routeAccess={page.workspace.routeAccess}") &&
    schemaOverviewPageSource.includes("workspace={page.workspace}"),
  "schema/index.astro should render the Astro-native schema overview body with server-loaded collection data.",
);

assert(
  !schemaOverviewPageSource.includes("SchemaOverviewIsland") &&
    !schemaOverviewPageSource.includes(reactClientDirective),
  "schema/index.astro should not mount the retained whole-route schema overview island.",
);

assert(
  contentIndexPageSource.includes("AdminWorkspaceShell") &&
    contentIndexPageSource.includes("ContentIndexRouteBody") &&
    contentIndexPageSource.includes("resolveContentIndexPage") &&
    contentIndexPageSource.includes(
      "collectionLoadError={page.contentIndex.collectionLoadError}",
    ) &&
    contentIndexPageSource.includes("collections={page.contentIndex.collections}") &&
    contentIndexPageSource.includes(
      "recordLoadError={page.contentIndex.recordLoadError}",
    ) &&
    contentIndexPageSource.includes("recordRows={page.contentIndex.recordRows}") &&
    contentIndexPageSource.includes("routeAccess={page.workspace.routeAccess}") &&
    contentIndexPageSource.includes("workspace={page.workspace}"),
  "content/index.astro should render the Astro-native content index body with server-loaded collection and record data.",
);

assert(
  !contentIndexPageSource.includes("ContentIndexIsland") &&
    !contentIndexPageSource.includes(reactClientDirective),
  "content/index.astro should not mount the retained whole-route content index island.",
);

for (const pagePath of standaloneAuthPages) {
  const fullPath = path.join(adminPagesRoot, pagePath);

  assert(
    existsSync(fullPath),
    `Auth/setup page should remain outside the protected workspace shell: ${pagePath}.`,
  );

  const source = readFileSync(fullPath, "utf8");

  assert(
    source.includes("AuthCard"),
    `Auth/setup page should use the shared Astro auth card: ${pagePath}.`,
  );
  assert(
    !source.includes(reactClientDirective),
    `Auth/setup page should not mount a React route bridge: ${pagePath}.`,
  );
}

for (const screenFile of screenFiles) {
  const source = readFileSync(path.join(adminRoot, "_screens", screenFile), "utf8");

  assert(
    !source.includes("AdminWorkspaceProvider"),
    `${screenFile} should not mount or import the old workspace provider.`,
  );
  assert(
    !source.includes("AdminWorkspaceRouteFrame") && !source.includes("AdminFrame"),
    `${screenFile} should not render the workspace shell from React.`,
  );
}

const shellSource = readFileSync(adminShell, "utf8");
const accountRouteBodySource = readFileSync(accountRouteBody, "utf8");
const schemaOverviewRouteBodySource = readFileSync(schemaOverviewRouteBody, "utf8");
const contentIndexRouteBodySource = readFileSync(contentIndexRouteBody, "utf8");
const sidebarSource = readFileSync(adminSidebar, "utf8");
const workspaceRoutesIslandSource = readFileSync(workspaceRoutesIsland, "utf8");
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
const teamAndRolesSource = readFileSync(teamAndRolesSourcePath, "utf8");
const userAccountSource = readFileSync(userAccountScreen, "utf8");
const adminRoutesSource = readFileSync(adminRoutesSourcePath, "utf8");

assert(
  sidebarSource.includes("sticky top-0") &&
    sidebarSource.includes("h-screen") &&
    sidebarSource.includes("overflow-y-auto"),
  "The admin sidebar should stay pinned to the viewport so the account link remains visible on every admin screen.",
);

assert(
  sidebarSource.includes("<a") &&
    sidebarSource.includes("href={route.href}") &&
    sidebarSource.includes('aria-current={isActive ? "page" : undefined}') &&
    !sidebarSource.includes("next/link") &&
    !sidebarSource.includes("prefetch"),
  "Sidebar navigation should use normal Astro anchors with page-current state.",
);

assert(
  sidebarSource.includes("href={account.href}") &&
    sidebarSource.includes("data-admin-account-image") &&
    sidebarSource.includes("data-admin-account-initials") &&
    sidebarSource.includes("data-admin-account-name"),
  "The Astro sidebar account link should expose hooks for live profile updates.",
);

assert(
  adminRoutesSource.includes("// adminRoutes.home(),") &&
    sidebarSource.includes("const brandRoute = adminRoutes.home()") &&
    sidebarSource.includes("href={brandRoute.href}"),
  "The admin home route should stay commented out of visible sidebar items while the brand link points to the dashboard.",
);

assert(
  adminHomeSource.includes("useAdminDashboardData") &&
    existsSync(
      path.join(
        repoRoot,
        "apps/web/src/admin/_state/admin-dashboard-data.ts",
      ),
    ),
  "The admin dashboard should use the route-scoped dashboard data hook for initial dashboard loads.",
);

assert(
  !adminHomeSource.includes(nextLinkImport) &&
    adminHomeSource.includes("href={item.route.href}"),
  "Dashboard navigation links should use normal anchors in the Astro app.",
);

assert(
  !adminHomeSource.includes("Refresh overview") &&
    !adminHomeSource.includes("handleRefreshOverview"),
  "The admin dashboard should not render a manual Refresh overview action or keep its local refresh handler.",
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
  ["media-library.tsx", "AdminMiniListSkeleton"],
  ["settings-api-keys.tsx", "AdminMiniListSkeleton"],
  ["team-and-roles.tsx", "AdminMiniListSkeleton"],
]) {
  const source = readFileSync(path.join(adminRoot, "_screens", screenFile), "utf8");

  assert(
    source.includes(expectedSkeleton),
    `${screenFile} should render ${expectedSkeleton} during initial data loads.`,
  );
}

assert(
  schemaOverviewRouteBodySource.includes("AdminWorkspaceCommandPalette") &&
    schemaOverviewRouteBodySource.includes('client:only="react"') &&
    schemaOverviewRouteBodySource.includes("collections.map") &&
    schemaOverviewRouteBodySource.includes("collectionLoadError") &&
    !schemaOverviewRouteBodySource.includes("useAdminCollectionsState") &&
    !schemaOverviewRouteBodySource.includes("AdminTableSkeleton"),
  "The Astro-native schema overview body should render server-loaded collections and keep only the command palette hydrated.",
);

assert(
  contentIndexRouteBodySource.includes("AdminWorkspaceCommandPalette") &&
    contentIndexRouteBodySource.includes('client:only="react"') &&
    contentIndexRouteBodySource.includes("recordRows.map") &&
    contentIndexRouteBodySource.includes("collectionLoadError") &&
    contentIndexRouteBodySource.includes("recordLoadError") &&
    !contentIndexRouteBodySource.includes("useAdminCollectionsState") &&
    !contentIndexRouteBodySource.includes("listCollectionRecords") &&
    !contentIndexRouteBodySource.includes("AdminTableSkeleton"),
  "The Astro-native content index body should render server-loaded records and keep only the command palette hydrated.",
);

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
    shellSource.includes('data-page-canvas="muted"'),
  "Admin workspace pages should tint the reserved scrollbar gutter to match the muted main canvas.",
);

assert(
  workspaceRoutesIslandSource.includes("max-w-6xl") &&
    workspaceRoutesIslandSource.includes("mx-auto") &&
    workspaceRoutesIslandSource.includes("AdminWorkspaceCommandPalette") &&
    workspaceRoutesIslandSource.includes("{children}") &&
    !workspaceRoutesIslandSource.includes("AdminWorkspacePage") &&
    !workspaceRoutesIslandSource.includes("AdminWorkspaceProvider"),
  "The retained workspace island should own one centered max-w-6xl content rail for retained React admin screens.",
);

assert(
  accountRouteBodySource.includes("max-w-6xl") &&
    accountRouteBodySource.includes("mx-auto") &&
    accountRouteBodySource.includes("AdminWorkspaceCommandPalette") &&
    accountRouteBodySource.includes("AccountProfileSettingsIsland") &&
    accountRouteBodySource.includes("AccountSignOutButton"),
  "The Astro-native account route body should preserve the centered admin rail and keep only targeted client islands.",
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
  contentIndexSource.includes("recordRows.map") &&
    contentIndexSource.includes("collectionLoadError && collections.length === 0") &&
    contentIndexSource.includes("recordLoadError && recordRows.length === 0") &&
    contentIndexSource.includes("Content list may be out of date") &&
    !contentIndexSource.includes("useDelayedLoadingIndicator") &&
    !contentIndexSource.includes("AdminLoadingReserve"),
  "Astro-native content index should render server-loaded content states without client-side initial-load skeletons.",
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
  ["media library", mediaLibrarySource],
  ["team and roles", teamAndRolesSource],
]) {
  assert(
    source.includes("useDelayedLoadingIndicator") &&
      source.includes("AdminLoadingReserve"),
    `${screenLabel} should delay skeleton display and reserve layout during fast initial loads.`,
  );
}
