import { createServiceStatus } from "@datamix/core";
import { APIError } from "better-auth";

import {
  createDatamixApiKey,
  DatamixApiKeyError,
  listDatamixApiKeys,
  revokeDatamixApiKey,
  updateDatamixApiKey,
} from "../api-keys";
import {
  CollectionSchemaError,
  formatCollectionDefinitionResponse,
  getCollectionDefinition,
  listCollectionDefinitions,
  saveCollectionDefinition,
} from "../collections";
import {
  AuthConfigError,
  createPublicApiRuntimeSummary,
  PublicApiConfigError,
  readPublicApiRuntime,
} from "../env";
import { createInvite } from "../invite";
import {
  createMediaAsset,
  listMediaAssets,
  MediaAssetError,
} from "../media";
import {
  CollectionRecordError,
  createCollectionRecord,
  createGeneratedCollectionCrudRoute,
  deleteCollectionRecord,
  getCollectionRecord,
  listCollectionRecords,
  listGeneratedCollectionCrudRoutes,
  updateCollectionRecord,
} from "../records";
import {
  DatamixRoleError,
  listAvailableRoleDefinitions,
  saveCustomRoleDefinition,
} from "../roles";
import {
  DatamixUserError,
  listDatamixUsers,
  updateDatamixUserRole,
} from "../users";
import {
  forbidMissingPermission,
  requireAnyPermission,
  requireEveryPermission,
  requirePermission,
  requireSession,
} from "./admin-auth";
import {
  getDatamixEnv,
  jsonResponse,
  readJsonBody,
  type RouteContext,
  withAdminCors,
} from "./http";
import {
  parseApiKeyRequest,
  parseInviteRequest,
  parseRoleDefinitionRequest,
  parseUserRoleRequest,
} from "./validation";

type IdContext = RouteContext<{
  id: string;
}>;

type NameContext = RouteContext<{
  name: string;
}>;

type NameAndIdContext = RouteContext<{
  id: string;
  name: string;
}>;

function collectionSchemaErrorResponse(error: CollectionSchemaError) {
  return jsonResponse(
    {
      error: error.message,
      issues: error.issues,
    },
    error.statusCode,
  );
}

function collectionRecordErrorResponse(error: CollectionRecordError) {
  return jsonResponse(
    {
      error: error.message,
      issues: error.issues,
    },
    error.statusCode,
  );
}

function roleErrorResponse(error: DatamixRoleError) {
  return jsonResponse(
    {
      error: error.message,
      issues: error.issues,
    },
    error.statusCode,
  );
}

function storedCollectionDefinitionBody(
  collection: NonNullable<Awaited<ReturnType<typeof getCollectionDefinition>>>,
) {
  return {
    createdAt: collection.createdAt,
    definition: collection.definition,
    tableName: collection.tableName,
    updatedAt: collection.updatedAt,
  };
}

function generatedCollectionBody(
  collection: NonNullable<Awaited<ReturnType<typeof getCollectionDefinition>>>,
) {
  return {
    createdAt: collection.createdAt,
    definition: collection.definition,
    routes: createGeneratedCollectionCrudRoute(collection.definition.name),
    tableName: collection.tableName,
    updatedAt: collection.updatedAt,
  };
}

export async function getAdminSession(request: Request) {
  const env = getDatamixEnv();
  const access = await requireSession(request, env);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  return withAdminCors(
    request,
    jsonResponse({
      ...createServiceStatus("api"),
      authorization: access.authorization,
      session: access.session,
    }),
  );
}

export async function createAdminInvite(request: Request) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "users.invite");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const body = await request.json();
  const parsed = parseInviteRequest(body);

  if (!parsed) {
    return withAdminCors(
      request,
      jsonResponse({ error: "A valid invite email is required." }, 400),
    );
  }

  try {
    const invite = await createInvite(env, {
      email: parsed.email,
      ...(parsed.name ? { inviteeName: parsed.name } : {}),
      inviterName: access.session.user.name || access.session.user.email,
      ...(parsed.roleId ? { roleId: parsed.roleId } : {}),
    });

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        invite,
        message: "Invite email queued.",
      }),
    );
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, 503));
    }

    if (error instanceof APIError) {
      return withAdminCors(
        request,
        jsonResponse(
          { error: error.message },
          typeof error.statusCode === "number" ? error.statusCode : 400,
        ),
      );
    }

    throw error;
  }
}

export async function listAdminRoles(request: Request) {
  const env = getDatamixEnv();
  const access = await requireAnyPermission(request, env, [
    "users.read",
    "users.invite",
    "users.update",
    "settings.read",
    "settings.update",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const roles = await listAvailableRoleDefinitions(env);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        roles,
      }),
    );
  } catch (error) {
    if (error instanceof DatamixRoleError) {
      return withAdminCors(request, roleErrorResponse(error));
    }

    throw error;
  }
}

