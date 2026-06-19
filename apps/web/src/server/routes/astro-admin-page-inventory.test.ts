import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type AdminPageExpectation = {
  island: string;
  route: string;
};

const adminPageExpectations: AdminPageExpectation[] = [
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
  { island: "SetupIsland", route: "setup.astro" },
  { island: "LoginIsland", route: "login.astro" },
  { island: "ForgotPasswordIsland", route: "forgot-password.astro" },
  { island: "ResetPasswordIsland", route: "reset-password.astro" },
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

const authIslands = [
  "SetupIsland",
  "LoginIsland",
  "ForgotPasswordIsland",
  "ResetPasswordIsland",
];

const pagesAdminDirectory = path.resolve("apps/web/src/pages/admin");
const adminRoutesDirectory = path.resolve("apps/web/src/admin-routes");

test("Slice 4 Astro admin page inventory matches the planned routes", async () => {
  await Promise.all(
    adminPageExpectations.map(async ({ island, route }) => {
      const source = await readFile(path.join(pagesAdminDirectory, route), "utf8");

      assert.match(
        source,
        new RegExp(`<${island}\\b[^>]*client:only="react"`),
        `${route} should mount ${island} as a React client-only island`,
      );
      assert.match(
        source,
        /DatamixRootLayout/,
        `${route} should use the shared Astro root layout`,
      );
    }),
  );
});

test("Slice 4 React island wrappers export every planned admin route island", async () => {
  const workspaceSource = await readFile(
    path.join(adminRoutesDirectory, "workspace-routes.tsx"),
    "utf8",
  );
  const authSource = await readFile(
    path.join(adminRoutesDirectory, "auth-routes.tsx"),
    "utf8",
  );

  for (const island of workspaceIslands) {
    assert.match(
      workspaceSource,
      new RegExp(`export\\s+function\\s+${island}\\b`),
      `workspace-routes.tsx should export ${island}`,
    );
  }

  for (const island of authIslands) {
    assert.match(
      authSource,
      new RegExp(`export\\s+function\\s+${island}\\b`),
      `auth-routes.tsx should export ${island}`,
    );
  }
});

test("Slice 4 retained React components no longer import Next Link", async () => {
  const retainedReactComponents = [
    "apps/web/src/admin/_screens/admin-home.tsx",
    "apps/web/src/admin/_components/admin-frame.tsx",
  ];

  await Promise.all(
    retainedReactComponents.map(async (componentPath) => {
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
