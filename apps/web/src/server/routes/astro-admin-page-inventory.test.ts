import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type WorkspacePageExpectation = {
  island: string;
  route: string;
};

type WorkspaceBodyMigrationStage =
  | "workspace-props-resolved"
  | "server-data-needed"
  | "server-data-resolved"
  | "client-only-deferred";

type WorkspaceBodyRenderingMode = "retained-react-body" | "astro-native-body";

type WorkspaceBodyMigrationInventoryItem = WorkspacePageExpectation & {
  clientOnlySignals: string[];
  rendering: WorkspaceBodyRenderingMode;
  screen: string;
  stage: WorkspaceBodyMigrationStage;
};

const workspacePageExpectations: WorkspacePageExpectation[] = [
  { island: "AdminHomeIsland", route: "index.astro" },
  { island: "NewSchemaIsland", route: "schema/new.astro" },
  { island: "SchemaDetailIsland", route: "schema/[schemaId].astro" },
  { island: "NewContentIsland", route: "content/new.astro" },
  {
    island: "ContentRecordIsland",
    route: "content/[schemaId]/[recordId].astro",
  },
  { island: "MediaIsland", route: "media.astro" },
  { island: "TeamIsland", route: "team.astro" },
  { island: "SettingsIsland", route: "settings.astro" },
];

const protectedWorkspaceRoutes = [
  ...workspacePageExpectations.map(({ route }) => route),
  "account.astro",
  "content/index.astro",
  "schema/index.astro",
];

const workspaceBodyMigrationInventory: WorkspaceBodyMigrationInventoryItem[] = [
  {
    clientOnlySignals: ["useAdminDashboardData", "useAdminCollectionsState"],
    island: "AdminHomeIsland",
    rendering: "retained-react-body",
    route: "index.astro",
    screen: "apps/web/src/admin/_screens/admin-home.tsx",
    stage: "server-data-needed",
  },
  {
    clientOnlySignals: ["AdminWorkspaceCommandPalette"],
    island: "SchemaOverviewRouteBody",
    rendering: "astro-native-body",
    route: "schema/index.astro",
    screen: "apps/web/src/components/admin/SchemaOverviewRouteBody.astro",
    stage: "server-data-resolved",
  },
  {
    clientOnlySignals: ["SchemaBuilderRoute", "handleSaveSchema"],
    island: "NewSchemaIsland",
    rendering: "retained-react-body",
    route: "schema/new.astro",
    screen: "apps/web/src/admin/_screens/schema-builder.tsx",
    stage: "client-only-deferred",
  },
  {
    clientOnlySignals: ["SchemaBuilderRoute", "handleSaveSchema"],
    island: "SchemaDetailIsland",
    rendering: "retained-react-body",
    route: "schema/[schemaId].astro",
    screen: "apps/web/src/admin/_screens/schema-builder.tsx",
    stage: "client-only-deferred",
  },
  {
    clientOnlySignals: ["AdminWorkspaceCommandPalette"],
    island: "ContentIndexRouteBody",
    rendering: "astro-native-body",
    route: "content/index.astro",
    screen: "apps/web/src/components/admin/ContentIndexRouteBody.astro",
    stage: "server-data-resolved",
  },
  {
    clientOnlySignals: ["ContentEditorRoute", "GeneratedRecordFieldInput"],
    island: "NewContentIsland",
    rendering: "retained-react-body",
    route: "content/new.astro",
    screen: "apps/web/src/admin/_screens/content-editor.tsx",
    stage: "client-only-deferred",
  },
  {
    clientOnlySignals: ["ContentEditorRoute", "GeneratedRecordFieldInput"],
    island: "ContentRecordIsland",
    rendering: "retained-react-body",
    route: "content/[schemaId]/[recordId].astro",
    screen: "apps/web/src/admin/_screens/content-editor.tsx",
    stage: "client-only-deferred",
  },
  {
    clientOnlySignals: ["useAdminMediaState", "uploadMediaAsset"],
    island: "MediaIsland",
    rendering: "retained-react-body",
    route: "media.astro",
    screen: "apps/web/src/admin/_screens/media-library.tsx",
    stage: "client-only-deferred",
  },
  {
    clientOnlySignals: ["useAdminTeamState", "sendInvite"],
    island: "TeamIsland",
    rendering: "retained-react-body",
    route: "team.astro",
    screen: "apps/web/src/admin/_screens/team-and-roles.tsx",
    stage: "client-only-deferred",
  },
  {
    clientOnlySignals: ["useAdminApiKeysState", "useAdminRolesState"],
    island: "SettingsIsland",
    rendering: "retained-react-body",
    route: "settings.astro",
    screen: "apps/web/src/admin/_screens/settings-api-keys.tsx",
    stage: "client-only-deferred",
  },
  {
    clientOnlySignals: ["AccountProfileSettingsIsland", "AccountSignOutButton"],
    island: "AccountRouteBody",
    rendering: "astro-native-body",
    route: "account.astro",
    screen: "apps/web/src/components/admin/AccountRouteBody.astro",
    stage: "workspace-props-resolved",
  },
];

const workspaceIslands = [
  "AdminHomeIsland",
  "NewSchemaIsland",
  "SchemaDetailIsland",
  "NewContentIsland",
  "ContentRecordIsland",
  "MediaIsland",
  "TeamIsland",
  "SettingsIsland",
];

const authPageRoutes = [
  "setup.astro",
  "login.astro",
  "forgot-password.astro",
  "reset-password.astro",
];
const reactClientDirective = `client:only=${'"react"'}`;

const workspaceScreenPaths = [
  "apps/web/src/admin/_screens/admin-home.tsx",
  "apps/web/src/admin/_screens/schema-builder.tsx",
  "apps/web/src/admin/_screens/content-editor.tsx",
  "apps/web/src/admin/_screens/media-library.tsx",
  "apps/web/src/admin/_screens/team-and-roles.tsx",
  "apps/web/src/admin/_screens/settings-api-keys.tsx",
  "apps/web/src/admin/_screens/user-account.tsx",
];

