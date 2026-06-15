import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rootLayoutPath = path.join(repoRoot, "apps/web/app/layout.tsx");
const rootPagePath = path.join(repoRoot, "apps/web/app/page.tsx");

assert.ok(existsSync(rootLayoutPath), "The app root layout should exist.");
assert.ok(existsSync(rootPagePath), "The app root page should exist.");

const rootLayoutSource = readFileSync(rootLayoutPath, "utf8");
const rootPageSource = readFileSync(rootPagePath, "utf8");

assert.match(
  rootLayoutSource,
  /backgroundColor:\s*"var\(--page-canvas, #080f1f\)"/,
  "The document shell should have a dark fallback canvas before app CSS or route content paints.",
);

assert.match(
  rootLayoutSource,
  /<html[^>]*style=\{initialPageCanvasStyle\}[\s\S]*<body[^>]*style=\{initialPageCanvasStyle\}/,
  "The initial canvas fallback should be applied to both html and body.",
);

assert.match(
  rootPageSource,
  /from "next\/link"/,
  "The root page brand should be a single Vinext/Next link.",
);

assert.match(
  rootPageSource,
  /href=\{buildDatamixAdminPath\(\)\}/,
  "The root page brand should link to the admin root.",
);

assert.doesNotMatch(
  rootPageSource,
  /markAdminLoaderTransition/,
  "The root page should not own admin loader transition side effects.",
);

assert.doesNotMatch(
  rootPageSource,
  /buildDatamixAdminPath\("\/login"\)/,
  "The root page should not expose a separate login link.",
);

assert.match(
  rootPageSource,
  /bg-\[var\(--sidebar\)\]/,
  "The root page should use the same background token as the sidebar.",
);

assert.match(
  rootPageSource,
  /data-page-canvas="sidebar"/,
  "The root page should tint the reserved scrollbar gutter to match the sidebar background.",
);

assert.match(
  rootPageSource,
  /items-center/,
  "The root page should vertically center the brand link.",
);

assert.match(
  rootPageSource,
  /justify-center/,
  "The root page should horizontally center the brand link.",
);

assert.match(
  rootPageSource,
  /<Blocks\b/,
  "The root page should use the current sidebar icon logo.",
);

assert.match(
  rootPageSource,
  /h-12 w-12/,
  "The root page logo mark should be a bit larger than the sidebar mark.",
);

assert.match(
  rootPageSource,
  /datamixProduct\.name\.toUpperCase\(\)/,
  "The root page should show the same uppercase app title as the sidebar.",
);

assert.doesNotMatch(
  rootPageSource,
  /Button|Card|CardContent|CardDescription|CardHeader|CardTitle/,
  "The root page should be simplified to the centered brand link only.",
);
