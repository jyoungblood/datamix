import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = new URL("..", import.meta.url);
const rootPath = path.resolve(workspaceRoot.pathname);
const targets = new Set(["dist", "tsconfig.tsbuildinfo"]);

async function walk(currentPath) {
  const entries = await readdir(currentPath, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(currentPath, entry.name);

      if (targets.has(entry.name)) {
        await rm(entryPath, { force: true, recursive: true });
        return;
      }

      if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
        await walk(entryPath);
      }
    }),
  );
}

await walk(rootPath);