const pagesAdminDirectory = path.resolve("apps/web/src/pages/admin");
const adminIslandsDirectory = path.resolve("apps/web/src/admin/islands");
const workspaceResolverPath = path.resolve(
  "apps/web/src/server/routes/astro-workspace-page.ts",
);
const workspacePropsSourcePath = path.resolve(
  "apps/web/src/admin/_workspace/admin-workspace-props.ts",
);
const adminCommandPaletteSourcePath = path.resolve(
  "apps/web/src/admin/_workspace/admin-command-palette.tsx",
);
const mediaLibrarySourcePath = path.resolve(
  "apps/web/src/admin/_screens/media-library.tsx",
);
const adminHomeSourcePath = path.resolve(
  "apps/web/src/admin/_screens/admin-home.tsx",
);
const schemaBuilderSourcePath = path.resolve(
  "apps/web/src/admin/_screens/schema-builder.tsx",
);
const contentIndexSourcePath = path.resolve(
  "apps/web/src/components/admin/ContentIndexRouteBody.astro",
);
const contentEditorSourcePath = path.resolve(
  "apps/web/src/admin/_screens/content-editor.tsx",
);
const teamAndRolesSourcePath = path.resolve(
  "apps/web/src/admin/_screens/team-and-roles.tsx",
);
const settingsApiKeysSourcePath = path.resolve(
  "apps/web/src/admin/_screens/settings-api-keys.tsx",
);
const userAccountSourcePath = path.resolve(
  "apps/web/src/admin/_screens/user-account.tsx",
);
const accountRouteBodySourcePath = path.resolve(
  "apps/web/src/components/admin/AccountRouteBody.astro",
);
const schemaOverviewRouteBodySourcePath = path.resolve(
  "apps/web/src/components/admin/SchemaOverviewRouteBody.astro",
);
const schemaOverviewPageResolverPath = path.resolve(
  "apps/web/src/server/routes/astro-admin-schema-overview-page.ts",
);
const contentIndexPageResolverPath = path.resolve(
  "apps/web/src/server/routes/astro-admin-content-index-page.ts",
);
const noProviderSourceRoots = [
  path.resolve("apps/web/src/admin"),
  path.resolve("apps/web/src/components"),
  path.resolve("apps/web/src/pages"),
];
const noProviderForbiddenSymbols = [
  "AdminWorkspaceProvider",
  "AdminWorkspacePage",
  "useAdminWorkspace",
  "useAdminWorkspaceRouteAccess",
  "AdminWorkspaceContext",
];
const adminTypecheckHintSourcePaths = [
  "apps/web/src/admin/_components/TiptapRichTextEditor.tsx",
  ...workspaceScreenPaths,
];

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectSourceFiles(entryPath);
      }

      return /\.(?:astro|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    }),
  );

  return files.flat();
}

test("Slice 3 Astro admin workspace pages render the Astro shell and retained React body islands", async () => {
  await Promise.all(
    workspacePageExpectations.map(async ({ island, route }) => {
      const source = await readFile(path.join(pagesAdminDirectory, route), "utf8");

      assert.match(
        source,
        /AdminWorkspaceShell/,
        `${route} should render the Astro workspace shell`,
      );
      assert.match(
        source,
        new RegExp(`<${island}\\b[^>]*${reactClientDirective}`),
        `${route} should mount ${island} as the retained React body island`,
      );
      assert.match(
        source,
        /DatamixRootLayout/,
        `${route} should use the shared Astro root layout`,
      );
    }),
  );
});

test("Slice 1 protected admin pages pass server workspace props to retained islands", async () => {
  await Promise.all(
    workspacePageExpectations.map(async ({ island, route }) => {
      const source = await readFile(path.join(pagesAdminDirectory, route), "utf8");

      assert.match(
        source,
        new RegExp(`<${island}\\b(?=[^>]*${reactClientDirective})(?=[^>]*workspace=\\{page\\.workspace\\})[^>]*`),
        `${route} should pass page.workspace into ${island}`,
      );
    }),
  );
});

test("Astro-native body migration inventory covers every protected workspace route", () => {
  const expectedRoutes = [...protectedWorkspaceRoutes].sort();
  const inventoryRoutes = workspaceBodyMigrationInventory
    .map(({ route }) => route)
    .sort();
  const duplicateRoutes = inventoryRoutes.filter(
    (route, index) => inventoryRoutes.indexOf(route) !== index,
  );
  const astroNativeRoutes = workspaceBodyMigrationInventory
    .filter(({ rendering }) => rendering === "astro-native-body")
    .map(({ route }) => route)
    .sort();
  const deferredRoutes = workspaceBodyMigrationInventory
    .filter(({ stage }) => stage === "client-only-deferred")
    .map(({ route }) => route);

  assert.deepEqual(
    inventoryRoutes,
    expectedRoutes,
    "Astro-native migration inventory should classify every protected workspace route exactly once",
  );
  assert.deepEqual(
    duplicateRoutes,
    [],
    "Astro-native migration inventory should not classify a route more than once",
  );
  assert.deepEqual(
    astroNativeRoutes,
    ["account.astro", "content/index.astro", "schema/index.astro"],
    "Account, schema overview, and content index should be tracked as Astro-native workspace bodies",
  );
  assert.deepEqual(
    deferredRoutes.sort(),
    [
      "content/[schemaId]/[recordId].astro",
      "content/new.astro",
      "media.astro",
      "schema/[schemaId].astro",
      "schema/new.astro",
      "settings.astro",
      "team.astro",
    ],
    "State-heavy editor, media, team, and settings routes should remain explicitly deferred",
  );
});

