import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adminRoot = path.join(repoRoot, "apps/web/src/admin");
const workspaceContentRoot = path.join(adminRoot, "(workspace)/content");

const adminRoutesPath = path.join(adminRoot, "_workspace/admin-routes.ts");
const contentIndexPath = path.join(adminRoot, "_screens/content-index.tsx");
const contentEditorPath = path.join(adminRoot, "_screens/content-editor.tsx");
const schemaBuilderPath = path.join(adminRoot, "_screens/schema-builder.tsx");
const collectionDefinitionsPath = path.join(
  repoRoot,
  "apps/web/src/lib/collection-definitions.ts",
);

const adminRoutesSource = readFileSync(adminRoutesPath, "utf8");
const contentIndexSource = readFileSync(contentIndexPath, "utf8");
const contentEditorSource = readFileSync(contentEditorPath, "utf8");
const schemaBuilderSource = readFileSync(schemaBuilderPath, "utf8");
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
  existsSync(path.join(workspaceContentRoot, "new/page.tsx")),
  "The content workspace should provide /admin/content/new for schema selection.",
);

assert.ok(
  !existsSync(path.join(workspaceContentRoot, "[collection]/page.tsx")),
  "The old per-schema content overview route should be removed.",
);

assert.match(
  contentIndexSource,
  /listCollectionRecords/,
  "The content index should load records, not just schema definitions.",
);

assert.match(
  contentIndexSource,
  /adminRoutes\.schema\.detail\(collection\.id\)/,
  "The all-content table should link each schema name to the id-based schema editor.",
);

assert.match(
  contentEditorSource,
  /schemaId/,
  "The content editor should receive a schema id route parameter.",
);

assert.doesNotMatch(
  contentEditorSource,
  /definition\.name\)\.href[\s\S]{0,80}Back to content/,
  "The content editor back link should return to the all-content list, not an overview page.",
);

assert.match(
  schemaBuilderSource,
  /collection\.id === decodedSchemaId/,
  "The schema builder should resolve existing schemas by stored id instead of API name.",
);
