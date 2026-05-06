import { betterAuth, type BetterAuthOptions } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { datamixProduct } from "@datamix/core";

import { readApiAuthRuntime, type ApiBindings } from "./env";

export type DatamixAuth = ReturnType<typeof createAuth>;
export type DatamixSession = DatamixAuth["$Infer"]["Session"];

export function createAuthOptions(env: ApiBindings): BetterAuthOptions {
  const authRuntime = readApiAuthRuntime(env);

  return {
    appName: datamixProduct.name,
    secret: authRuntime.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [env.ADMIN_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
  };
}

export function createAuth(env: ApiBindings) {
  return betterAuth(createAuthOptions(env));
}

export async function runAuthMigrations(env: ApiBindings) {
  const migrations = await getMigrations(createAuthOptions(env));

  await migrations.runMigrations();

  return {
    createdTables: migrations.toBeCreated.map((table) => table.table),
    alteredTables: migrations.toBeAdded.map((table) => table.table),
  };
}