test("Astro-native body migration inventory matches current page rendering modes", async () => {
  await Promise.all(
    workspaceBodyMigrationInventory.map(async ({ island, rendering, route }) => {
      const source = await readFile(path.join(pagesAdminDirectory, route), "utf8");

      if (rendering === "retained-react-body") {
        assert.match(
          source,
          new RegExp(`<${island}\\b[^>]*${reactClientDirective}`),
          `${route} should still mount ${island} while the inventory marks it retained React`,
        );
        return;
      }

      assert.doesNotMatch(
        source,
        new RegExp(`<${island}\\b[^>]*${reactClientDirective}`),
        `${route} should not mount a whole-route React island once marked Astro-native`,
      );
    }),
  );
});

test("Astro-native body migration inventory records client-only blockers", async () => {
  await Promise.all(
    workspaceBodyMigrationInventory.map(
      async ({ clientOnlySignals, route, screen, stage }) => {
        const source = await readFile(path.resolve(screen), "utf8");

        for (const signal of clientOnlySignals) {
          assert.match(
            source,
            new RegExp(signal),
            `${route} should keep its inventory signal until the ${stage} blocker is migrated: ${signal}`,
          );
        }
      },
    ),
  );
});

test("Slice 1 workspace islands accept explicit server workspace props", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );

  assert.match(
    workspaceSource,
    /import type \{ AdminWorkspaceProps \} from "@\/admin\/_workspace\/admin-workspace-props"/,
    "workspace-routes.tsx should import the shared serializable workspace prop type",
  );
  assert.match(
    workspaceSource,
    /type AdminWorkspaceIslandProps = \{\s*workspace: AdminWorkspaceProps \| null;\s*\}/,
    "workspace-routes.tsx should define a common workspace prop type for retained islands",
  );
});

test("Task 1 workspace islands consume serialized route access globally", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    workspaceSource,
    /resolveAdminWorkspaceRouteAccess/,
    "workspace islands should consume serialized workspace.routeAccess instead of re-deriving route access in React",
  );

  for (const islandName of workspaceIslands) {
    const islandSource =
      workspaceSource.match(
        new RegExp(
          `export function ${islandName}\\([\\s\\S]*?\\nexport function |export function ${islandName}\\([\\s\\S]*?$`,
        ),
      )?.[0] ?? "";

    assert.match(
      islandSource,
      /const routeAccess = workspace\?\.routeAccess;/,
      `${islandName} should consume serialized route access from workspace props`,
    );
  }
});

test("Slice 1 workspace resolver returns serializable workspace data on successful shell results", async () => {
  const resolverSource = await readFile(workspaceResolverPath, "utf8");

  assert.match(
    resolverSource,
    /createAdminWorkspaceProps/,
    "resolveWorkspacePage should build workspace props through the shared pure helper",
  );
  assert.match(
    resolverSource,
    /workspace:\s*createAdminWorkspaceProps\(/,
    "successful resolveWorkspacePage shell results should include workspace props",
  );
});

test("Task 2 account and media state use route-scoped hooks", async () => {
  const accountSource = await readFile(userAccountSourcePath, "utf8");
  const mediaSource = await readFile(mediaLibrarySourcePath, "utf8");

  assert.doesNotMatch(
    accountSource,
    /useAdminWorkspace(?:RouteAccess)?/,
    "user-account.tsx should not import the old admin workspace context hooks",
  );
  assert.match(
    accountSource,
    /useAdminAccountState/,
    "user-account.tsx should import the route-scoped account state hook",
  );
  assert.doesNotMatch(
    mediaSource,
    /useAdminWorkspace(?:RouteAccess)?/,
    "media-library.tsx should not import the old admin workspace context hooks",
  );
  assert.match(
    mediaSource,
    /useAdminMediaState/,
    "media-library.tsx should import the route-scoped media state hook",
  );
});

test("Task 3 team and settings state use route-scoped hooks", async () => {
  const teamSource = await readFile(teamAndRolesSourcePath, "utf8");
  const settingsSource = await readFile(settingsApiKeysSourcePath, "utf8");

  assert.doesNotMatch(
    teamSource,
    /useAdminWorkspace(?:RouteAccess)?/,
    "team-and-roles.tsx should not import the old admin workspace context hooks",
  );
  assert.match(
    teamSource,
    /useAdminRolesState/,
    "team-and-roles.tsx should import the route-scoped role state hook",
  );
  assert.match(
    teamSource,
    /useAdminTeamState/,
    "team-and-roles.tsx should import the route-scoped team state hook",
  );
  assert.doesNotMatch(
    settingsSource,
    /useAdminWorkspace(?:RouteAccess)?/,
    "settings-api-keys.tsx should not import the old admin workspace context hooks",
  );
  assert.match(
    settingsSource,
    /useAdminApiKeysState/,
    "settings-api-keys.tsx should import the route-scoped API key state hook",
  );
  assert.match(
    settingsSource,
    /useAdminRolesState/,
    "settings-api-keys.tsx should import the shared route-scoped role state hook",
  );
});

test("Task 4 content index renders from explicit server route data", async () => {
  const contentBodySource = await readFile(contentIndexSourcePath, "utf8");

  assert.doesNotMatch(
    contentBodySource,
    /useAdminWorkspace(?:RouteAccess)?|useAdminCollectionsState/,
    "ContentIndexRouteBody should not import old workspace context hooks or client collection state",
  );
  assert.match(
    contentBodySource,
    /recordRows: ContentIndexRecordRow\[\]/,
    "ContentIndexRouteBody should receive server-loaded content rows as explicit props",
  );
});

test("Task 5 editor dashboard and command palette use route-scoped state", async () => {
  const schemaBuilderSource = await readFile(schemaBuilderSourcePath, "utf8");
  const contentEditorSource = await readFile(contentEditorSourcePath, "utf8");
  const adminHomeSource = await readFile(adminHomeSourcePath, "utf8");
  const adminCommandPaletteSource = await readFile(
    adminCommandPaletteSourcePath,
    "utf8",
  );

  for (const [label, source] of [
    ["schema-builder.tsx", schemaBuilderSource],
    ["content-editor.tsx", contentEditorSource],
    ["admin-home.tsx", adminHomeSource],
    ["admin-command-palette.tsx", adminCommandPaletteSource],
  ] as const) {
    assert.doesNotMatch(
      source,
      /useAdminWorkspace(?:RouteAccess)?/,
      `${label} should not import the old admin workspace context hooks`,
    );
  }

  assert.match(
    schemaBuilderSource,
    /useAdminCollectionsState/,
    "schema-builder.tsx should import the route-scoped collection state hook",
  );
  assert.match(
    contentEditorSource,
    /useAdminCollectionsState/,
    "content-editor.tsx should import the route-scoped collection state hook",
  );
  assert.match(
    contentEditorSource,
    /useAdminRecordsState/,
    "content-editor.tsx should import the route-scoped record state hook",
  );
  assert.match(
    adminHomeSource,
    /useAdminDashboardData/,
    "admin-home.tsx should import the route-scoped dashboard data hook",
  );
  assert.match(
    adminCommandPaletteSource,
    /createAdminCommandPaletteItems/,
    "admin-command-palette.tsx should assemble items from explicit command-palette data",
  );
});

test("Task 6 admin source tree has no workspace provider context", async () => {
  const sourceFiles = (
    await Promise.all(noProviderSourceRoots.map(collectSourceFiles))
  ).flat();

  assert.ok(sourceFiles.length > 0, "admin provider source scan should find files");

  await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      const source = await readFile(sourceFile, "utf8");

      for (const forbiddenSymbol of noProviderForbiddenSymbols) {
        assert.doesNotMatch(
          source,
          new RegExp(`\\b${forbiddenSymbol}\\b`),
          `${path.relative(process.cwd(), sourceFile)} should not reference ${forbiddenSymbol}`,
        );
      }
    }),
  );
});

