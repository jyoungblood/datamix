import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type ProtectedAdminRouteExpectation = {
  body: string;
  bodyFile: string;
  pageSignals: string[];
  resolver: string;
  route: string;
};

type RouteBodyExpectation = {
  bodyFile: string;
  forbiddenSignals?: RegExp[];
  requiredSignals: RegExp[];
};

const pagesAdminDirectory = path.resolve("apps/web/src/pages/admin");
const adminDirectory = path.resolve("apps/web/src/admin");
const adminComponentsDirectory = path.resolve("apps/web/src/components/admin");
const serverRoutesDirectory = path.resolve("apps/web/src/server/routes");
const workspaceResolverPath = path.join(serverRoutesDirectory, "astro-workspace-page.ts");
const schemaOverviewResolverPath = path.join(
  serverRoutesDirectory,
  "astro-admin-schema-overview-page.ts",
);
const contentIndexResolverPath = path.join(
  serverRoutesDirectory,
  "astro-admin-content-index-page.ts",
);
const statefulResolverPath = path.join(
  serverRoutesDirectory,
  "astro-admin-stateful-pages.ts",
);
const reactClientDirective = `client:only=${'"react"'}`;

const protectedAdminRoutes: ProtectedAdminRouteExpectation[] = [
  {
    body: "AdminDashboardRouteBody",
    bodyFile: "AdminDashboardRouteBody.astro",
    pageSignals: ["workspace={page.workspace}"],
    resolver: "resolveWorkspacePage",
    route: "index.astro",
  },
  {
    body: "AccountRouteBody",
    bodyFile: "AccountRouteBody.astro",
    pageSignals: [
      "routeAccess={page.workspace.routeAccess}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveWorkspacePage",
    route: "account.astro",
  },
  {
    body: "SchemaOverviewRouteBody",
    bodyFile: "SchemaOverviewRouteBody.astro",
    pageSignals: [
      "collections={page.schemaOverview.collections}",
      "collectionLoadError={page.schemaOverview.collectionLoadError}",
      "routeAccess={page.workspace.routeAccess}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveSchemaOverviewPage",
    route: "schema/index.astro",
  },
  {
    body: "SchemaBuilderRouteBody",
    bodyFile: "SchemaBuilderRouteBody.astro",
    pageSignals: [
      "collectionLoadError={page.schemaBuilder.collectionLoadError}",
      "collections={page.schemaBuilder.collections}",
      "collectionsLoaded={page.schemaBuilder.collectionsLoaded}",
      'mode="create"',
      "routeAccess={page.workspace.routeAccess}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveSchemaBuilderPage",
    route: "schema/new.astro",
  },
  {
    body: "SchemaBuilderRouteBody",
    bodyFile: "SchemaBuilderRouteBody.astro",
    pageSignals: [
      "collectionLoadError={page.schemaBuilder.collectionLoadError}",
      "collections={page.schemaBuilder.collections}",
      "collectionsLoaded={page.schemaBuilder.collectionsLoaded}",
      'mode="edit"',
      "schemaId={schemaId ?? \"\"}",
      "routeAccess={page.workspace.routeAccess}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveSchemaBuilderPage",
    route: "schema/[schemaId].astro",
  },
  {
    body: "ContentIndexRouteBody",
    bodyFile: "ContentIndexRouteBody.astro",
    pageSignals: [
      "collectionLoadError={page.contentIndex.collectionLoadError}",
      "collections={page.contentIndex.collections}",
      "recordLoadError={page.contentIndex.recordLoadError}",
      "recordRows={page.contentIndex.recordRows}",
      "routeAccess={page.workspace.routeAccess}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveContentIndexPage",
    route: "content/index.astro",
  },
  {
    body: "ContentEditorRouteBody",
    bodyFile: "ContentEditorRouteBody.astro",
    pageSignals: [
      "collectionLoadError={page.contentEditor.collectionLoadError}",
      "collections={page.contentEditor.collections}",
      "collectionsLoaded={page.contentEditor.collectionsLoaded}",
      "mediaAssets={page.contentEditor.mediaAssets}",
      "mediaAssetsLoaded={page.contentEditor.mediaAssetsLoaded}",
      "mediaLoadError={page.contentEditor.mediaLoadError}",
      'mode="create"',
      "recordLoadError={page.contentEditor.recordLoadError}",
      "records={page.contentEditor.records}",
      "recordsLoaded={page.contentEditor.recordsLoaded}",
      "routeAccess={page.workspace.routeAccess}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveContentEditorPage",
    route: "content/new.astro",
  },
  {
    body: "ContentEditorRouteBody",
    bodyFile: "ContentEditorRouteBody.astro",
    pageSignals: [
      "collectionLoadError={page.contentEditor.collectionLoadError}",
      "collections={page.contentEditor.collections}",
      "collectionsLoaded={page.contentEditor.collectionsLoaded}",
      "mediaAssets={page.contentEditor.mediaAssets}",
      "mediaAssetsLoaded={page.contentEditor.mediaAssetsLoaded}",
      "mediaLoadError={page.contentEditor.mediaLoadError}",
      'mode="edit"',
      "recordId={recordId ?? \"\"}",
      "recordLoadError={page.contentEditor.recordLoadError}",
      "records={page.contentEditor.records}",
      "recordsLoaded={page.contentEditor.recordsLoaded}",
      "routeAccess={page.workspace.routeAccess}",
      "schemaId={schemaId ?? \"\"}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveContentEditorPage",
    route: "content/[schemaId]/[recordId].astro",
  },
  {
    body: "MediaLibraryRouteBody",
    bodyFile: "MediaLibraryRouteBody.astro",
    pageSignals: [
      "mediaAssets={page.mediaLibrary.mediaAssets}",
      "mediaAssetsLoaded={page.mediaLibrary.mediaAssetsLoaded}",
      "mediaLoadError={page.mediaLibrary.mediaLoadError}",
      "routeAccess={page.workspace.routeAccess}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveMediaLibraryPage",
    route: "media.astro",
  },
  {
    body: "TeamRouteBody",
    bodyFile: "TeamRouteBody.astro",
    pageSignals: [
      "roles={page.team.roles}",
      "rolesLoadError={page.team.rolesLoadError}",
      "rolesLoaded={page.team.rolesLoaded}",
      "routeAccess={page.workspace.routeAccess}",
      "users={page.team.users}",
      "usersLoadError={page.team.usersLoadError}",
      "usersLoaded={page.team.usersLoaded}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveTeamPage",
    route: "team.astro",
  },
  {
    body: "SettingsRouteBody",
    bodyFile: "SettingsRouteBody.astro",
    pageSignals: [
      "apiKeys={page.settings.apiKeys}",
      "apiKeysLoadError={page.settings.apiKeysLoadError}",
      "apiKeysLoaded={page.settings.apiKeysLoaded}",
      "publicApiRuntime={page.settings.publicApiRuntime}",
      "roles={page.settings.roles}",
      "rolesLoadError={page.settings.rolesLoadError}",
      "rolesLoaded={page.settings.rolesLoaded}",
      "routeAccess={page.workspace.routeAccess}",
      "setupStatus={page.settings.setupStatus}",
      "workspace={page.workspace}",
    ],
    resolver: "resolveSettingsPage",
    route: "settings.astro",
  },
];

const routeBodyExpectations: RouteBodyExpectation[] = [
  {
    bodyFile: "AdminDashboardRouteBody.astro",
    forbiddenSignals: [/\bAdminHomeRoute\b/, /\buseAdminDashboardData\b/],
    requiredSignals: [
      /data-admin-dashboard-placeholder/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
    ],
  },
  {
    bodyFile: "AccountRouteBody.astro",
    forbiddenSignals: [/\bUserAccountRoute\b/, /\bAccountContent\b/],
    requiredSignals: [
      /type Props = \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}/,
      /routeAccess\.isAllowed/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
      /<AccountSignOutButton\s+client:only="react"\s*\/>/,
      /<AccountProfileSettingsIsland\s+client:only="react"\s+workspace=\{workspace\}\s*\/>/,
    ],
  },
  {
    bodyFile: "SchemaOverviewRouteBody.astro",
    forbiddenSignals: [/\buseAdminCollectionsState\b/, /\bloadCollections\b/],
    requiredSignals: [
      /type Props = \{\s*collectionLoadError: string \| null;\s*collections: StoredCollectionDefinition\[\];\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}/,
      /routeAccess\.isAllowed/,
      /collections\.map/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
    ],
  },
  {
    bodyFile: "ContentIndexRouteBody.astro",
    forbiddenSignals: [
      /\buseAdminCollectionsState\b/,
      /\blistCollectionRecords\b/,
      /\bAdminTableSkeleton\b/,
    ],
    requiredSignals: [
      /type Props = \{\s*collectionLoadError: string \| null;\s*collections: StoredCollectionDefinition\[\];\s*recordLoadError: string \| null;\s*recordRows: ContentIndexRecordRow\[\];\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}/,
      /routeAccess\.isAllowed/,
      /recordRows\.map/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
    ],
  },
  {
    bodyFile: "SchemaBuilderRouteBody.astro",
    requiredSignals: [
      /collectionsLoaded: boolean;/,
      /routeAccess: AdminWorkspaceRouteAccessState;/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
      /<SchemaBuilderRoute\b[\s\S]*client:only="react"[\s\S]*routeAccess=\{routeAccess\}[\s\S]*workspace=\{workspace\}/,
    ],
  },
  {
    bodyFile: "ContentEditorRouteBody.astro",
    requiredSignals: [
      /mediaAssetsLoaded: boolean;/,
      /recordsLoaded: boolean;/,
      /routeAccess: AdminWorkspaceRouteAccessState;/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
      /<ContentEditorRoute\b[\s\S]*client:only="react"[\s\S]*routeAccess=\{routeAccess\}[\s\S]*workspace=\{workspace\}/,
    ],
  },
  {
    bodyFile: "MediaLibraryRouteBody.astro",
    requiredSignals: [
      /mediaAssetsLoaded: boolean;/,
      /routeAccess: AdminWorkspaceRouteAccessState;/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
      /<MediaLibraryRoute\b[\s\S]*client:only="react"[\s\S]*routeAccess=\{routeAccess\}[\s\S]*workspace=\{workspace\}/,
    ],
  },
  {
    bodyFile: "TeamRouteBody.astro",
    requiredSignals: [
      /rolesLoaded: boolean;/,
      /usersLoaded: boolean;/,
      /routeAccess: AdminWorkspaceRouteAccessState;/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
      /<TeamAndRolesRoute\b[\s\S]*client:only="react"[\s\S]*routeAccess=\{routeAccess\}[\s\S]*workspace=\{workspace\}/,
    ],
  },
  {
    bodyFile: "SettingsRouteBody.astro",
    requiredSignals: [
      /apiKeysLoaded: boolean;/,
      /rolesLoaded: boolean;/,
      /setupStatus: SetupStatusState;/,
      /routeAccess: AdminWorkspaceRouteAccessState;/,
      /<AdminWorkspaceCommandPalette\b[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
      /<SettingsApiKeysRoute\b[\s\S]*client:only="react"[\s\S]*routeAccess=\{routeAccess\}[\s\S]*workspace=\{workspace\}/,
    ],
  },
];

const deletedAdminRuntimeFiles = [
  "apps/web/src/admin/islands/workspace-routes.tsx",
  "apps/web/src/admin/islands/workspace-body-routes.tsx",
  "apps/web/src/admin/_screens/admin-home.tsx",
  "apps/web/src/admin/_state/admin-dashboard-data.ts",
];

const clientScreenPaths = [
  "apps/web/src/admin/_screens/schema-builder.tsx",
  "apps/web/src/admin/_screens/content-editor.tsx",
  "apps/web/src/admin/_screens/media-library.tsx",
  "apps/web/src/admin/_screens/team-and-roles.tsx",
  "apps/web/src/admin/_screens/settings-api-keys.tsx",
  "apps/web/src/admin/_screens/user-account.tsx",
];

const statefulClientRoutes = [
  {
    exportName: "SchemaBuilderRoute",
    path: "apps/web/src/admin/_screens/schema-builder.tsx",
  },
  {
    exportName: "ContentEditorRoute",
    path: "apps/web/src/admin/_screens/content-editor.tsx",
  },
  {
    exportName: "MediaLibraryRoute",
    path: "apps/web/src/admin/_screens/media-library.tsx",
  },
  {
    exportName: "TeamAndRolesRoute",
    path: "apps/web/src/admin/_screens/team-and-roles.tsx",
  },
  {
    exportName: "SettingsApiKeysRoute",
    path: "apps/web/src/admin/_screens/settings-api-keys.tsx",
  },
];

async function collectSourceFiles(directory: string): Promise<string[]> {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectSourceFiles(entryPath);
      }

      if (!/\.(?:astro|ts|tsx)$/.test(entry.name) || /\.test\./.test(entry.name)) {
        return [];
      }

      return [entryPath];
    }),
  );

  return files.flat();
}

function assertSourceIncludes(source: string, signal: string, message: string) {
  assert.ok(source.includes(signal), message);
}

test("protected admin pages render Astro route bodies from server-resolved data", async () => {
  await Promise.all(
    protectedAdminRoutes.map(async ({ body, bodyFile, pageSignals, resolver, route }) => {
      const pageSource = await readFile(path.join(pagesAdminDirectory, route), "utf8");
      const bodyPath = path.join(adminComponentsDirectory, bodyFile);

      assert.ok(existsSync(bodyPath), `${bodyFile} should exist for ${route}`);
      assert.match(
        pageSource,
        new RegExp(`import ${body} from "@\\/components\\/admin\\/${bodyFile}"`),
        `${route} should import ${body}`,
      );
      assert.match(
        pageSource,
        /AdminWorkspaceShell/,
        `${route} should render the Astro workspace shell`,
      );
      assert.match(
        pageSource,
        /DatamixRootLayout/,
        `${route} should use the shared Astro root layout`,
      );
      assert.match(
        pageSource,
        new RegExp(`${resolver}\\(Astro\\.request`),
        `${route} should resolve its page data in Astro frontmatter`,
      );
      assert.match(
        pageSource,
        new RegExp(`<${body}\\b`),
        `${route} should render ${body}`,
      );
      assert.doesNotMatch(
        pageSource,
        new RegExp(`${reactClientDirective}|@/admin/islands|Island\\b`),
        `${route} should not mount a whole-route retained React island`,
      );

      for (const signal of pageSignals) {
        assertSourceIncludes(
          pageSource,
          signal,
          `${route} should pass ${signal} into ${body}`,
        );
      }
    }),
  );
});

test("protected admin route inventory covers every Astro workspace page exactly once", async () => {
  const filesystemRoutes = (await collectSourceFiles(pagesAdminDirectory))
    .map((filePath) => path.relative(pagesAdminDirectory, filePath))
    .filter(
      (route) =>
        ![
          "forgot-password.astro",
          "login.astro",
          "reset-password.astro",
          "setup.astro",
        ].includes(route),
    )
    .sort();
  const inventoryRoutes = protectedAdminRoutes.map(({ route }) => route).sort();
  const duplicateRoutes = inventoryRoutes.filter(
    (route, index) => inventoryRoutes.indexOf(route) !== index,
  );

  assert.deepEqual(
    inventoryRoutes,
    filesystemRoutes,
    "Protected admin route inventory should match current Astro admin pages",
  );
  assert.deepEqual(
    duplicateRoutes,
    [],
    "Protected admin route inventory should not classify a route more than once",
  );
});

test("Astro route bodies own all retained client hydration points", async () => {
  await Promise.all(
    routeBodyExpectations.map(async ({ bodyFile, forbiddenSignals, requiredSignals }) => {
      const source = await readFile(path.join(adminComponentsDirectory, bodyFile), "utf8");

      for (const signal of requiredSignals) {
        assert.match(source, signal, `${bodyFile} should match ${signal}`);
      }

      for (const signal of forbiddenSignals ?? []) {
        assert.doesNotMatch(source, signal, `${bodyFile} should not match ${signal}`);
      }
    }),
  );
});

test("deleted admin bridge and dashboard runtime files stay removed", async () => {
  for (const relativePath of deletedAdminRuntimeFiles) {
    assert.ok(
      !existsSync(path.resolve(relativePath)),
      `${relativePath} should not exist after the Astro route body migration`,
    );
  }

  const islandsDirectory = path.join(adminDirectory, "islands");
  const islandEntries = existsSync(islandsDirectory)
    ? await collectSourceFiles(islandsDirectory)
    : [];

  assert.deepEqual(
    islandEntries,
    [],
    "apps/web/src/admin/islands should not contain retained route bridge source files",
  );
});

test("runtime source has no dependency on deleted admin route bridges", async () => {
  const sourceFiles = (
    await Promise.all(
      [
        adminDirectory,
        adminComponentsDirectory,
        pagesAdminDirectory,
        serverRoutesDirectory,
      ].map(collectSourceFiles),
    )
  ).flat();
  const forbiddenRuntimeSignals = [
    /@\/admin\/islands|admin\/islands/,
    /\bworkspace-routes\b|\bworkspace-body-routes\b/,
    /\bAdminHome(?:Island|Body|Route)\b/,
    /\buseAdminDashboardData\b|\badmin-dashboard-data\b/,
  ];

  assert.ok(sourceFiles.length > 0, "runtime source scan should find files");

  await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      const source = await readFile(sourceFile, "utf8");
      const relativePath = path.relative(process.cwd(), sourceFile);

      for (const signal of forbiddenRuntimeSignals) {
        assert.doesNotMatch(
          source,
          signal,
          `${relativePath} should not reference deleted admin bridge/dashboard runtime`,
        );
      }
    }),
  );
});

test("retained client screens are route-body islands without provider fallbacks", async () => {
  await Promise.all(
    clientScreenPaths.map(async (screenPath) => {
      const source = await readFile(path.resolve(screenPath), "utf8");

      assert.doesNotMatch(
        source,
        /useAdminWorkspace(?:RouteAccess)?|AdminWorkspaceProvider|AdminWorkspacePage|AdminWorkspaceContext/,
        `${screenPath} should not depend on the old workspace provider context`,
      );
      assert.doesNotMatch(
        source,
        /AdminWorkspaceRouteFrame|AdminFrame/,
        `${screenPath} should not render the workspace shell from React`,
      );
      assert.doesNotMatch(
        source,
        /from ["']next\/link["']|<Link\b/,
        `${screenPath} should use plain anchors in the Astro app`,
      );
    }),
  );

  await Promise.all(
    statefulClientRoutes.map(async ({ exportName, path: screenPath }) => {
      const source = await readFile(path.resolve(screenPath), "utf8");

      assert.match(
        source,
        /routeAccess: AdminWorkspaceRouteAccessState/,
        `${screenPath} should receive route access as explicit route-scoped state`,
      );
      assert.match(
        source,
        new RegExp(`export function ${exportName}\\b`),
        `${screenPath} should export ${exportName} for its Astro route body island`,
      );
    }),
  );

  const accountSource = await readFile(
    path.resolve("apps/web/src/admin/_screens/user-account.tsx"),
    "utf8",
  );

  assert.match(
    accountSource,
    /export function AccountProfileSettingsIsland/,
    "user-account.tsx should export the targeted account profile island",
  );
  assert.match(
    accountSource,
    /export function AccountSignOutButton/,
    "user-account.tsx should export the targeted account sign-out island",
  );
  assert.doesNotMatch(
    accountSource,
    /UserAccountRoute|AccountContent|AdminPageHeader/,
    "user-account.tsx should not keep the deleted whole-route account body",
  );
});

test("workspace and route-specific resolvers keep protected routes server-first", async () => {
  const workspaceResolver = await readFile(workspaceResolverPath, "utf8");
  const schemaOverviewResolver = await readFile(schemaOverviewResolverPath, "utf8");
  const contentIndexResolver = await readFile(contentIndexResolverPath, "utf8");
  const statefulResolver = await readFile(statefulResolverPath, "utf8");

  assert.match(
    workspaceResolver,
    /workspace:\s*createAdminWorkspaceProps\(/,
    "resolveWorkspacePage should serialize workspace props before route body rendering",
  );
  assert.match(
    workspaceResolver,
    /location: setupPath/,
    "resolveWorkspacePage should resolve setup redirects before protected route rendering",
  );
  assert.match(
    workspaceResolver,
    /location: createLoginRedirect\(request\)/,
    "resolveWorkspacePage should resolve login redirects before protected route rendering",
  );
  assert.match(
    schemaOverviewResolver,
    /resolveWorkspacePage\(request,\s*route\)/,
    "Schema overview resolver should reuse the shared workspace page resolver",
  );
  assert.match(
    schemaOverviewResolver,
    /workspace\.permissions\.canViewCollections/,
    "Schema overview resolver should check collection read permission before server loading",
  );
  assert.match(
    contentIndexResolver,
    /workspace\.permissions\.canViewCollections/,
    "Content index resolver should check collection read permission before server loading",
  );
  assert.match(
    contentIndexResolver,
    /workspace\.permissions\.canViewRecords/,
    "Content index resolver should check record read permission before server loading",
  );
  assert.match(
    contentIndexResolver,
    /Promise\.all\(\s*collections\.map/,
    "Content index resolver should load records across all collections without serializing each query",
  );
  assert.match(
    statefulResolver,
    /resolveCollectionData\(page\.workspace\)/,
    "Schema builder resolver should load collection data server-side",
  );
  assert.match(
    statefulResolver,
    /resolveContentEditorData\(page\.workspace,/,
    "Content editor resolver should load editor data server-side",
  );
  assert.match(
    statefulResolver,
    /resolveMediaData\(page\.workspace\)/,
    "Media resolver should load media data server-side",
  );
  assert.match(
    statefulResolver,
    /resolveTeamData\(page\.workspace\)/,
    "Team resolver should load team data server-side",
  );
  assert.match(
    statefulResolver,
    /resolveSettingsData\(page\.workspace\)/,
    "Settings resolver should load settings data server-side",
  );
});
