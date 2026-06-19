import { drizzle } from "drizzle-orm/d1";

import type { DatamixBindings } from "../env";
import * as schema from "./schema";

export type DatamixDatabaseProfile = "d1";

export type DatamixDb = ReturnType<typeof createDb>;

export function createDb(
  env: DatamixBindings,
  options?: {
    profile?: DatamixDatabaseProfile;
  },
) {
  const profile = options?.profile ?? "d1";

  if (profile !== "d1") {
    throw new Error(`Unsupported Datamix database profile: ${profile}`);
  }

  return drizzle(env.DB, { schema });
}