test("Cleanup admin source avoids deprecated event and unused loading hint patterns", async () => {
  await Promise.all(
    adminTypecheckHintSourcePaths.map(async (sourcePath) => {
      const source = await readFile(path.resolve(sourcePath), "utf8");

      assert.doesNotMatch(
        source,
        /\bkeyCode\b/,
        `${sourcePath} should not read deprecated KeyboardEvent.keyCode`,
      );
      assert.doesNotMatch(
        source,
        /(?:React\.)?FormEvent\b/,
        `${sourcePath} should not use React's deprecated FormEvent alias`,
      );
    }),
  );

  const adminHomeSource = await readFile(adminHomeSourcePath, "utf8");
  const formatMetricValueSource =
    adminHomeSource.match(/function formatMetricValue\([\s\S]*?\n\}/)?.[0] ??
    "";

  assert.doesNotMatch(
    formatMetricValueSource,
    /\bisLoading\b/,
    "formatMetricValue should not keep an unused isLoading option",
  );
});

test("Slice 2 media island forwards explicit route access to the retained body", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const mediaSource = await readFile(mediaLibrarySourcePath, "utf8");

  assert.match(
    workspaceSource,
    /<MediaBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "MediaIsland should pass explicit workspace and route access into the retained media body",
  );
  assert.match(
    bodySource,
    /<MediaLibraryRoute\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "MediaBody should forward workspace and route access into the retained media route",
  );
  assert.match(
    mediaSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "MediaLibraryContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    mediaSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "MediaLibraryContent should not derive media route access from AdminWorkspaceProvider",
  );
});

test("Slice 11 media body requires explicit route access from the server workspace prop", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    workspaceSource,
    /<MediaBody\s*\/>/,
    "MediaIsland should not render MediaBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function MediaBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "MediaBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<MediaLibraryRoute\s*\/>/,
    "MediaBody should not rely on the media route provider fallback",
  );
});

test("Slice 19 media island consumes serialized workspace route access", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const workspacePropsSource = await readFile(workspacePropsSourcePath, "utf8");
  const mediaIslandSource =
    workspaceSource.match(
      /export function MediaIsland\([\s\S]*?\nexport function TeamIsland/,
    )?.[0] ?? "";

  assert.match(
    workspacePropsSource,
    /routeAccess: AdminWorkspaceRouteAccessState;/,
    "AdminWorkspaceProps should serialize the active route access decision",
  );
  assert.match(
    workspacePropsSource,
    /routeAccess:\s*resolveAdminWorkspaceRouteAccess\(input\.route,\s*permissions\)/,
    "createAdminWorkspaceProps should derive route access before serializing workspace props",
  );
  assert.match(
    mediaIslandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    "MediaIsland should consume the serialized route access decision",
  );
  assert.doesNotMatch(
    mediaIslandSource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "MediaIsland should not re-derive route access inside the retained client island",
  );
  assert.doesNotMatch(
    mediaIslandSource,
    /workspace\.(activeRoute|permissions)/,
    "MediaIsland should not read route metadata or permissions to derive access",
  );
});

test("Slice 20 team island consumes serialized workspace route access", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const teamIslandSource =
    workspaceSource.match(
      /export function TeamIsland\([\s\S]*?\nexport function SettingsIsland/,
    )?.[0] ?? "";

  assert.match(
    teamIslandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    "TeamIsland should consume the serialized route access decision",
  );
  assert.doesNotMatch(
    teamIslandSource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "TeamIsland should not re-derive route access inside the retained client island",
  );
  assert.doesNotMatch(
    teamIslandSource,
    /workspace\.(activeRoute|permissions)/,
    "TeamIsland should not read route metadata or permissions to derive access",
  );
});

test("Slice 12 team body requires explicit route access from the server workspace prop", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    workspaceSource,
    /<TeamBody\s*\/>/,
    "TeamIsland should not render TeamBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function TeamBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "TeamBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<TeamAndRolesRoute\s*\/>/,
    "TeamBody should not rely on the team route provider fallback",
  );
});

test("Slice 13 settings body requires explicit route access from the server workspace prop", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    workspaceSource,
    /<SettingsBody\s*\/>/,
    "SettingsIsland should not render SettingsBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function SettingsBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "SettingsBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<SettingsApiKeysRoute\s*\/>/,
    "SettingsBody should not rely on the settings route provider fallback",
  );
});

