import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const adminPagesRoot = path.join(repoRoot, "apps/web/src/pages/admin");
const adminComponentsRoot = path.join(
  repoRoot,
  "apps/web/src/components/admin",
);

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
  const pageSource = readFileSync(
    path.join(adminPagesRoot, route.page),
    "utf8",
  );
  const bodyPath = path.join(adminComponentsRoot, route.bodyFile);

  assert.ok(
    existsSync(bodyPath),
    `${route.bodyFile} should exist for the Astro-native ${route.page} body.`,
  );
  assert.match(
    pageSource,
    new RegExp(
      `import ${route.body} from "@\\/components\\/admin\\/${route.bodyFile}"`,
    ),
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
const schemaBuilderBodySource = readFileSync(
  path.join(adminComponentsRoot, "SchemaBuilderRouteBody.astro"),
  "utf8",
);
const mediaLibraryBodySource = readFileSync(
  path.join(adminComponentsRoot, "MediaLibraryRouteBody.astro"),
  "utf8",
);
const teamBodySource = readFileSync(
  path.join(adminComponentsRoot, "TeamRouteBody.astro"),
  "utf8",
);
const settingsBodySource = readFileSync(
  path.join(adminComponentsRoot, "SettingsRouteBody.astro"),
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
  schemaBuilderBodySource,
  /<AdminPageHeader\s+title=\{pageTitle\}/,
  "SchemaBuilderRouteBody should render the selected schema page header in Astro.",
);
assert.match(
  schemaBuilderBodySource,
  /routeAccess\.isAllowed/,
  "SchemaBuilderRouteBody should render route access states in Astro.",
);
assert.match(
  schemaBuilderBodySource,
  /collections\.find/,
  "SchemaBuilderRouteBody should resolve the selected schema from server-loaded collections in Astro.",
);
assert.match(
  schemaBuilderBodySource,
  /Schema editing is restricted|Loading schema|Schema is unavailable|Schema not found/,
  "SchemaBuilderRouteBody should render schema builder load and missing states in Astro.",
);
assert.match(
  schemaBuilderBodySource,
  /<SchemaBuilderFormIsland\b[\s\S]*client:only="react"/,
  "SchemaBuilderRouteBody should keep only the targeted schema form hydrated.",
);
assert.match(
  schemaBuilderBodySource,
  /<SchemaBuilderSaveButtonIsland\b[\s\S]*client:only="react"/,
  "SchemaBuilderRouteBody should hydrate only the targeted schema save control in the header.",
);
assert.doesNotMatch(
  schemaBuilderBodySource,
  /<SchemaBuilderRoute\b[\s\S]*client:only="react"|import \{ SchemaBuilderRoute \}/,
  "SchemaBuilderRouteBody should not hydrate the whole schema builder route body.",
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

assert.match(
  teamBodySource,
  /<AdminPageHeader\s+title="Team"/,
  "TeamRouteBody should render the team page header in Astro.",
);
assert.match(
  teamBodySource,
  /users\.map/,
  "TeamRouteBody should render the server-loaded user list in Astro.",
);
assert.match(
  teamBodySource,
  /roles\.map/,
  "TeamRouteBody should render the server-loaded role list in Astro.",
);
assert.match(
  teamBodySource,
  /<TeamAndRolesInteractionsIsland\b[\s\S]*client:only="react"/,
  "TeamRouteBody should keep only targeted team interactions hydrated.",
);
assert.doesNotMatch(
  teamBodySource,
  /<TeamAndRolesRoute\b[\s\S]*client:only="react"|import \{ TeamAndRolesRoute \}/,
  "TeamRouteBody should not hydrate the whole team route body.",
);

assert.match(
  settingsBodySource,
  /<AdminPageHeader\s+title="Settings"/,
  "SettingsRouteBody should render the settings page header in Astro.",
);
assert.match(
  settingsBodySource,
  /apiKeys\.map/,
  "SettingsRouteBody should render the server-loaded API key list in Astro.",
);
assert.match(
  settingsBodySource,
  /rolePreviewItems\.map/,
  "SettingsRouteBody should render the server-loaded role list in Astro.",
);
assert.match(
  settingsBodySource,
  /<SettingsInteractionsIsland\b[\s\S]*client:only="react"/,
  "SettingsRouteBody should keep only targeted settings interactions hydrated.",
);
assert.doesNotMatch(
  settingsBodySource,
  /<SettingsApiKeysRoute\b[\s\S]*client:only="react"|import \{ SettingsApiKeysRoute \}/,
  "SettingsRouteBody should not hydrate the whole settings route body.",
);
