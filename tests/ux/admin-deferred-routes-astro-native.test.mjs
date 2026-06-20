import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adminPagesRoot = path.join(repoRoot, "apps/web/src/pages/admin");
const adminComponentsRoot = path.join(repoRoot, "apps/web/src/components/admin");

const astroNativeRoutes = [
  {
    body: "AdminDashboardRouteBody",
    bodyFile: "AdminDashboardRouteBody.astro",
    forbiddenIsland: "AdminHomeIsland",
    page: "index.astro",
    resolver: "resolveWorkspacePage",
  },
  {
    body: "SchemaBuilderRouteBody",
    bodyFile: "SchemaBuilderRouteBody.astro",
    forbiddenIsland: "NewSchemaIsland",
    page: "schema/new.astro",
    resolver: "resolveSchemaBuilderPage",
  },
  {
    body: "SchemaBuilderRouteBody",
    bodyFile: "SchemaBuilderRouteBody.astro",
    forbiddenIsland: "SchemaDetailIsland",
    page: "schema/[schemaId].astro",
    resolver: "resolveSchemaBuilderPage",
  },
  {
    body: "ContentEditorRouteBody",
    bodyFile: "ContentEditorRouteBody.astro",
    forbiddenIsland: "NewContentIsland",
    page: "content/new.astro",
    resolver: "resolveContentEditorPage",
  },
  {
    body: "ContentEditorRouteBody",
    bodyFile: "ContentEditorRouteBody.astro",
    forbiddenIsland: "ContentRecordIsland",
    page: "content/[schemaId]/[recordId].astro",
    resolver: "resolveContentEditorPage",
  },
  {
    body: "MediaLibraryRouteBody",
    bodyFile: "MediaLibraryRouteBody.astro",
    forbiddenIsland: "MediaIsland",
    page: "media.astro",
    resolver: "resolveMediaLibraryPage",
  },
  {
    body: "TeamRouteBody",
    bodyFile: "TeamRouteBody.astro",
    forbiddenIsland: "TeamIsland",
    page: "team.astro",
    resolver: "resolveTeamPage",
  },
  {
    body: "SettingsRouteBody",
    bodyFile: "SettingsRouteBody.astro",
    forbiddenIsland: "SettingsIsland",
    page: "settings.astro",
    resolver: "resolveSettingsPage",
  },
];

for (const route of astroNativeRoutes) {
  const pageSource = readFileSync(path.join(adminPagesRoot, route.page), "utf8");
  const bodyPath = path.join(adminComponentsRoot, route.bodyFile);

  assert.ok(
    existsSync(bodyPath),
    `${route.bodyFile} should exist for the Astro-native ${route.page} body.`,
  );
  assert.match(
    pageSource,
    new RegExp(`import ${route.body} from "@\\/components\\/admin\\/${route.bodyFile}"`),
    `${route.page} should import ${route.body}.`,
  );
  assert.match(
    pageSource,
    new RegExp(`${route.resolver}\\(Astro\\.request`),
    `${route.page} should use ${route.resolver} in Astro frontmatter.`,
  );
  assert.match(
    pageSource,
    new RegExp(`<${route.body}\\b`),
    `${route.page} should render ${route.body}.`,
  );
  assert.doesNotMatch(
    pageSource,
    new RegExp(`${route.forbiddenIsland}|client:only=${'"react"'}`),
    `${route.page} should not mount the deferred whole-route React island.`,
  );
}

const dashboardBodySource = readFileSync(
  path.join(adminComponentsRoot, "AdminDashboardRouteBody.astro"),
  "utf8",
);
const mediaLibraryBodySource = readFileSync(
  path.join(adminComponentsRoot, "MediaLibraryRouteBody.astro"),
  "utf8",
);

assert.match(
  dashboardBodySource,
  /data-admin-dashboard-placeholder/,
  "AdminDashboardRouteBody should render the visual dashboard placeholder marker.",
);
assert.doesNotMatch(
  dashboardBodySource,
  /useAdminDashboardData|AdminHomeRoute/,
  "AdminDashboardRouteBody should not keep the old client dashboard data route.",
);

assert.match(
  mediaLibraryBodySource,
  /<AdminPageHeader\s+title="Media library"/,
  "MediaLibraryRouteBody should render the media page header in Astro.",
);
assert.match(
  mediaLibraryBodySource,
  /mediaAssets\.map/,
  "MediaLibraryRouteBody should render the server-loaded media list in Astro.",
);
assert.match(
  mediaLibraryBodySource,
  /<MediaLibraryInteractionsIsland\b[\s\S]*client:only="react"/,
  "MediaLibraryRouteBody should keep only targeted media interactions hydrated.",
);
assert.doesNotMatch(
  mediaLibraryBodySource,
  /<MediaLibraryRoute\b[\s\S]*client:only="react"|import \{ MediaLibraryRoute \}/,
  "MediaLibraryRouteBody should not hydrate the whole media route body.",
);