test("Slice 14 account Astro body requires explicit route access from the server workspace prop", async () => {
  const accountPageSource = await readFile(
    path.join(pagesAdminDirectory, "account.astro"),
    "utf8",
  );
  const accountBodySource = await readFile(accountRouteBodySourcePath, "utf8");
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );

  assert.match(
    accountPageSource,
    /<AccountRouteBody\s+routeAccess=\{page\.workspace\.routeAccess\}\s+workspace=\{page\.workspace\}\s*\/>/,
    "account.astro should pass explicit server-derived route access into the Astro account body",
  );
  assert.match(
    accountBodySource,
    /type Props = \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}/,
    "AccountRouteBody should require explicit workspace and route access",
  );
  assert.match(
    accountBodySource,
    /routeAccess\.isAllowed/,
    "AccountRouteBody should branch on the serialized route access decision",
  );
  assert.doesNotMatch(
    workspaceSource,
    /AccountIsland|AccountBody/,
    "Retained workspace islands should no longer include the Astro-native account route body",
  );
  assert.doesNotMatch(
    bodySource,
    /AccountBody|UserAccountRoute/,
    "Retained workspace body routes should no longer include the Astro-native account route body",
  );
});

test("Slice 15 admin home body requires explicit route access from the server workspace prop", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );

  assert.doesNotMatch(
    workspaceSource,
    /<AdminHomeBody\s*\/>/,
    "AdminHomeIsland should not render AdminHomeBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function AdminHomeBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "AdminHomeBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<AdminHomeRoute\s*\/>/,
    "AdminHomeBody should not rely on the admin home route provider fallback",
  );
});

test("Slice 16 schema builder bodies require explicit route access from the server workspace prop", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const schemaBuilderSource = await readFile(schemaBuilderSourcePath, "utf8");

  assert.doesNotMatch(
    workspaceSource,
    /<NewSchemaBody\s*\/>/,
    "NewSchemaIsland should not render NewSchemaBody without server-derived route access",
  );
  assert.doesNotMatch(
    workspaceSource,
    /<SchemaDetailBody\s+schemaId=\{schemaId\}\s*\/>/,
    "SchemaDetailIsland should not render SchemaDetailBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function NewSchemaBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "NewSchemaBody should require explicit workspace and route access",
  );
  assert.match(
    bodySource,
    /export function SchemaDetailBody\(\{\s*routeAccess,\s*schemaId,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*schemaId: string;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "SchemaDetailBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<SchemaBuilderRoute\s+mode="create"\s*\/>/,
    "NewSchemaBody should not rely on the schema builder route provider fallback",
  );
  assert.doesNotMatch(
    bodySource,
    /<SchemaBuilderRoute\s+mode="edit"\s+schemaId=\{schemaId\}\s*\/>/,
    "SchemaDetailBody should not rely on the schema builder route provider fallback",
  );
  assert.doesNotMatch(
    schemaBuilderSource,
    /SchemaBuilderRouteWithProviderAccess/,
    "SchemaBuilderRoute should not keep a provider fallback after editor state migration",
  );
});

test("Slice 17 content index renders as an Astro-native body with server data", async () => {
  const contentPageSource = await readFile(
    path.join(pagesAdminDirectory, "content/index.astro"),
    "utf8",
  );
  const contentBodySource = await readFile(contentIndexSourcePath, "utf8");
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );

  assert.match(
    contentPageSource,
    /import ContentIndexRouteBody from "@\/components\/admin\/ContentIndexRouteBody\.astro"/,
    "content/index.astro should render through the Astro-native content index body",
  );
  assert.match(
    contentPageSource,
    /resolveContentIndexPage\(Astro\.request\)/,
    "content/index.astro should use the route-specific content index resolver",
  );
  assert.match(
    contentPageSource,
    /<ContentIndexRouteBody\s+collectionLoadError=\{page\.contentIndex\.collectionLoadError\}\s+collections=\{page\.contentIndex\.collections\}\s+recordLoadError=\{page\.contentIndex\.recordLoadError\}\s+recordRows=\{page\.contentIndex\.recordRows\}\s+routeAccess=\{page\.workspace\.routeAccess\}\s+workspace=\{page\.workspace\}\s*\/>/,
    "content/index.astro should pass server-loaded content data and serialized route access into the Astro body",
  );
  assert.match(
    contentBodySource,
    /type Props = \{\s*collectionLoadError: string \| null;\s*collections: StoredCollectionDefinition\[\];\s*recordLoadError: string \| null;\s*recordRows: ContentIndexRecordRow\[\];\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}/,
    "ContentIndexRouteBody should require explicit server data, workspace, and route access",
  );
  assert.match(
    contentBodySource,
    /AdminWorkspaceCommandPalette[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
    "ContentIndexRouteBody should keep the command palette as a targeted client island",
  );
  assert.match(
    contentBodySource,
    /routeAccess\.isAllowed/,
    "ContentIndexRouteBody should branch on the serialized route access decision",
  );
  assert.doesNotMatch(
    contentBodySource,
    /useAdminCollectionsState|loadCollections|useDelayedLoadingIndicator|AdminTableSkeleton/,
    "ContentIndexRouteBody should not keep client collection loading state or initial-load skeletons",
  );
  assert.doesNotMatch(
    workspaceSource,
    /ContentIndexIsland|ContentIndexBody/,
    "Retained workspace islands should no longer include the Astro-native content index route body",
  );
  assert.doesNotMatch(
    bodySource,
    /ContentIndexBody|ContentIndexRoute/,
    "Retained workspace body routes should no longer include the Astro-native content index route body",
  );
});

test("Slice 18 content editor bodies require explicit route access from the server workspace prop", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const contentEditorSource = await readFile(contentEditorSourcePath, "utf8");

  assert.doesNotMatch(
    workspaceSource,
    /<NewContentBody\s*\/>/,
    "NewContentIsland should not render NewContentBody without server-derived route access",
  );
  assert.doesNotMatch(
    workspaceSource,
    /<ContentRecordBody\s+recordId=\{recordId\}\s+schemaId=\{schemaId\}\s*\/>/,
    "ContentRecordIsland should not render ContentRecordBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function NewContentBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "NewContentBody should require explicit workspace and route access",
  );
  assert.match(
    bodySource,
    /export function ContentRecordBody\(\{\s*recordId,\s*routeAccess,\s*schemaId,\s*workspace,\s*\}: \{\s*recordId: string;\s*routeAccess: AdminWorkspaceRouteAccessState;\s*schemaId: string;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "ContentRecordBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<ContentEditorRoute\s+mode="create"\s*\/>/,
    "NewContentBody should not rely on the content editor route provider fallback",
  );
  assert.doesNotMatch(
    bodySource,
    /<ContentEditorRoute\s+mode="edit"\s+recordId=\{recordId\}\s+schemaId=\{schemaId\}\s*\/>/,
    "ContentRecordBody should not rely on the content editor route provider fallback",
  );
  assert.doesNotMatch(
    contentEditorSource,
    /ContentEditorRouteWithProviderAccess/,
    "ContentEditorRoute should not keep a provider fallback after editor state migration",
  );
});

test("Slice 3 team island forwards explicit route access to the retained body", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const teamSource = await readFile(teamAndRolesSourcePath, "utf8");
  const teamIslandSource =
    workspaceSource.match(
      /export function TeamIsland\([\s\S]*?\nexport function SettingsIsland/,
    )?.[0] ?? "";

  assert.match(
    teamIslandSource,
    /<TeamBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "TeamIsland should pass explicit workspace and route access into the retained team body",
  );
  assert.match(
    bodySource,
    /<TeamAndRolesRoute\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "TeamBody should forward workspace and route access into the retained team route",
  );
  assert.match(
    teamSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "TeamAndRolesContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    teamSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "TeamAndRolesContent should not derive team route access from AdminWorkspaceProvider",
  );
});

test("Slice 4 settings island forwards explicit route access to the retained body", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const settingsSource = await readFile(settingsApiKeysSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /<SettingsBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "SettingsIsland should pass explicit workspace and route access into the retained settings body",
  );
  assert.match(
    bodySource,
    /<SettingsApiKeysRoute\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "SettingsBody should forward workspace and route access into the retained settings route",
  );
  assert.match(
    settingsSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "SettingsApiKeysContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    settingsSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "SettingsApiKeysContent should not derive settings route access from AdminWorkspaceProvider",
  );
});

test("Slice 21 settings island consumes serialized workspace route access", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const settingsIslandSource =
    workspaceSource.match(
      /export function SettingsIsland\([\s\S]*?\n\}/,
    )?.[0] ?? "";

  assert.match(
    settingsIslandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    "SettingsIsland should consume the serialized route access decision",
  );
  assert.doesNotMatch(
    settingsIslandSource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "SettingsIsland should not re-derive route access inside the retained client island",
  );
  assert.doesNotMatch(
    settingsIslandSource,
    /workspace\.(activeRoute|permissions)/,
    "SettingsIsland should not read route metadata or permissions to derive access",
  );
});

