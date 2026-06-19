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
        new RegExp(`<${island}\\b[^>]*client:only="react"`),
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

test("Slice 2 Astro admin auth pages render as Astro templates", async () => {
  await Promise.all(
    authPageRoutes.map(async (route) => {
      const source = await readFile(path.join(pagesAdminDirectory, route), "utf8");

      assert.doesNotMatch(
        source,
        /client:only="react"/,
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