export async function updateAdminRole(request: Request, { params }: IdContext) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "settings.update");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(
    request,
    "Role definition payload must be valid JSON.",
  );

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  const parsed = parseRoleDefinitionRequest(parsedBody.body);

  if (!parsed) {
    return withAdminCors(
      request,
      jsonResponse({ error: "Role definition payload is incomplete." }, 400),
    );
  }

  if (parsed.id !== params.id) {
    return withAdminCors(
      request,
      jsonResponse({ error: "Route role id must match the role definition id." }, 400),
    );
  }

  try {
    const role = await saveCustomRoleDefinition(env, parsed);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        message: "Role definition saved.",
        role,
      }),
    );
  } catch (error) {
    if (error instanceof DatamixRoleError) {
      return withAdminCors(request, roleErrorResponse(error));
    }

    throw error;
  }
}

export async function listAdminUsers(request: Request) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "users.read");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const users = await listDatamixUsers(env);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        users,
      }),
    );
  } catch (error) {
    if (error instanceof DatamixUserError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    throw error;
  }
}

export async function updateAdminUserRole(
  request: Request,
  { params }: IdContext,
) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "users.update");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "User role payload must be valid JSON.");

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  const parsed = parseUserRoleRequest(parsedBody.body);

  if (!parsed) {
    return withAdminCors(
      request,
      jsonResponse({ error: "A valid role id is required." }, 400),
    );
  }

  try {
    const result = await updateDatamixUserRole(env, params.id, parsed.roleId);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        message: "User role updated.",
        role: result.role,
        user: result,
      }),
    );
  } catch (error) {
    if (error instanceof DatamixUserError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    throw error;
  }
}

export async function listAdminApiKeys(request: Request) {
  const env = getDatamixEnv();
  const access = await requireAnyPermission(request, env, [
    "settings.read",
    "settings.update",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const runtime = readPublicApiRuntime(env);
    const apiKeys = await listDatamixApiKeys(env);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        apiKeys,
        runtime: createPublicApiRuntimeSummary(runtime),
      }),
    );
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    if (error instanceof PublicApiConfigError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, 503));
    }

    throw error;
  }
}

export async function createAdminApiKey(request: Request) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "settings.update");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "API key payload must be valid JSON.");

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  const parsed = parseApiKeyRequest(parsedBody.body);

  if (!parsed) {
    return withAdminCors(
      request,
      jsonResponse({ error: "API key label and access level are required." }, 400),
    );
  }

  try {
    const result = await createDatamixApiKey(env, parsed);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        apiKey: result.apiKey,
        message:
          "API key created. Copy the secret now because it will not be shown again.",
        secret: result.secret,
      }),
    );
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    throw error;
  }
}

export async function updateAdminApiKey(request: Request, { params }: IdContext) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "settings.update");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "API key payload must be valid JSON.");

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  const parsed = parseApiKeyRequest(parsedBody.body);

  if (!parsed) {
    return withAdminCors(
      request,
      jsonResponse({ error: "API key label and access level are required." }, 400),
    );
  }

  try {
    const apiKey = await updateDatamixApiKey(env, params.id, parsed);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        apiKey,
        message: "API key updated.",
      }),
    );
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    throw error;
  }
}

export async function revokeAdminApiKey(request: Request, { params }: IdContext) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "settings.update");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const apiKey = await revokeDatamixApiKey(env, params.id);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        apiKey,
        message: apiKey.revokedAt
          ? "API key revoked."
          : "API key update did not complete.",
      }),
    );
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    throw error;
  }
}

export async function listAdminMediaAssets(request: Request) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "media.read");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const assets = await listMediaAssets(env);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        assets,
        message: "Media asset metadata is available.",
      }),
    );
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    throw error;
  }
}

export async function uploadAdminMediaAsset(request: Request) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "media.upload");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return withAdminCors(
      request,
      jsonResponse({ error: "Media upload payload must be multipart/form-data." }, 400),
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return withAdminCors(
      request,
      jsonResponse({ error: "Media upload payload could not be read." }, 400),
    );
  }

  try {
    const result = await createMediaAsset(env, access.session, formData);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        asset: result.asset,
        message: "Media asset uploaded.",
      }),
    );
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, error.statusCode));
    }

    throw error;
  }
}

export async function listAdminCollectionDefinitions(request: Request) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "collections.read");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const collections = await listCollectionDefinitions(env);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collections: collections.map(storedCollectionDefinitionBody),
      }),
    );
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return withAdminCors(request, collectionSchemaErrorResponse(error));
    }

    throw error;
  }
}

export async function getAdminCollectionDefinition(
  request: Request,
  { params }: NameContext,
) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "collections.read");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const collection = await getCollectionDefinition(env, params.name);

    if (!collection) {
      return withAdminCors(
        request,
        jsonResponse({ error: "Collection definition not found." }, 404),
      );
    }

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: storedCollectionDefinitionBody(collection),
      }),
    );
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return withAdminCors(request, collectionSchemaErrorResponse(error));
    }

    throw error;
  }
}

