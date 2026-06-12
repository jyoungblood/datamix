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
const centeredCardPageSource = readSource("apps/web/components/centered-card-page.tsx");
const loaderInterstitialSource = readSource("apps/web/components/loader-interstitial.tsx");
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
  /html\.datamix-loader-view-transition\s*\{[\s\S]*view-transition-name:\s*none/,
  "Loader transitions should opt the document root out of the default full-page snapshot.",
);
assert.match(
  globalStylesSource,
  /html\s*\{[\s\S]*scrollbar-gutter:\s*stable/,
  "The root scroll container should reserve scrollbar gutter space to prevent post-loader layout shifts.",
);
assert.match(
  globalStylesSource,
  /html\s*\{[\s\S]*--page-canvas:\s*var\(--background\)[\s\S]*background:\s*var\(--page-canvas\)/,
  "The reserved scrollbar gutter should paint with the active page canvas color.",
);
assert.match(
  globalStylesSource,
  /html:has\(\[data-page-canvas="sidebar"\]\)\s*\{[\s\S]*--page-canvas:\s*var\(--sidebar\)/,
  "Sidebar-colored pages should be able to tint the root scrollbar gutter.",
);
assert.match(
  centeredCardPageSource,
  /data-page-canvas="sidebar"/,
  "The shared auth card shell should tint the root scrollbar gutter to match the sidebar canvas.",
);
assert.match(
  loaderInterstitialSource,
  /data-page-canvas="sidebar"/,
  "The shared loader should tint the root scrollbar gutter to match its sidebar canvas.",
);
assert.doesNotMatch(
  globalStylesSource,
  /html\.datamix-loader-view-transition,\s*html\.datamix-loader-view-transition body\s*\{[\s\S]*background:\s*var\(--sidebar\)/,
  "Loader transitions should not repaint the root/body canvas when the snapshot starts.",
);
assert.doesNotMatch(
  globalStylesSource,
  /html\.datamix-loader-view-transition,\s*html\.datamix-loader-view-transition body\s*\{[\s\S]*overflow:\s*hidden/,
  "Loader transitions should not toggle root/body overflow and force scrollbar gutter repaints.",
);
assert.doesNotMatch(
  globalStylesSource,
  /\.datamix-loader-transition-surface\s*\{[\s\S]*background:\s*var\(--sidebar\)/,
  "The transition surface should not repaint behind resolved admin content.",
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

assert.match(
  providerSource,
  /LoaderViewTransitionBoundary/,
  "The protected admin workspace provider should render admin resolution through the loader transition boundary.",
);
assert.match(
  providerSource,
  /active=\{isResolvingInitialAdmin\}/,
  "Protected admin session/access resolution should drive the loader boundary directly.",
);
assert.match(
  providerSource,
  /isResolvingInitialAdmin \? null :/,
  "Protected admin children should not mount until the workspace has resolved.",
);
assert.match(
  providerSource,
  /<AdminWorkspaceContext\.Provider value=\{value\}>[\s\S]*<LoaderViewTransitionBoundary active=\{isResolvingInitialAdmin\}>[\s\S]*<\/LoaderViewTransitionBoundary>[\s\S]*<\/AdminWorkspaceContext\.Provider>/,
  "The workspace context provider should stay mounted around the loader boundary so hydrated admin screens never see a null context.",
);
assert.match(
  providerSource,
  /return children;/,
  "Ready admin screens should render as the resolved loader-boundary content.",
);
assert.doesNotMatch(
  providerSource,
  /return \(\s*<AdminWorkspaceContext\.Provider value=\{value\}>[\s\S]*\{children\}[\s\S]*<\/AdminWorkspaceContext\.Provider>\s*\);/,
  "The workspace context provider should not be recreated inside the ready-only loader branch.",
);
assert.doesNotMatch(
  providerSource,
  /if \(isResolvingInitialAdmin\)\s*\{\s*return null;\s*\}/,
  "Direct/cold admin loads should show the full-screen loader instead of returning nothing.",
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
  "Protected admin session/access resolution should use the shared isResolvingInitialAdmin loader state.",
);
