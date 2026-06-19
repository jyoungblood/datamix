import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loaderPage = path.join(repoRoot, "apps/web/app/loader/page.tsx");
const loaderDemoPage = path.join(repoRoot, "apps/web/app/loader/demo/page.tsx");
const loaderDemoComponent = path.join(
  repoRoot,
  "apps/web/app/loader/demo/loader-demo.tsx",
);
const authCard = path.join(repoRoot, "apps/web/src/components/auth/AuthCard.astro");
const loaderComponent = path.join(repoRoot, "apps/web/src/components/loader-interstitial.tsx");

assert.ok(!existsSync(loaderPage), "The temporary /loader preview route should be removed.");
assert.ok(
  !existsSync(loaderDemoPage),
  "The temporary /loader/demo preview route should be removed.",
);
assert.ok(
  !existsSync(loaderDemoComponent),
  "The temporary /loader/demo client component should be removed.",
);
assert.ok(existsSync(authCard), "The Astro auth card template should be shared.");
assert.ok(existsSync(loaderComponent), "The loader UI should be shared.");

const authCardSource = readFileSync(authCard, "utf8");
const componentSource = readFileSync(loaderComponent, "utf8");

assert.match(
  componentSource,
  /min-h-svh[^"]*bg-\[var\(--sidebar\)\]|bg-\[var\(--sidebar\)\][^"]*min-h-svh/,
  "The loader screen should fill the viewport with the sidebar background color.",
);

assert.match(
  componentSource,
  /fixed[^"]*inset-0|inset-0[^"]*fixed/,
  "The loader screen should cover the scrollbar gutter instead of relying on root canvas color.",
);

assert.match(
  componentSource,
  /place-items-center|items-center[^"]*justify-center|justify-center[^"]*items-center/,
  "The loader spinner should be vertically and horizontally centered.",
);

assert.match(
  componentSource,
  /text-white/,
  "The loader spinner should render in white.",
);

assert.doesNotMatch(
  componentSource,
  /text-primary/,
  "The loader spinner should not use the shadcn primary color.",
);

assert.match(
  authCardSource,
  /min-h-svh[^"]*bg-\[var\(--sidebar\)\]|bg-\[var\(--sidebar\)\][^"]*min-h-svh/,
  "The shared Astro auth card template should use the sidebar background color.",
);

assert.match(
  componentSource,
  /tail-spin|TailSpinSpinner|tailSpinGradient/,
  "The loader should embed MageCDN spinner #105, tail-spin.",
);

assert.doesNotMatch(
  componentSource,
  /loader9|LoaderNineSpinner|values="0 0; 0 20; 0 0"/,
  "The loader should no longer embed MageCDN spinner #85, loader9.",
);

assert.doesNotMatch(
  componentSource,
  /<title>oval<\/title>|OvalSpinner/,
  "The loader should no longer embed MageCDN spinner #86, oval.",
);

assert.doesNotMatch(
  componentSource,
  /loader8|LoaderEightSpinner|values="30; 100; 30"/,
  "The loader should no longer embed MageCDN spinner #84, loader8.",
);

assert.doesNotMatch(
  componentSource,
  /8-dots-rotate-scale|EightDotsRotateScaleSpinner|@keyframes moving/,
  "The loader should no longer embed MageCDN spinner #16, 8-dots-rotate-scale.",
);

assert.doesNotMatch(
  componentSource,
  /90-ring-with-gradient|RadialGradient8932|circle8932/,
  "The loader should no longer embed MageCDN spinner #19, 90-ring-with-gradient.",
);

assert.doesNotMatch(
  componentSource,
  /pulse-rings-multiple|spinner_dYH2/,
  "The loader should no longer embed MageCDN spinner #94, pulse-rings-multiple.",
);

assert.match(
  componentSource,
  /className="h-\d+ w-\d+"/,
  "The loader spinner should render at the configured fixed size.",
);