export async function saveAdminCollectionDefinition(
  request: Request,
  { params }: NameContext,
) {
  const env = getDatamixEnv();
  const access = await requireSession(request, env);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(
    request,
    "Collection definition payload must be valid JSON.",
  );

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  const body = parsedBody.body;

  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string" &&
    body.name !== params.name
  ) {
    return withAdminCors(
      request,
      jsonResponse(
        {
          error: "Route collection name must match the definition name.",
        },
        400,
      ),
    );
  }

  try {
    const existingCollection = await getCollectionDefinition(env, params.name);
    const forbiddenResponse = forbidMissingPermission(
      access.authorization,
      existingCollection ? "collections.update" : "collections.create",
    );

    if (forbiddenResponse) {
      return withAdminCors(request, forbiddenResponse);
    }

    const result = await saveCollectionDefinition(env, body);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        ...formatCollectionDefinitionResponse(result),
        message: "Collection definition saved.",
      }),
    );
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return withAdminCors(request, collectionSchemaErrorResponse(error));
    }

    throw error;
  }
}

export async function listAdminCollections(request: Request) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "collections.read");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const collections = await listGeneratedCollectionCrudRoutes(env);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collections,
        message: "Generated collection CRUD routes are available.",
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

export async function getAdminCollection(request: Request, { params }: NameContext) {
  const env = getDatamixEnv();
  const access = await requirePermission(request, env, "collections.read");

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const collection = await getCollectionDefinition(env, params.name);

    if (!collection) {
      return withAdminCors(
        request,
        jsonResponse({ error: "Collection definition not found." }, 404),
      );
    }

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: generatedCollectionBody(collection),
      }),
    );
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return withAdminCors(request, collectionSchemaErrorResponse(error));
    }

    throw error;
  }
}

export async function listAdminCollectionRecords(
  request: Request,
  { params }: NameContext,
) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.read",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const result = await listCollectionRecords(env, params.name);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: generatedCollectionBody(result.collection),
        records: result.records,
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

export async function createAdminCollectionRecord(
  request: Request,
  { params }: NameContext,
) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.create",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "Record payload must be valid JSON.");

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  try {
    const result = await createCollectionRecord(env, params.name, parsedBody.body);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: generatedCollectionBody(result.collection),
        message: "Record created.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

export async function getAdminCollectionRecord(
  request: Request,
  { params }: NameAndIdContext,
) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.read",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const result = await getCollectionRecord(env, params.name, params.id);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: generatedCollectionBody(result.collection),
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

export async function updateAdminCollectionRecord(
  request: Request,
  { params }: NameAndIdContext,
) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.update",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "Record payload must be valid JSON.");

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  try {
    const result = await updateCollectionRecord(
      env,
      params.name,
      params.id,
      parsedBody.body,
    );

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: generatedCollectionBody(result.collection),
        message: "Record updated.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

export async function deleteAdminCollectionRecord(
  request: Request,
  { params }: NameAndIdContext,
) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.delete",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const result = await deleteCollectionRecord(env, params.name, params.id);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: generatedCollectionBody(result.collection),
        deletedRecordId: result.deletedRecordId,
        message: "Record deleted.",
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

function adminRecordCollectionBody(
  collection: NonNullable<Awaited<ReturnType<typeof getCollectionDefinition>>>,
) {
  return {
    createdAt: collection.createdAt,
    definition: collection.definition,
    tableName: collection.tableName,
    updatedAt: collection.updatedAt,
  };
}

export async function listAdminRecords(request: Request, { params }: NameContext) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.read",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  try {
    const result = await listCollectionRecords(env, params.name);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: adminRecordCollectionBody(result.collection),
        records: result.records,
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

export async function createAdminRecord(request: Request, { params }: NameContext) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.create",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "Record payload must be valid JSON.");

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  try {
    const result = await createCollectionRecord(env, params.name, parsedBody.body);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: adminRecordCollectionBody(result.collection),
        message: "Record created.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}

export async function updateAdminRecord(
  request: Request,
  { params }: NameAndIdContext,
) {
  const env = getDatamixEnv();
  const access = await requireEveryPermission(request, env, [
    "collections.read",
    "records.update",
  ]);

  if (!access.success) {
    return withAdminCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "Record payload must be valid JSON.");

  if (!parsedBody.success) {
    return withAdminCors(request, parsedBody.response);
  }

  try {
    const result = await updateCollectionRecord(
      env,
      params.name,
      params.id,
      parsedBody.body,
    );

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        collection: adminRecordCollectionBody(result.collection),
        message: "Record updated.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withAdminCors(request, collectionRecordErrorResponse(error));
    }

    throw error;
  }
}