test("Slice 5 account Astro body mounts targeted client islands only where needed", async () => {
  const accountPageSource = await readFile(
    path.join(pagesAdminDirectory, "account.astro"),
    "utf8",
  );
  const accountBodySource = await readFile(accountRouteBodySourcePath, "utf8");
  const accountSource = await readFile(userAccountSourcePath, "utf8");

  assert.match(
    accountPageSource,
    /import AccountRouteBody from "@\/components\/admin\/AccountRouteBody\.astro"/,
    "account.astro should render through the Astro-native account body",
  );
  assert.match(
    accountBodySource,
    /AdminWorkspaceCommandPalette[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
    "AccountRouteBody should keep the command palette as a targeted client island",
  );
  assert.match(
    accountBodySource,
    /<AccountSignOutButton\s+client:only="react"\s*\/>/,
    "AccountRouteBody should keep sign-out behavior in a small client island",
  );
  assert.match(
    accountBodySource,
    /<AccountProfileSettingsIsland\s+client:only="react"\s+workspace=\{workspace\}\s*\/>/,
    "AccountRouteBody should keep profile form state in a targeted client island",
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
    /AdminPageHeader|routeAccess: AdminWorkspaceRouteAccessState/,
    "user-account.tsx should no longer own the account route header or access branch",
  );
  assert.doesNotMatch(
    accountSource,
    /UserAccountRoute|AccountContent/,
    "user-account.tsx should not keep the deleted whole-route account body",
  );
});

test("Slice 22 account Astro body consumes serialized workspace route access", async () => {
  const accountPageSource = await readFile(
    path.join(pagesAdminDirectory, "account.astro"),
    "utf8",
  );
  const accountBodySource = await readFile(accountRouteBodySourcePath, "utf8");

  assert.match(
    accountPageSource,
    /page\.workspace\s*\?\s*\([\s\S]*<AccountRouteBody\s+routeAccess=\{page\.workspace\.routeAccess\}\s+workspace=\{page\.workspace\}\s*\/>[\s\S]*\)\s*:\s*null/,
    "account.astro should read the serialized route access decision from page.workspace",
  );
  assert.doesNotMatch(
    accountBodySource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "AccountRouteBody should not re-derive route access inside the route body",
  );
  assert.doesNotMatch(
    accountBodySource,
    /workspace\.(activeRoute|permissions)/,
    "AccountRouteBody should not read route metadata or permissions to derive access",
  );
});

test("Slice 6 schema overview renders as an Astro-native body with server data", async () => {
  const schemaPageSource = await readFile(
    path.join(pagesAdminDirectory, "schema/index.astro"),
    "utf8",
  );
  const schemaBodySource = await readFile(schemaOverviewRouteBodySourcePath, "utf8");
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );

  assert.match(
    schemaPageSource,
    /import SchemaOverviewRouteBody from "@\/components\/admin\/SchemaOverviewRouteBody\.astro"/,
    "schema/index.astro should render through the Astro-native schema overview body",
  );
  assert.match(
    schemaPageSource,
    /resolveSchemaOverviewPage\(Astro\.request\)/,
    "schema/index.astro should use the route-specific schema overview resolver",
  );
  assert.match(
    schemaPageSource,
    /<SchemaOverviewRouteBody\s+collections=\{page\.schemaOverview\.collections\}\s+collectionLoadError=\{page\.schemaOverview\.collectionLoadError\}\s+routeAccess=\{page\.workspace\.routeAccess\}\s+workspace=\{page\.workspace\}\s*\/>/,
    "schema/index.astro should pass server-loaded schema data and serialized route access into the Astro body",
  );
  assert.match(
    schemaBodySource,
    /type Props = \{\s*collectionLoadError: string \| null;\s*collections: StoredCollectionDefinition\[\];\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}/,
    "SchemaOverviewRouteBody should require explicit server data, workspace, and route access",
  );
  assert.match(
    schemaBodySource,
    /AdminWorkspaceCommandPalette[^>]*client:only="react"[^>]*workspace=\{workspace\}/,
    "SchemaOverviewRouteBody should keep the command palette as a targeted client island",
  );
  assert.match(
    schemaBodySource,
    /routeAccess\.isAllowed/,
    "SchemaOverviewRouteBody should branch on the serialized route access decision",
  );
  assert.doesNotMatch(
    schemaBodySource,
    /useAdminCollectionsState|loadCollections|useDelayedLoadingIndicator/,
    "SchemaOverviewRouteBody should not keep client collection loading state",
  );
  assert.doesNotMatch(
    workspaceSource,
    /SchemaOverviewIsland|SchemaOverviewBody/,
    "Retained workspace islands should no longer include the Astro-native schema overview route body",
  );
  assert.doesNotMatch(
    bodySource,
    /SchemaOverviewBody|SchemaOverviewRoute/,
    "Retained workspace body routes should no longer include the Astro-native schema overview route body",
  );
});

