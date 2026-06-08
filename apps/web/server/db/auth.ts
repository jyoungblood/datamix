import { drizzleAdapter } from "better-auth/adapters/drizzle";

import type { DatamixBindings } from "../env";
import { createDb } from "./index";
import * as schema from "./schema";

export function createAuthDatabaseAdapter(env: DatamixBindings) {
  return drizzleAdapter(createDb(env), {
    provider: "sqlite",
    schema,
  });
}
