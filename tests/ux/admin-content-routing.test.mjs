import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adminRoot = path.join(repoRoot, "apps/web/src/admin");
const adminPagesRoot = path.join(repoRoot, "apps/web/src/pages/admin");
const workspaceContentRoot = path.join(adminPagesRoot, "content");

const adminRoutesPath = path.join(adminRoot, "_workspace/admin-routes.ts");
const contentIndexRouteBodyPath = path.join(
  repoRoot,
  "apps/web/src/components/admin/ContentIndexRouteBody.astro",
);
const contentIndexResolverPath = path.join(
  repoRoot,
  "apps/web/src/server/routes/astro-admin-content-index-page.ts",
);
const contentEditorPath = path.join(adminRoot, "_screens/content-editor.tsx");
const contentEditorRouteBodyPath = path.join(
  repoRoot,
  "apps/web/src/components/admin/ContentEditorRouteBody.astro",
);
const schemaBuilderRouteBodyPath = path.join(
  repoRoot,
  "apps/web/src/components/admin/SchemaBuilderRouteBody.astro",
);
const collectionDefinitionsPath = path.join(
  repoRoot,
  "apps/web/src/lib/collection-definitions.ts",
);

const adminRoutesSource = readFileSync(adminRoutesPath, "utf8");
const contentIndexRouteBodySource = readFileSync(contentIndexRouteBodyPath, "utf8");
const contentIndexResolverSource = readFileSync(contentIndexResolverPath, "utf8");
const contentEditorSource = readFileSync(contentEditorPath, "utf8");
const contentEditorRouteBodySource = readFileSync(contentEditorRouteBodyPath, "utf8");
const schemaBuilderRouteBodySource = readFileSync(
  schemaBuilderRouteBodyPath,
  "utf8",
);
const collectionDefinitionsSource = readFileSync(collectionDefinitionsPath, "utf8");

assert.ok(
  collectionDefinitionsSource.includes("id: string"),
  "Stored collection definitions should expose a stable record id for admin routes.",
);

assert.doesNotMatch(
  adminRoutesSource,
  /collection:\s*\(collection:\s*string\)/,
  "Admin content should not expose a schema-specific collection overview route.",
);

assert.match(
  adminRoutesSource,
  /newRecord:\s*\(\)\s*=>[\s\S]*pathname:\s*"\/content\/new"/,
  "The New content route should be schema-agnostic so the form can choose a schema first.",
);

assert.match(
  adminRoutesSource,
  /record:\s*\(schemaId:\s*string,\s*recordId:\s*string\)/,
  "Content edit routes should identify the schema by stored schema id, not API name.",
);

assert.ok(
  existsSync(path.join(workspaceContentRoot, "new.astro")),
  "The Astro content workspace should provide /admin/content/new for schema selection.",
);

assert.ok(
  !existsSync(path.join(workspaceContentRoot, "[collection].astro")),
  "The old per-schema content overview route should be removed.",
);

assert.match(
  contentIndexResolverSource,
  /listCollectionRecords/,
  "The content index should load records, not just schema definitions.",
);

assert.match(
  contentIndexRouteBodySource,
  /adminRoutes\.schema\.detail\(collection\.id\)/,
  "The all-content table should link each schema name to the id-based schema editor.",
);

assert.match(
  contentEditorRouteBodySource,
  /schemaId\?: string[\s\S]*collections\.find\(\(item\) => item\.id === activeSchemaId\)/,
  "The Astro content editor body should receive the schema id route parameter and resolve the selected schema by stored id.",
);

assert.doesNotMatch(
  contentEditorSource,
  /definition\.name\)\.href[\s\S]{0,80}Back to content/,
  "The content editor back link should return to the all-content list, not an overview page.",
);

assert.match(
  contentEditorRouteBodySource,
  /name="schemaId"/,
  "The Astro content editor body should keep /admin/content/new schema selection id-based.",
);

assert.match(
  contentEditorRouteBodySource,
  /adminRoutes\.content\.index\(\)\.href/,
  "The Astro content editor body should keep missing-record actions pointed at the all-content list.",
);

assert.match(
  schemaBuilderRouteBodySource,
  /collections\.find\(\(collection\) => collection\.id === decodedSchemaId\)/,
  "The Astro schema builder body should resolve existing schemas by stored id instead of API name.",
);
