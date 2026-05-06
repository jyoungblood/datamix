import {
  betterAuth,
  APIError,
  type BetterAuthOptions,
  type GenericEndpointContext,
} from "better-auth";
import { createAuthSetupStatus, datamixAuthPath, datamixProduct } from "@datamix/core";
import { getMigrations } from "better-auth/db/migration";

import { readApiAuthRuntime, type ApiBindings } from "./env";

export type DatamixAuth = ReturnType<typeof createAuth>;
export type DatamixSession = DatamixAuth["$Infer"]["Session"];

async function countUsers(context: GenericEndpointContext<BetterAuthOptions>) {
  return context.context.internalAdapter.countTotalUsers();
}

export function createAuthOptions(env: ApiBindings): BetterAuthOptions {
  const authRuntime = readApiAuthRuntime(env);

  return {
    appName: datamixProduct.name,
    basePath: datamixAuthPath,
    secret: authRuntime.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [env.ADMIN_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    databaseHooks: {
      user: {
        create: {
          async before(user, context) {
            if (!context || !context.path.endsWith("/sign-up/email")) {
              return;
            }

            const userCount = await countUsers(context);

            if (userCount > 0) {
              throw new APIError("FORBIDDEN", {
                message: "Initial setup is already complete. Public sign-up is disabled.",
              });
            }

            return {
              data: {
                ...user,
                emailVerified: false,
              },
            };
          },
        },
      },
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

export async function getAuthSetupStatus(env: ApiBindings) {
  const migration = await runAuthMigrations(env);
  const auth = createAuth(env);
  const context = await auth.$context;
  const userCount = await context.internalAdapter.countTotalUsers();

  return {
    migration,
    setup: createAuthSetupStatus(userCount),
  };
}
