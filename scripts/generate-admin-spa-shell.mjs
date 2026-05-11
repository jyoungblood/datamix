#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const adminClientDir = path.join(repoRoot, "apps/admin/dist/client");
const manifestPath = path.join(adminClientDir, ".vite/manifest.json");
const indexHtmlPath = path.join(adminClientDir, "index.html");

function readUniqueCssFiles(manifest) {
  const cssFiles = new Set();

  for (const entry of Object.values(manifest)) {
    if (!entry || typeof entry !== "object" || !Array.isArray(entry.css)) {
      continue;
    }

    for (const cssFile of entry.css) {
      if (typeof cssFile === "string" && cssFile.length > 0) {
        cssFiles.add(cssFile);
      }
    }
  }

  return [...cssFiles];
}

function findClientEntryFile(manifest) {
  const explicitEntry = manifest["virtual:vinext-client-entry"];

  if (explicitEntry?.file) {
    return explicitEntry.file;
  }

  for (const entry of Object.values(manifest)) {
    if (entry && typeof entry === "object" && entry.isEntry && typeof entry.file === "string") {
      return entry.file;
    }
  }

  throw new Error("Unable to find the Vinext client entry in the admin manifest.");
}

function buildIndexHtml({ clientEntryFile, cssFiles }) {
  const cssLinks = cssFiles
    .map((cssFile) => `    <link rel="stylesheet" href="/${cssFile}" />`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
${cssLinks}
  </head>
  <body>
    <div id="__next"></div>
    <script>
      window.__NEXT_DATA__ = {
        page: window.location.pathname,
        query: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
      };
    </script>
    <script type="module" src="/${clientEntryFile}"></script>
  </body>
</html>
`;
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const clientEntryFile = findClientEntryFile(manifest);
  const cssFiles = readUniqueCssFiles(manifest);
  const html = buildIndexHtml({
    clientEntryFile,
    cssFiles,
  });

  await writeFile(indexHtmlPath, html, "utf8");
  process.stdout.write(`[admin-shell] Wrote ${path.relative(repoRoot, indexHtmlPath)}\n`);
}

await main();
