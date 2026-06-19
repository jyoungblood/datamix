import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webRoot = path.join(repoRoot, "apps/web");
const srcRoot = path.join(webRoot, "src");

const requiredSourceRoots = [
  "admin",
  "components",
  "lib",
  "pages",
  "server",
  "styles",
  "types",
];

const forbiddenRootPaths = [
  "app",
  "components",
  "lib",
  "server",
  "styles",
  "types",
];

const forbiddenImportPatterns = [
  /@\/app\/admin\//,
  /@\/src\/admin-routes\//,
  /from ["']\.\.\/\.\.\/components\//,
  /from ["']\.\.\/\.\.\/lib\//,
  /from ["']\.\.\/\.\.\/server\//,
];

function walkFiles(directory) {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      if ([".astro", ".wrangler", "dist", "node_modules"].includes(entry)) {
        continue;
      }

      files.push(...walkFiles(entryPath));
      continue;
    }

    if (/\.(astro|css|d\.ts|mjs|ts|tsx)$/.test(entry)) {
      files.push(entryPath);
    }
  }

  return files;
}

for (const sourceRoot of requiredSourceRoots) {
  assert.ok(
    existsSync(path.join(srcRoot, sourceRoot)),
    `apps/web/src/${sourceRoot} should exist after the Astro source relocation.`,
  );
}

for (const rootPath of forbiddenRootPaths) {
  assert.ok(
    !existsSync(path.join(webRoot, rootPath)),
    `apps/web/${rootPath} should be moved under apps/web/src/${rootPath}.`,
  );
}

const astroConfig = readFileSync(path.join(webRoot, "astro.config.mjs"), "utf8");
const tsconfig = readFileSync(path.join(webRoot, "tsconfig.json"), "utf8");

assert.match(
  astroConfig,
  /new URL\("\.\/src", import\.meta\.url\)/,
  "The Vite @ alias should resolve to apps/web/src.",
);

assert.match(
  tsconfig,
  /"@\/\*": \["\.\/src\/\*"\]/,
  "The TypeScript @ alias should resolve to apps/web/src.",
);

assert.doesNotMatch(
  tsconfig,
  /"(app\/admin|components\/|lib\/|server\/|styles\/|types\/)/,
  "TypeScript should include moved source through src globs, not old root paths.",
);

const sourceFiles = [
  ...walkFiles(srcRoot),
  ...walkFiles(path.join(repoRoot, "tests")),
  path.join(repoRoot, "docs/architecture-overview.md"),
  path.join(repoRoot, "docs/local-development.md"),
  path.join(repoRoot, "docs/contributor-onboarding.md"),
];

for (const sourceFile of sourceFiles) {
  const source = readFileSync(sourceFile, "utf8");

  for (const pattern of forbiddenImportPatterns) {
    assert.doesNotMatch(
      source,
      pattern,
      `${path.relative(repoRoot, sourceFile)} should not reference pre-relocation imports.`,
    );
  }
}
