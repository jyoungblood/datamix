import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const legacyPublicEnvPrefix = "NEXT" + "_PUBLIC";

const activeTextFiles = [
  "README.md",
  "apps/web/README.md",
  "apps/web/.dev.vars.example",
  "apps/web/wrangler.jsonc",
  "packages/core/src/index.ts",
  "apps/web/src/lib/runtime.ts",
  "apps/web/src/types/env.d.ts",
  "tests/smoke/datamix-smoke.mjs",
];

for (const relativePath of activeTextFiles) {
  const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

  assert.doesNotMatch(
    source,
    /Vinext|App Router/,
    `${relativePath} should describe the Astro runtime without stale Vinext/App Router wording.`,
  );

  assert.ok(
    !source.includes(legacyPublicEnvPrefix),
    `${relativePath} should not use legacy ${legacyPublicEnvPrefix}_* public env names.`,
  );
}

const webRoot = path.join(repoRoot, "apps/web");
const forbiddenLocalArtifacts = [".vinext", ".next", "worker"];

for (const artifact of forbiddenLocalArtifacts) {
  assert.throws(
    () => statSync(path.join(webRoot, artifact)),
    { code: "ENOENT" },
    `apps/web/${artifact} should not remain after the Astro port cleanup.`,
  );
}

function walkFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      if (["dist", "node_modules", ".astro", ".wrangler"].includes(entry)) {
        continue;
      }

      files.push(...walkFiles(entryPath));
      continue;
    }

    if (/\.(astro|css|d\.ts|jsonc|md|mjs|ts|tsx)$/.test(entry)) {
      files.push(entryPath);
    }
  }

  return files;
}

const appSourceFiles = [
  ...walkFiles(path.join(repoRoot, "apps/web/src")),
  ...walkFiles(path.join(repoRoot, "packages")),
];

for (const sourceFile of appSourceFiles) {
  const source = readFileSync(sourceFile, "utf8");

  assert.doesNotMatch(
    source,
    /built with Vinext|Vinext App Router/,
    `${path.relative(repoRoot, sourceFile)} should not expose stale framework copy.`,
  );
}
