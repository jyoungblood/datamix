import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const buttonComponent = path.join(repoRoot, "apps/web/components/ui/button.tsx");
const globalStyles = path.join(repoRoot, "apps/web/styles/globals.css");
const adminRoot = path.join(repoRoot, "apps/web/app/admin");
const workspaceGroup = path.join(adminRoot, "(workspace)");
const workspaceLayout = path.join(workspaceGroup, "layout.tsx");
const adminFrame = path.join(adminRoot, "_components/admin-frame.tsx");
const commandPaletteDialog = path.join(
  adminRoot,
  "_components/command-palette-dialog.tsx",
);
const adminCommandPalette = path.join(
  adminRoot,
  "_workspace/admin-command-palette.tsx",
);
const settingsApiKeysScreen = path.join(
  adminRoot,
  "_screens/settings-api-keys.tsx",
);
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
const adminFrameSource = readFileSync(adminFrame, "utf8");
const buttonComponentSource = readFileSync(buttonComponent, "utf8");
const globalStylesSource = readFileSync(globalStyles, "utf8");
const commandPaletteDialogSource = readFileSync(commandPaletteDialog, "utf8");
const adminCommandPaletteSource = readFileSync(adminCommandPalette, "utf8");
const settingsApiKeysSource = readFileSync(settingsApiKeysScreen, "utf8");

for (const transientTitle of ["Checking your session", "Loading access profile"]) {
  assert(
    !providerSource.includes(transientTitle),
    `Transient auth gate title should not be shown during admin navigation: ${transientTitle}.`,
  );
}

assert(
  adminFrameSource.includes("sticky top-0") &&
    adminFrameSource.includes("h-screen") &&
    adminFrameSource.includes("overflow-y-auto"),
  "The admin sidebar should stay pinned to the viewport so the account link remains visible on every admin screen.",
);

assert(
  adminCommandPaletteSource.includes("<input") &&
    adminCommandPaletteSource.includes("readOnly") &&
    adminCommandPaletteSource.includes("⌘ + K") &&
    !adminCommandPaletteSource.includes("Command palette</Button>"),
  "The command palette trigger should be an input-like search field with a keyboard hint, not a text button.",
);

assert(
  !adminCommandPaletteSource.includes("placeholder=") &&
    !commandPaletteDialogSource.includes("placeholder="),
  "The command palette trigger and dialog should not render placeholder text.",
);

assert(
  !commandPaletteDialogSource.includes("document.body.style.overflow"),
  "Opening the command palette should not remove page scrollbars or shift the admin layout.",
);

assert(
  buttonComponentSource.includes("bg-primary text-primary-foreground") &&
    !buttonComponentSource.includes("text-[var(--primary-foreground)]"),
  "Primary buttons should keep using the semantic primary foreground utility.",
);

assert(
  globalStylesSource.includes('[data-slot="button"][data-variant="default"]') &&
    globalStylesSource.includes("color: var(--primary-foreground);"),
  "The design-system stylesheet should enforce high-contrast text for default primary buttons.",
);

assert(
  !settingsApiKeysSource.includes('"Refresh API keys"') &&
    settingsApiKeysSource.includes('title="Public API keys"') &&
    settingsApiKeysSource.includes('{isLoadingApiKeys ? "Refreshing" : "Refresh"}'),
  "Settings should keep only the Public API keys section refresh action, not a duplicate page-header refresh button.",
);