test("Slice 23 schema overview resolver mirrors collection read permission before server loading", async () => {
  const resolverSource = await readFile(schemaOverviewPageResolverPath, "utf8");

  assert.match(
    resolverSource,
    /resolveWorkspacePage\(request,\s*route\)/,
    "Schema overview resolver should reuse the shared workspace page resolver",
  );
  assert.match(
    resolverSource,
    /workspace\.permissions\.canViewCollections/,
    "Schema overview resolver should check serialized collection read permission before loading data",
  );
  assert.match(
    resolverSource,
    /listCollectionDefinitions\(env\)/,
    "Schema overview resolver should load collection definitions server-side",
  );
  assert.match(
    resolverSource,
    /CollectionSchemaError/,
    "Schema overview resolver should preserve collection schema errors as route data",
  );
  assert.doesNotMatch(
    resolverSource,
    /\bfetch\(/,
    "Schema overview resolver should use server services rather than calling the admin API over fetch",
  );
});

test("Slice 23 content index resolver preserves collection and record permission boundaries", async () => {
  const resolverSource = await readFile(contentIndexPageResolverPath, "utf8");

  assert.match(
    resolverSource,
    /resolveWorkspacePage\(request,\s*route\)/,
    "Content index resolver should reuse the shared workspace page resolver",
  );
  assert.match(
    resolverSource,
    /workspace\.permissions\.canViewCollections/,
    "Content index resolver should check serialized collection read permission before loading schemas",
  );
  assert.match(
    resolverSource,
    /workspace\.permissions\.canViewRecords/,
    "Content index resolver should check serialized record read permission before loading records",
  );
  assert.match(
    resolverSource,
    /listCollectionDefinitions\(env\)/,
    "Content index resolver should load collection definitions server-side",
  );
  assert.match(
    resolverSource,
    /listCollectionRecords\(env,\s*collection\.definition\.name\)/,
    "Content index resolver should load records server-side for each collection by API name",
  );
  assert.match(
    resolverSource,
    /CollectionSchemaError/,
    "Content index resolver should preserve collection schema errors as route data",
  );
  assert.match(
    resolverSource,
    /CollectionRecordError/,
    "Content index resolver should preserve collection record errors as route data",
  );
  assert.match(
    resolverSource,
    /Promise\.all\(\s*collections\.map/,
    "Content index resolver should load records across all collections without serializing each query",
  );
  assert.match(
    resolverSource,
    /failedLoads\.length > 0\s*\?\s*`\$\{failedLoads\.length\} schema/,
    "Content index resolver should summarize partial record-load failures without dropping successful rows",
  );
  assert.match(
    resolverSource,
    /new Date\(right\.record\.updatedAt\)\.getTime\(\)\s*-\s*new Date\(left\.record\.updatedAt\)\.getTime\(\)/,
    "Content index resolver should sort the combined content rows by newest updated record first",
  );
  assert.doesNotMatch(
    resolverSource,
    /\bfetch\(/,
    "Content index resolver should use server services rather than calling the admin API over fetch",
  );
});

test("Slice 24 schema builder islands consume serialized workspace route access", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const schemaBuilderSource = await readFile(schemaBuilderSourcePath, "utf8");
  const newSchemaIslandSource =
    workspaceSource.match(
      /export function NewSchemaIsland\([\s\S]*?\nexport function SchemaDetailIsland/,
    )?.[0] ?? "";
  const schemaDetailIslandSource =
    workspaceSource.match(
      /export function SchemaDetailIsland\([\s\S]*?\nexport function NewContentIsland/,
    )?.[0] ?? "";

  assert.match(
    newSchemaIslandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    "NewSchemaIsland should consume the serialized route access decision",
  );
  assert.doesNotMatch(
    newSchemaIslandSource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "NewSchemaIsland should not re-derive route access inside the retained client island",
  );
  assert.doesNotMatch(
    newSchemaIslandSource,
    /workspace\.(activeRoute|permissions)/,
    "NewSchemaIsland should not read route metadata or permissions to derive access",
  );
  assert.match(
    schemaDetailIslandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    "SchemaDetailIsland should consume the serialized route access decision",
  );
  assert.doesNotMatch(
    schemaDetailIslandSource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "SchemaDetailIsland should not re-derive route access inside the retained client island",
  );
  assert.doesNotMatch(
    schemaDetailIslandSource,
    /workspace\.(activeRoute|permissions)/,
    "SchemaDetailIsland should not read route metadata or permissions to derive access",
  );
  assert.match(
    newSchemaIslandSource,
    /<NewSchemaBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "NewSchemaIsland should pass explicit workspace and route access into the retained schema builder body",
  );
  assert.match(
    schemaDetailIslandSource,
    /<SchemaDetailBody\s+routeAccess=\{routeAccess\}\s+schemaId=\{schemaId\}\s+workspace=\{workspace\}\s*\/>/,
    "SchemaDetailIsland should pass explicit workspace and route access into the retained schema builder body",
  );
  assert.match(
    bodySource,
    /<SchemaBuilderRoute\s+mode="create"\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "NewSchemaBody should forward workspace and route access into the retained schema builder route",
  );
  assert.match(
    bodySource,
    /<SchemaBuilderRoute\s+mode="edit"\s+routeAccess=\{routeAccess\}\s+schemaId=\{schemaId\}\s+workspace=\{workspace\}\s*\/>/,
    "SchemaDetailBody should forward workspace and route access into the retained schema builder route",
  );
  assert.match(
    schemaBuilderSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "SchemaBuilderContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    schemaBuilderSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "SchemaBuilderContent should not derive schema builder route access from AdminWorkspaceProvider",
  );
});

test("Slice 9 content editor islands consume serialized route access from server workspace props", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const contentEditorSource = await readFile(contentEditorSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /export function NewContentIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?const routeAccess = workspace\?\.routeAccess;[\s\S]*?<NewContentBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>[\s\S]*?\}/,
    "NewContentIsland should consume serialized route access from the server workspace prop",
  );
  assert.match(
    workspaceSource,
    /export function ContentRecordIsland\(\{[\s\S]*?workspace[\s\S]*?\}: AdminWorkspaceIslandProps & \{[\s\S]*?recordId: string;[\s\S]*?schemaId: string;[\s\S]*?\}\) \{[\s\S]*?const routeAccess = workspace\?\.routeAccess;[\s\S]*?<ContentRecordBody\s+routeAccess=\{routeAccess\}\s+recordId=\{recordId\}\s+schemaId=\{schemaId\}\s+workspace=\{workspace\}\s*\/>[\s\S]*?\}/,
    "ContentRecordIsland should consume serialized route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<ContentEditorRoute\s+mode="create"\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "NewContentBody should forward workspace and route access into the retained content editor route",
  );
  assert.match(
    bodySource,
    /<ContentEditorRoute\s+mode="edit"\s+recordId=\{recordId\}\s+routeAccess=\{routeAccess\}\s+schemaId=\{schemaId\}\s+workspace=\{workspace\}\s*\/>/,
    "ContentRecordBody should forward workspace and route access into the retained content editor route",
  );
  assert.match(
    contentEditorSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "ContentEditorContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    contentEditorSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "ContentEditorContent should not derive content editor route access from AdminWorkspaceProvider",
  );
});

test("Slice 10 admin home island consumes serialized route access from server workspace props", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const adminHomeSource = await readFile(adminHomeSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /export function AdminHomeIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?const routeAccess = workspace\?\.routeAccess;[\s\S]*?<AdminHomeBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>[\s\S]*?\}/,
    "AdminHomeIsland should consume serialized route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<AdminHomeRoute\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "AdminHomeBody should forward workspace and route access into the retained admin home route",
  );
  assert.match(
    adminHomeSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "AdminHomeContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    adminHomeSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "AdminHomeContent should not derive dashboard route access from AdminWorkspaceProvider",
  );
});

test("Slice 2 Astro admin auth pages render as Astro templates", async () => {
  await Promise.all(
    authPageRoutes.map(async (route) => {
      const source = await readFile(path.join(pagesAdminDirectory, route), "utf8");

      assert.doesNotMatch(
        source,
        new RegExp(reactClientDirective),
        `${route} should not mount a React client-only island`,
      );
      assert.doesNotMatch(
        source,
        /auth-routes/,
        `${route} should not import the temporary auth route bridge`,
      );
      assert.match(
        source,
        /AuthCard/,
        `${route} should use the shared Astro auth card template`,
      );
      assert.match(
        source,
        /data-auth-page=/,
        `${route} should expose a stable auth page hook for its DOM script`,
      );
      assert.match(
        source,
        /DatamixRootLayout/,
        `${route} should use the shared Astro root layout`,
      );
    }),
  );
});

test("Slice 2 React workspace island wrappers export every planned workspace island", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );

  for (const island of workspaceIslands) {
    assert.match(
      workspaceSource,
      new RegExp(`export\\s+function\\s+${island}\\b`),
      `workspace-routes.tsx should export ${island}`,
    );
  }
});

test("Slice 3 retained React workspace screens do not render the workspace shell", async () => {
  await Promise.all(
    workspaceScreenPaths.map(async (screenPath) => {
      const source = await readFile(path.resolve(screenPath), "utf8");

      assert.doesNotMatch(
        source,
        /AdminWorkspaceRouteFrame|AdminFrame/,
        `${screenPath} should not render the workspace shell from React`,
      );
    }),
  );
});

test("Slice 2 retained React components no longer import Next Link", async () => {
  await Promise.all(
    workspaceScreenPaths.map(async (componentPath) => {
      const source = await readFile(path.resolve(componentPath), "utf8");

      assert.doesNotMatch(
        source,
        /from ["']next\/link["']/,
        `${componentPath} should not import Next Link`,
      );
      assert.doesNotMatch(
        source,
        /<Link\b/,
        `${componentPath} should use plain anchors for retained navigation`,
      );
    }),
  );
});
