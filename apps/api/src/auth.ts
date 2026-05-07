import {
  betterAuth,
  APIError,
  type BetterAuthOptions,
  type GenericEndpointContext,
} from "better-auth";
import {
  createAuthSetupStatus,
  datamixDefaultRoleAssignments,
  datamixAuthPath,
  datamixProduct,
} from "@datamix/core";
import { getMigrations } from "better-auth/db/migration";

import { sendAuthEmail } from "./email";
import { readApiAuthRuntime, type ApiBindings } from "./env";
import { getExecutionContext } from "./request-context";

export type DatamixAuth = ReturnType<typeof createAuth>;
export type DatamixSession = DatamixAuth["$Infer"]["Session"];

async function countUsers(context: GenericEndpointContext<BetterAuthOptions>) {
  return context.context.internalAdapter.countTotalUsers();
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function createAuthOptions(
  env: ApiBindings,
  options?: {
    baseURL?: string;
  },
): BetterAuthOptions {
  const authRuntime = readApiAuthRuntime(env);
  const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};

  if (authRuntime.socialProviders.github) {
    socialProviders.github = {
      clientId: authRuntime.socialProviders.github.clientId,
      clientSecret: authRuntime.socialProviders.github.clientSecret,
      disableImplicitSignUp: true,
    };
  }

  if (authRuntime.socialProviders.google) {
    socialProviders.google = {
      clientId: authRuntime.socialProviders.google.clientId,
      clientSecret: authRuntime.socialProviders.google.clientSecret,
      disableImplicitSignUp: true,
    };
  }

  return {
    appName: datamixProduct.name,
    basePath: datamixAuthPath,
    ...(options?.baseURL ? { baseURL: options.baseURL } : {}),
    secret: authRuntime.BETTER_AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [env.ADMIN_ORIGIN],
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }, request) => {
        const templateHeader = request?.headers.get("x-datamix-email-template");
        const template = templateHeader === "invite" ? "invite" : "reset-password";
        const inviterName = request?.headers.get("x-datamix-inviter-name");
        const inviteeName = request?.headers.get("x-datamix-invitee-name");
        const emailInput = {
          template,
          appName: datamixProduct.name,
          actionUrl: url,
          recipientEmail: user.email,
          recipientName: inviteeName || user.name || user.email,
          ...(inviterName ? { inviterName } : {}),
        } as const;

        await sendAuthEmail(
          env,
          emailInput,
          [
            { name: "datamix_flow", value: template === "invite" ? "invite" : "password_reset" },
            { name: "datamix_surface", value: "auth" },
          ],
        );
      },
      onPasswordReset: async ({ user }) => {
        await env.DB
          .prepare(
            `
              UPDATE ${quoteIdentifier("user")}
              SET emailVerified = 1, updatedAt = ?
              WHERE id = ?
            `.trim(),
          )
          .bind(new Date().toISOString(), user.id)
          .run();
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          input: false,
          defaultValue: datamixDefaultRoleAssignments.invitedUser,
        },
      },
    },
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
    advanced: {
      backgroundTasks: {
        handler(promise) {
          const executionContext = getExecutionContext();

          if (executionContext) {
            executionContext.waitUntil(promise);
            return;
          }

          void promise;
        },
      },
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
                emailVerified: true,
                role: datamixDefaultRoleAssignments.firstUser,
              },
            };
          },
        },
      },
    },
  };
}

export function createAuth(
  env: ApiBindings,
  options?: {
    baseURL?: string;
  },
) {
  return betterAuth(createAuthOptions(env, options));
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
  const authRuntime = readApiAuthRuntime(env);
  const migration = await runAuthMigrations(env);
  const auth = createAuth(env);
  const context = await auth.$context;
  const userCount = await context.internalAdapter.countTotalUsers();

  return {
    migration,
    oauth: authRuntime.oauth,
    setup: createAuthSetupStatus(userCount),
  };
}
