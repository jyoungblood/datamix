import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type WorkspacePageExpectation = {
  island: string;
  route: string;
};

const workspacePageExpectations: WorkspacePageExpectation[] = [
  { island: "AdminHomeIsland", route: "index.astro" },
  { island: "SchemaOverviewIsland", route: "schema/index.astro" },
  { island: "NewSchemaIsland", route: "schema/new.astro" },
  { island: "SchemaDetailIsland", route: "schema/[schemaId].astro" },
  { island: "ContentIndexIsland", route: "content/index.astro" },
  { island: "NewContentIsland", route: "content/new.astro" },
  {
    island: "ContentRecordIsland",
    route: "content/[schemaId]/[recordId].astro",
  },
  { island: "MediaIsland", route: "media.astro" },
  { island: "TeamIsland", route: "team.astro" },
  { island: "SettingsIsland", route: "settings.astro" },
  { island: "AccountIsland", route: "account.astro" },
];

const workspaceIslands = [
  "AdminHomeIsland",
  "SchemaOverviewIsland",
  "NewSchemaIsland",
  "SchemaDetailIsland",
  "ContentIndexIsland",
  "NewContentIsland",
  "ContentRecordIsland",
  "MediaIsland",
  "TeamIsland",
  "SettingsIsland",
  "AccountIsland",
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
  "apps/web/src/admin/_screens/schema-overview.tsx",
  "apps/web/src/admin/_screens/schema-builder.tsx",
  "apps/web/src/admin/_screens/content-index.tsx",
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
const adminWorkspaceProviderSourcePath = path.resolve(
  "apps/web/src/admin/_workspace/admin-workspace-provider.tsx",
);
const mediaLibrarySourcePath = path.resolve(
  "apps/web/src/admin/_screens/media-library.tsx",
);
const adminHomeSourcePath = path.resolve(
  "apps/web/src/admin/_screens/admin-home.tsx",
);
const schemaOverviewSourcePath = path.resolve(
  "apps/web/src/admin/_screens/schema-overview.tsx",
);
const schemaBuilderSourcePath = path.resolve(
  "apps/web/src/admin/_screens/schema-builder.tsx",
);
const contentIndexSourcePath = path.resolve(
  "apps/web/src/admin/_screens/content-index.tsx",
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
  const providerSource = await readFile(adminWorkspaceProviderSourcePath, "utf8");
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
  assert.match(
    providerSource,
    /useAdminAccountState/,
    "AdminWorkspaceProvider should compose the route-scoped account state hook during migration",
  );
  assert.match(
    providerSource,
    /useAdminMediaState/,
    "AdminWorkspaceProvider should compose the route-scoped media state hook during migration",
  );
  assert.match(
    providerSource,
    /\.\.\.accountState/,
    "AdminWorkspaceProvider should spread account state into the compatibility context",
  );
  assert.match(
    providerSource,
    /\.\.\.mediaState/,
    "AdminWorkspaceProvider should spread media state into the compatibility context",
  );
});

test("Task 3 team and settings state use route-scoped hooks", async () => {
  const providerSource = await readFile(adminWorkspaceProviderSourcePath, "utf8");
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
  assert.match(
    providerSource,
    /useAdminRolesState/,
    "AdminWorkspaceProvider should compose role state during migration",
  );
  assert.match(
    providerSource,
    /useAdminTeamState/,
    "AdminWorkspaceProvider should compose team state during migration",
  );
  assert.match(
    providerSource,
    /useAdminApiKeysState/,
    "AdminWorkspaceProvider should compose API key state during migration",
  );
  assert.match(
    providerSource,
    /\.\.\.rolesState/,
    "AdminWorkspaceProvider should spread role state into the compatibility context",
  );
  assert.match(
    providerSource,
    /\.\.\.teamState/,
    "AdminWorkspaceProvider should spread team state into the compatibility context",
  );
  assert.match(
    providerSource,
    /\.\.\.apiKeysState/,
    "AdminWorkspaceProvider should spread API key state into the compatibility context",
  );
});

