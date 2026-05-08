import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const packageRoot = path.join(repoRoot, "packages/create-datamix");
const templateRoot = path.join(packageRoot, "dist/template");

const rootFiles = [
  ".gitignore",
  "README.md",
  "package.json",
  "tsconfig.base.json",
  "tsconfig.json",
];

const rootDirectories = [
  ".github",
  "apps/admin",
  "apps/api",
  "docs",
  "packages/core",
  "scripts",
  "tests",
];

const ignoredNames = new Set([
  ".wrangler",
  "dist",
  "node_modules",
  "tsconfig.tsbuildinfo",
]);

await rm(templateRoot, { force: true, recursive: true });
await mkdir(templateRoot, { recursive: true });

for (const relativePath of rootFiles) {
  await cp(path.join(repoRoot, relativePath), path.join(templateRoot, relativePath));
}

for (const relativePath of rootDirectories) {
  await copyDirectory(path.join(repoRoot, relativePath), path.join(templateRoot, relativePath));
}

async function copyDirectory(sourceDir, targetDir) {
  await cp(sourceDir, targetDir, {
    recursive: true,
    filter(source) {
      const name = path.basename(source);

      if (ignoredNames.has(name)) {
        return false;
      }

      if (source.includes(`${path.sep}packages${path.sep}create-datamix`)) {
        return false;
      }

      if (source.endsWith(".dev.vars") || source.endsWith(".env.local")) {
        return false;
      }

      return true;
    },
  });
}
