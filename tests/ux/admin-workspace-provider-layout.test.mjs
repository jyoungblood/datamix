import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adminRoot = path.join(repoRoot, "apps/web/app/admin");
const workspaceGroup = path.join(adminRoot, "(workspace)");
const workspaceLayout = path.join(workspaceGroup, "layout.tsx");
const workspaceProvider = path.join(
  adminRoot,
  "_workspace/admin-workspace-provider.tsx",
);

const protectedWorkspacePages = [
  "page.tsx",
  "account/page.tsx",
  "content/page.tsx",
  "content/[collection]/page.tsx",
  "content/[collection]/new/page.tsx",
  "content/[collection]/[recordId]/page.tsx",
  "media/page.tsx",
  "schema/page.tsx",
  "schema/new/page.tsx",
  "schema/[schemaId]/page.tsx",
  "settings/page.tsx",
  "team/page.tsx",
];

const standaloneAuthPages = [
  "forgot-password/page.tsx",
  "login/page.tsx",
  "reset-password/page.tsx",
  "setup/page.tsx",
];

const screenFiles = [
  "admin-home.tsx",
  "content-collection.tsx",
  "content-editor.tsx",
  "content-index.tsx",
  "media-library.tsx",
  "schema-builder.tsx",
  "schema-overview.tsx",
  "settings-api-keys.tsx",
  "team-and-roles.tsx",
  "user-account.tsx",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  existsSync(workspaceLayout),
  "Protected admin routes should share apps/web/app/admin/(workspace)/layout.tsx.",
);

const layoutSource = readFileSync(workspaceLayout, "utf8");

assert(
  layoutSource.includes("AdminWorkspaceProvider") &&
    layoutSource.includes("<AdminWorkspaceProvider>"),
  "The protected admin layout should mount one persistent AdminWorkspaceProvider.",
);

for (const pagePath of protectedWorkspacePages) {
  assert(
    existsSync(path.join(workspaceGroup, pagePath)),
    `Protected admin page should live under the shared workspace group: ${pagePath}.`,
  );
}

for (const pagePath of standaloneAuthPages) {
  assert(
    existsSync(path.join(adminRoot, pagePath)),
    `Auth/setup page should remain outside the protected workspace group: ${pagePath}.`,
  );
}

for (const screenFile of screenFiles) {
  const source = readFileSync(path.join(adminRoot, "_screens", screenFile), "utf8");

  assert(
    !source.includes("AdminWorkspaceProvider"),
    `${screenFile} should consume the shared provider instead of mounting its own.`,
  );
}

const providerSource = readFileSync(workspaceProvider, "utf8");

for (const transientTitle of ["Checking your session", "Loading access profile"]) {
  assert(
    !providerSource.includes(transientTitle),
    `Transient auth gate title should not be shown during admin navigation: ${transientTitle}.`,
  );
}