test("Task 4 schema overview and content index use route-scoped collection state", async () => {
  const providerSource = await readFile(adminWorkspaceProviderSourcePath, "utf8");
  const schemaOverviewSource = await readFile(schemaOverviewSourcePath, "utf8");
  const contentIndexSource = await readFile(contentIndexSourcePath, "utf8");

  assert.doesNotMatch(
    schemaOverviewSource,
    /useAdminWorkspace(?:RouteAccess)?/,
    "schema-overview.tsx should not import the old admin workspace context hooks",
  );
  assert.match(
    schemaOverviewSource,
    /useAdminCollectionsState/,
    "schema-overview.tsx should import the route-scoped collection state hook",
  );
  assert.doesNotMatch(
    contentIndexSource,
    /useAdminWorkspace(?:RouteAccess)?/,
    "content-index.tsx should not import the old admin workspace context hooks",
  );
  assert.match(
    contentIndexSource,
    /useAdminCollectionsState/,
    "content-index.tsx should import the route-scoped collection state hook",
  );
  assert.match(
    providerSource,
    /useAdminCollectionsState/,
    "AdminWorkspaceProvider should compose collection state during migration",
  );
  assert.match(
    providerSource,
    /\.\.\.collectionsState/,
    "AdminWorkspaceProvider should spread collection state into the compatibility context",
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

test("Slice 14 account body requires explicit route access from the server workspace prop", async () => {
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
    /<AccountBody\s*\/>/,
    "AccountIsland should not render AccountBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function AccountBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "AccountBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<UserAccountRoute\s*\/>/,
    "AccountBody should not rely on the account route provider fallback",
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
    /export function AdminHomeBody\(\{\s*routeAccess,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*\}\)/,
    "AdminHomeBody should require explicit route access",
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
    /export function NewSchemaBody\(\{\s*routeAccess,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*\}\)/,
    "NewSchemaBody should require explicit route access",
  );
  assert.match(
    bodySource,
    /export function SchemaDetailBody\(\{\s*routeAccess,\s*schemaId,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*schemaId: string;\s*\}\)/,
    "SchemaDetailBody should require explicit route access",
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
  assert.match(
    schemaBuilderSource,
    /function SchemaBuilderRouteWithProviderAccess\([\s\S]*?useAdminWorkspaceRouteAccess\(route\)[\s\S]*?<SchemaBuilderContent\s+routeAccess=\{providerAccess\}/,
    "SchemaBuilderRoute should keep the provider fallback wrapper for direct production hook hits",
  );
});

test("Slice 17 content index body requires explicit route access from the server workspace prop", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const contentIndexSource = await readFile(contentIndexSourcePath, "utf8");

  assert.doesNotMatch(
    workspaceSource,
    /<ContentIndexBody\s*\/>/,
    "ContentIndexIsland should not render ContentIndexBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function ContentIndexBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "ContentIndexBody should require explicit workspace and route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<ContentIndexRoute\s*\/>/,
    "ContentIndexBody should not rely on the content index route provider fallback",
  );
  assert.doesNotMatch(
    contentIndexSource,
    /ContentIndexRouteWithProviderAccess/,
    "ContentIndexRoute should not keep a provider fallback after route-scoped collection migration",
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
    /export function NewContentBody\(\{\s*routeAccess,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*\}\)/,
    "NewContentBody should require explicit route access",
  );
  assert.match(
    bodySource,
    /export function ContentRecordBody\(\{\s*recordId,\s*routeAccess,\s*schemaId,\s*\}: \{\s*recordId: string;\s*routeAccess: AdminWorkspaceRouteAccessState;\s*schemaId: string;\s*\}\)/,
    "ContentRecordBody should require explicit route access",
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
  assert.match(
    contentEditorSource,
    /function ContentEditorRouteWithProviderAccess\([\s\S]*?useAdminWorkspaceRouteAccess\(route\)[\s\S]*?<ContentEditorContent\s+routeAccess=\{providerAccess\}/,
    "ContentEditorRoute should keep the provider fallback wrapper for direct production hook hits",
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
      /export function SettingsIsland\([\s\S]*?\nexport function AccountIsland/,
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

test("Slice 5 account island forwards explicit route access to the retained body", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const accountSource = await readFile(userAccountSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /<AccountBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "AccountIsland should pass explicit workspace and route access into the retained account body",
  );
  assert.match(
    bodySource,
    /<UserAccountRoute\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "AccountBody should forward workspace and route access into the retained account route",
  );
  assert.match(
    accountSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "AccountContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    accountSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "AccountContent should not derive account route access from AdminWorkspaceProvider",
  );
  assert.doesNotMatch(
    accountSource,
    /UserAccountRouteWithProviderAccess/,
    "UserAccountRoute should not keep an account provider fallback after route-scoped state migration",
  );
});

test("Slice 22 account island consumes serialized workspace route access", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const accountIslandSource =
    workspaceSource.match(/export function AccountIsland\([\s\S]*?\n\}/)?.[0] ??
    "";

  assert.match(
    accountIslandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    "AccountIsland should consume the serialized route access decision",
  );
  assert.doesNotMatch(
    accountIslandSource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "AccountIsland should not re-derive route access inside the retained client island",
  );
  assert.doesNotMatch(
    accountIslandSource,
    /workspace\.(activeRoute|permissions)/,
    "AccountIsland should not read route metadata or permissions to derive access",
  );
});

test("Slice 6 schema overview island forwards explicit route access to the retained body", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const schemaOverviewSource = await readFile(schemaOverviewSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /<SchemaOverviewBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "SchemaOverviewIsland should pass explicit workspace and route access into the retained schema overview body",
  );
  assert.doesNotMatch(
    workspaceSource,
    /<SchemaOverviewBody\s*\/>/,
    "SchemaOverviewIsland should not render SchemaOverviewBody without server-derived route access",
  );
  assert.match(
    bodySource,
    /export function SchemaOverviewBody\(\{\s*routeAccess,\s*workspace,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*workspace: AdminWorkspaceProps;\s*\}\)/,
    "SchemaOverviewBody should require explicit workspace and route access",
  );
  assert.match(
    bodySource,
    /<SchemaOverviewRoute\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "SchemaOverviewBody should forward workspace and route access into the retained schema overview route",
  );
  assert.doesNotMatch(
    bodySource,
    /<SchemaOverviewRoute\s*\/>/,
    "SchemaOverviewBody should not rely on the schema overview route provider fallback",
  );
  assert.match(
    schemaOverviewSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "SchemaOverviewContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    schemaOverviewSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "SchemaOverviewContent should not derive schema overview route access from AdminWorkspaceProvider",
  );
  assert.doesNotMatch(
    schemaOverviewSource,
    /SchemaOverviewRouteWithProviderAccess/,
    "SchemaOverviewRoute should not keep a provider fallback after route-scoped collection migration",
  );
});

test("Slice 23 schema overview island consumes serialized workspace route access", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const schemaOverviewIslandSource =
    workspaceSource.match(
      /export function SchemaOverviewIsland\([\s\S]*?\n\}/,
    )?.[0] ?? "";

  assert.match(
    schemaOverviewIslandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    "SchemaOverviewIsland should consume the serialized route access decision",
  );
  assert.doesNotMatch(
    schemaOverviewIslandSource,
    /resolveAdminWorkspaceRouteAccess\(/,
    "SchemaOverviewIsland should not re-derive route access inside the retained client island",
  );
  assert.doesNotMatch(
    schemaOverviewIslandSource,
    /workspace\.(activeRoute|permissions)/,
    "SchemaOverviewIsland should not read route metadata or permissions to derive access",
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
      /export function SchemaDetailIsland\([\s\S]*?\nexport function ContentIndexIsland/,
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
    /<NewSchemaBody\s+routeAccess=\{routeAccess\}\s*\/>/,
    "NewSchemaIsland should pass explicit route access into the retained schema builder body",
  );
  assert.match(
    schemaDetailIslandSource,
    /<SchemaDetailBody\s+routeAccess=\{routeAccess\}\s+schemaId=\{schemaId\}\s*\/>/,
    "SchemaDetailIsland should pass explicit route access into the retained schema builder body",
  );
  assert.match(
    bodySource,
    /<SchemaBuilderRoute\s+mode="create"\s+routeAccess=\{routeAccess\}\s*\/>/,
    "NewSchemaBody should forward route access into the retained schema builder route",
  );
  assert.match(
    bodySource,
    /<SchemaBuilderRoute\s+mode="edit"\s+routeAccess=\{routeAccess\}\s+schemaId=\{schemaId\}\s*\/>/,
    "SchemaDetailBody should forward route access into the retained schema builder route",
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

test("Slice 8 content index island consumes serialized route access from server workspace props", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const contentIndexSource = await readFile(contentIndexSourcePath, "utf8");
  const contentIndexIslandStart = workspaceSource.indexOf(
    "export function ContentIndexIsland",
  );
  const contentIndexIslandEnd = workspaceSource.indexOf(
    "export function NewContentIsland",
    contentIndexIslandStart,
  );
  const contentIndexIslandSource = workspaceSource.slice(
    contentIndexIslandStart,
    contentIndexIslandEnd,
  );

  assert.match(
    contentIndexIslandSource,
    /export function ContentIndexIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?const routeAccess = workspace\?\.routeAccess;[\s\S]*?<ContentIndexBody\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>[\s\S]*?\}/,
    "ContentIndexIsland should consume serialized route access from the server workspace prop",
  );
  assert.doesNotMatch(
    contentIndexIslandSource,
    /resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)/,
    "ContentIndexIsland should not recompute route access from workspace permissions",
  );
  assert.match(
    bodySource,
    /<ContentIndexRoute\s+routeAccess=\{routeAccess\}\s+workspace=\{workspace\}\s*\/>/,
    "ContentIndexBody should forward workspace and route access into the retained content index route",
  );
  assert.match(
    contentIndexSource,
    /routeAccess: AdminWorkspaceRouteAccessState/,
    "ContentIndexContent should receive route access as explicit route-scoped state",
  );
  assert.doesNotMatch(
    contentIndexSource,
    /const access = useAdminWorkspaceRouteAccess\(route\);/,
    "ContentIndexContent should not derive content index route access from AdminWorkspaceProvider",
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
    /export function NewContentIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?const routeAccess = workspace\?\.routeAccess;[\s\S]*?<NewContentBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "NewContentIsland should consume serialized route access from the server workspace prop",
  );
  assert.match(
    workspaceSource,
    /export function ContentRecordIsland\(\{[\s\S]*?workspace[\s\S]*?\}: AdminWorkspaceIslandProps & \{[\s\S]*?recordId: string;[\s\S]*?schemaId: string;[\s\S]*?\}\) \{[\s\S]*?const routeAccess = workspace\?\.routeAccess;[\s\S]*?<ContentRecordBody\s+routeAccess=\{routeAccess\}\s+recordId=\{recordId\}\s+schemaId=\{schemaId\}\s*\/>[\s\S]*?\}/,
    "ContentRecordIsland should consume serialized route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<ContentEditorRoute\s+mode="create"\s+routeAccess=\{routeAccess\}\s*\/>/,
    "NewContentBody should forward route access into the retained content editor route",
  );
  assert.match(
    bodySource,
    /<ContentEditorRoute\s+mode="edit"\s+recordId=\{recordId\}\s+routeAccess=\{routeAccess\}\s+schemaId=\{schemaId\}\s*\/>/,
    "ContentRecordBody should forward route access into the retained content editor route",
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
    /export function AdminHomeIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?const routeAccess = workspace\?\.routeAccess;[\s\S]*?<AdminHomeBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "AdminHomeIsland should consume serialized route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<AdminHomeRoute\s+routeAccess=\{routeAccess\}\s*\/>/,
    "AdminHomeBody should forward route access into the retained admin home route",
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
