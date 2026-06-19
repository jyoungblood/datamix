import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const adminAuthSource = readFileSync(
  path.join(repoRoot, "apps/web/src/server/routes/admin-auth.ts"),
  "utf8",
);

assert.match(
  adminAuthSource,
  /createAuth\(env,\s*\{\s*baseURL:\s*new URL\(request\.url\)\.origin,\s*\}\)\.api\.getSession/s,
  "Admin session resolution must build Better Auth with the incoming request origin so local/dev APP_ORIGIN drift cannot make it look for a different session cookie name.",
);
