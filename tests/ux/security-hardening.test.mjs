import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readSource(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const adminAuthSource = readSource("apps/web/src/server/routes/admin-auth.ts");
const astroConfigSource = readSource("apps/web/astro.config.mjs");
const apiKeyClientSource = readSource("apps/web/src/lib/api-keys.ts");
const mediaSource = readSource("apps/web/src/server/media.ts");
const middlewareSource = readSource("apps/web/src/middleware.ts");
const apiKeysSource = readSource("apps/web/src/server/api-keys.ts");
const envSource = readSource("apps/web/src/server/env.ts");
const publicApiAuthSource = readSource("apps/web/src/server/public-api-auth.ts");
const deployRuntimeContractSource = readSource("docs/deploy-runtime-contract.md");

assert.doesNotMatch(
  adminAuthSource,
  /resolveDatamixRolePreset\(null,\s*"administrator"\)/,
  "Admin session authorization must not grant administrator when a user has no valid stored role.",
);

assert.match(
  adminAuthSource,
  /resolveDatamixRolePreset\(roleId\)/,
  "Admin session authorization should fall back through the core default role resolver.",
);

assert.match(
  mediaSource,
  /maxMediaUploadBytes/,
  "Media uploads should define a code-level max upload size.",
);

assert.doesNotMatch(
  mediaSource,
  /await file\.arrayBuffer\(\)/,
  "Media uploads should stream file bodies to R2 instead of buffering whole files in memory.",
);

assert.match(
  mediaSource,
  /MEDIA_BUCKET\.put\(\s*storageKey,\s*file\.stream\(\)/s,
  "Media uploads should pass the file stream directly to R2.",
);

assert.doesNotMatch(
  apiKeysSource,
  /void touchApiKeyUsage/,
  "Managed API key usage updates should not be left as floating promises.",
);

assert.match(
  apiKeysSource,
  /await touchApiKeyUsage/,
  "Managed API key usage updates should be awaited for predictable persistence and error handling.",
);

assert.doesNotMatch(
  publicApiAuthSource,
  /authorizeConfiguredApiKey/,
  "Public API auth should use managed API keys only, without a separate static env-key bypass.",
);

assert.doesNotMatch(
  publicApiAuthSource,
  /apiKey\s*===/,
  "Public API auth should not compare submitted API key strings directly.",
);

assert.doesNotMatch(
  envSource,
  /PUBLIC_API_(READ|WRITE)_KEY/,
  "Static public API key secrets should not be part of the Worker env contract.",
);

assert.doesNotMatch(
  apiKeyClientSource,
  /hasConfigured(Read|Write)Key/,
  "The admin API key client should not expose static env-key presence once managed keys are the only key path.",
);

assert.doesNotMatch(
  deployRuntimeContractSource,
  /PUBLIC_API_(READ|WRITE)_KEY/,
  "Deploy docs should direct users to managed API keys instead of static env secrets.",
);

assert.match(
  astroConfigSource,
  /security:\s*{\s*checkOrigin:\s*false,\s*}/s,
  "Astro's global origin check should stay disabled so external API-key DELETE requests without browser Origin headers can reach public handlers.",
);

assert.match(
  middlewareSource,
  /"\/api\/admin\/"/,
  "Custom middleware should keep unsafe admin API requests same-origin protected.",
);

assert.match(
  middlewareSource,
  /"\/api\/auth\/"/,
  "Custom middleware should keep unsafe auth API requests same-origin protected.",
);

assert.doesNotMatch(
  middlewareSource,
  /"\/api\/collections\/"/,
  "Custom same-origin middleware should not protect external collection API routes; those use API-key auth and public CORS.",
);
