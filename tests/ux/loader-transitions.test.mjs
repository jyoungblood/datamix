import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assertExists(relativePath, message) {
  assert.ok(existsSync(path.join(repoRoot, relativePath)), message);
}

assertExists(
  "apps/web/components/loader-view-transition.tsx",
  "The loader should have a scoped View Transition boundary.",
);
assert.ok(
  !existsSync(path.join(repoRoot, "apps/web/app/loader/page.tsx")) &&
    !existsSync(path.join(repoRoot, "apps/web/app/loader/demo/page.tsx")) &&
    !existsSync(path.join(repoRoot, "apps/web/app/loader/demo/loader-demo.tsx")),
  "The temporary /loader preview routes should be removed.",
);

const transitionSource = readSource("apps/web/components/loader-view-transition.tsx");
const globalStylesSource = readSource("apps/web/styles/globals.css");
const loginSource = readSource("apps/web/app/admin/_screens/login.tsx");
const setupSource = readSource("apps/web/app/admin/_screens/setup.tsx");
const providerSource = readSource(
  "apps/web/app/admin/_workspace/admin-workspace-provider.tsx",
);

assert.match(
  transitionSource,
  /viewTransitionDocument\.startViewTransition/,
  "The loader transition boundary should use the View Transition API when available.",
);
assert.match(
  transitionSource,
  /flushSync/,
  "The loader transition boundary should commit the loader/content swap inside the transition callback.",
);
assert.match(
  transitionSource,
  /datamix-loader-view-transition/,
  "The loader transition boundary should scope transition CSS with an html class.",
);
assert.match(
  transitionSource,
  /LoaderInterstitial/,
  "The loader transition boundary should render the shared loader interstitial while active.",
);
assert.ok(
  !existsSync(path.join(repoRoot, "apps/web/lib/admin-loader-transition.ts")),
  "Admin loader transitions should not use cross-route sessionStorage markers.",
);

assert.match(
  globalStylesSource,
  /datamix-loader-transition-surface/,
  "Loader transitions should be scoped to the loader transition surface.",
);
assert.match(
  globalStylesSource,
  /::view-transition-old\(datamix-loader-surface\)/,
  "Loader transitions should define an old snapshot fade.",
);
assert.match(
  globalStylesSource,
  /::view-transition-new\(datamix-loader-surface\)/,
  "Loader transitions should define a new snapshot fade.",
);
assert.match(
  globalStylesSource,
  /--loader-view-transition-duration/,
  "Loader transition speed should be adjustable from one CSS variable.",
);
assert.match(
  globalStylesSource,
  /::view-transition-group\(datamix-loader-surface\)[\s\S]*animation-name:\s*none/,
  "Loader transitions should disable group movement so the surface only fades.",
);
assert.match(
  globalStylesSource,
  /datamix-loader-fade-through-out[\s\S]*45%\s*\{[\s\S]*opacity:\s*0/,
  "The old loader/content snapshot should fade out before the new snapshot fades in.",
);
assert.match(
  globalStylesSource,
  /datamix-loader-fade-through-in[\s\S]*45%\s*\{[\s\S]*opacity:\s*0/,
  "The new loader/content snapshot should hold transparent through the background gap.",
);

for (const [label, source] of [
  ["login", loginSource],
  ["setup", setupSource],
]) {
  assert.match(
    source,
    /LoaderViewTransitionBoundary/,
    `${label} should render auth/session interstitials through the loader transition boundary.`,
  );
}

for (const [label, source] of [
  ["login", loginSource],
  ["setup", setupSource],
]) {
  assert.doesNotMatch(
    source,
    /markAdminLoaderTransition/,
    `${label} should not write cross-route loader transition markers before navigating.`,
  );
  assert.match(
    source,
    /setIsRedirectingToAdmin\(true\)/,
    `${label} should show the auth-side loader while it is redirecting.`,
  );
}

assert.doesNotMatch(
  providerSource,
  /LoaderViewTransitionBoundary|consumeAdminLoaderTransition|adminLoaderTransition/,
  "The protected admin workspace provider should not own loader transition state or wrappers.",
);
assert.match(
  providerSource,
  /return null;/,
  "Direct/cold admin loads should resolve silently instead of showing the full-screen loader.",
);
assert.match(
  providerSource,
  /<AdminWorkspaceContext\.Provider value=\{value\}>\s*\{children\}\s*<\/AdminWorkspaceContext\.Provider>/,
  "Ready admin screens should render directly inside the workspace context provider.",
);

assert.doesNotMatch(
  loginSource,
  /title="Checking this Datamix instance"/,
  "The login session/setup pending interstitial should no longer render the card-style checking screen.",
);
assert.doesNotMatch(
  setupSource,
  /title="Preparing your first-run setup"/,
  "The setup pending interstitial should no longer render the card-style preparation screen.",
);
assert.doesNotMatch(
  providerSource,
  /const shouldShowLoader = isResolvingInitialSession \|\| isResolvingInitialAuthorization;/,
  "Protected admin session/access resolution should not show the loader just because an admin page is loading cold.",
);
