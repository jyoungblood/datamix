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

test("Slice 2 media island derives route access from server workspace props", async () => {
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
    /resolveAdminWorkspaceRouteAccess/,
    "MediaIsland should import the pure route access resolver for server workspace props",
  );
  assert.match(
    workspaceSource,
    /workspace\.activeRoute/,
    "MediaIsland should read the active route from the server workspace prop",
  );
  assert.match(
    workspaceSource,
    /workspace\.permissions/,
    "MediaIsland should read permissions from the server workspace prop",
  );
  assert.match(
    workspaceSource,
    /<MediaBody\s+routeAccess=\{routeAccess\}\s*\/>/,
    "MediaIsland should pass explicit route access into the retained media body",
  );
  assert.match(
    bodySource,
    /<MediaLibraryRoute\s+routeAccess=\{routeAccess\}\s*\/>/,
    "MediaBody should forward route access into the retained media route",
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
    /export function MediaBody\(\{\s*routeAccess,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*\}\)/,
    "MediaBody should require explicit route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<MediaLibraryRoute\s*\/>/,
    "MediaBody should not rely on the media route provider fallback",
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
    /export function TeamBody\(\{\s*routeAccess,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*\}\)/,
    "TeamBody should require explicit route access",
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
    /export function SettingsBody\(\{\s*routeAccess,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*\}\)/,
    "SettingsBody should require explicit route access",
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
    /export function AccountBody\(\{\s*routeAccess,\s*\}: \{\s*routeAccess: AdminWorkspaceRouteAccessState;\s*\}\)/,
    "AccountBody should require explicit route access",
  );
  assert.doesNotMatch(
    bodySource,
    /<UserAccountRoute\s*\/>/,
    "AccountBody should not rely on the account route provider fallback",
  );
});

test("Slice 3 team island derives route access from server workspace props", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const teamSource = await readFile(teamAndRolesSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /export function TeamIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<TeamBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "TeamIsland should derive route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<TeamAndRolesRoute\s+routeAccess=\{routeAccess\}\s*\/>/,
    "TeamBody should forward route access into the retained team route",
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

test("Slice 4 settings island derives route access from server workspace props", async () => {
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
    /export function SettingsIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<SettingsBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "SettingsIsland should derive route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<SettingsApiKeysRoute\s+routeAccess=\{routeAccess\}\s*\/>/,
    "SettingsBody should forward route access into the retained settings route",
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

test("Slice 5 account island derives route access from server workspace props", async () => {
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
    /export function AccountIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<AccountBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "AccountIsland should derive route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<UserAccountRoute\s+routeAccess=\{routeAccess\}\s*\/>/,
    "AccountBody should forward route access into the retained account route",
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
});

test("Slice 6 schema overview island derives route access from server workspace props", async () => {
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
    /export function SchemaOverviewIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<SchemaOverviewBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "SchemaOverviewIsland should derive route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<SchemaOverviewRoute\s+routeAccess=\{routeAccess\}\s*\/>/,
    "SchemaOverviewBody should forward route access into the retained schema overview route",
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
});

test("Slice 7 schema builder islands derive route access from server workspace props", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const schemaBuilderSource = await readFile(schemaBuilderSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /export function NewSchemaIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<NewSchemaBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "NewSchemaIsland should derive route access from the server workspace prop",
  );
  assert.match(
    workspaceSource,
    /export function SchemaDetailIsland\(\{[\s\S]*?workspace[\s\S]*?\}: AdminWorkspaceIslandProps & \{ schemaId: string \}\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<SchemaDetailBody\s+routeAccess=\{routeAccess\}\s+schemaId=\{schemaId\}\s*\/>[\s\S]*?\}/,
    "SchemaDetailIsland should derive route access from the server workspace prop",
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

test("Slice 8 content index island derives route access from server workspace props", async () => {
  const workspaceSource = await readFile(
    path.join(adminIslandsDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const bodySource = await readFile(
    path.join(adminIslandsDirectory, "workspace-body-routes.tsx"),
    "utf8",
  );
  const contentIndexSource = await readFile(contentIndexSourcePath, "utf8");

  assert.match(
    workspaceSource,
    /export function ContentIndexIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<ContentIndexBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "ContentIndexIsland should derive route access from the server workspace prop",
  );
  assert.match(
    bodySource,
    /<ContentIndexRoute\s+routeAccess=\{routeAccess\}\s*\/>/,
    "ContentIndexBody should forward route access into the retained content index route",
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

test("Slice 9 content editor islands derive route access from server workspace props", async () => {
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
    /export function NewContentIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<NewContentBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "NewContentIsland should derive route access from the server workspace prop",
  );
  assert.match(
    workspaceSource,
    /export function ContentRecordIsland\(\{[\s\S]*?workspace[\s\S]*?\}: AdminWorkspaceIslandProps & \{[\s\S]*?recordId: string;[\s\S]*?schemaId: string;[\s\S]*?\}\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<ContentRecordBody\s+routeAccess=\{routeAccess\}\s+recordId=\{recordId\}\s+schemaId=\{schemaId\}\s*\/>[\s\S]*?\}/,
    "ContentRecordIsland should derive route access from the server workspace prop",
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

test("Slice 10 admin home island derives route access from server workspace props", async () => {
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
    /export function AdminHomeIsland\(\{\s*workspace\s*\}: AdminWorkspaceIslandProps\) \{[\s\S]*?resolveAdminWorkspaceRouteAccess\(workspace\.activeRoute, workspace\.permissions\)[\s\S]*?<AdminHomeBody\s+routeAccess=\{routeAccess\}\s*\/>[\s\S]*?\}/,
    "AdminHomeIsland should derive route access from the server workspace prop",
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
