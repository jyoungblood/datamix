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
const teamAndRolesSourcePath = path.resolve(
  "apps/web/src/admin/_screens/team-and-roles.tsx",
);
const settingsApiKeysSourcePath = path.resolve(
  "apps/web/src/admin/_screens/settings-api-keys.tsx",
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
