import { createServiceStatus } from "@datamix/core";

import {
  CollectionRecordError,
  createPublicCollectionCrudRoute,
  deleteCollectionRecord,
  getCollectionRecord,
  getPublicCollectionCrudRoute,
  listCollectionRecords,
  listPublicCollectionCrudRoutes,
  updateCollectionRecord,
  createCollectionRecord,
} from "../records";
import {
  resolvePublicApiAccess,
  type PublicApiPermission,
  type PublicApiPrincipal,
} from "../public-api-auth";
import {
  getDatamixEnv,
  jsonResponse,
  readJsonBody,
  type RouteContext,
  withPublicJsonCors,
} from "./http";

type CollectionContext = RouteContext<{
  name: string;
}>;

type CollectionRecordContext = RouteContext<{
  id: string;
  name: string;
}>;

function formatPublicApiAccess(principal: PublicApiPrincipal) {
  if (principal.type === "api-key") {
    return {
      accessLevel: principal.accessLevel,
      type: principal.type,
    };
  }

  return {
    type: "public" as const,
  };
}

function handleCollectionRecordError(error: CollectionRecordError) {
  return jsonResponse(
    {
      error: error.message,
      issues: error.issues,
    },
    error.statusCode,
  );
}

async function requirePublicAccess(request: Request, permission: PublicApiPermission) {
  const env = getDatamixEnv();
  const access = await resolvePublicApiAccess(env, request.headers, permission);

  if (!access.success) {
    return {
      response: jsonResponse(access.body, access.statusCode),
      success: false as const,
    };
  }

  return {
    env,
    principal: access.principal,
    success: true as const,
  };
}

export async function listPublicCollections(request: Request) {
  const access = await requirePublicAccess(request, "read");

  if (!access.success) {
    return withPublicJsonCors(request, access.response);
  }

  try {
    const collections = await listPublicCollectionCrudRoutes(access.env);

    return withPublicJsonCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(access.principal),
        collections,
        message: "Public collection API routes are available.",
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withPublicJsonCors(request, handleCollectionRecordError(error));
    }

    throw error;
  }
}

export async function getPublicCollection(
  request: Request,
  { params }: CollectionContext,
) {
  const access = await requirePublicAccess(request, "read");

  if (!access.success) {
    return withPublicJsonCors(request, access.response);
  }

  try {
    const collection = await getPublicCollectionCrudRoute(access.env, params.name);

    return withPublicJsonCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(access.principal),
        collection: {
          collectionName: collection.collectionName,
          label: collection.label,
          routes: createPublicCollectionCrudRoute(collection.collectionName),
          supportedFieldNames: collection.supportedFieldNames,
        },
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withPublicJsonCors(request, handleCollectionRecordError(error));
    }

    throw error;
  }
}

export async function listPublicCollectionRecords(
  request: Request,
  { params }: CollectionContext,
) {
  const access = await requirePublicAccess(request, "read");

  if (!access.success) {
    return withPublicJsonCors(request, access.response);
  }

  try {
    const result = await listCollectionRecords(access.env, params.name);

    return withPublicJsonCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(access.principal),
        collection: {
          collectionName: result.collection.definition.name,
          label: result.collection.definition.label,
          routes: createPublicCollectionCrudRoute(result.collection.definition.name),
          supportedFieldNames: result.supportedFieldNames,
        },
        records: result.records,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withPublicJsonCors(request, handleCollectionRecordError(error));
    }

    throw error;
  }
}

export async function createPublicCollectionRecord(
  request: Request,
  { params }: CollectionContext,
) {
  const access = await requirePublicAccess(request, "write");

  if (!access.success) {
    return withPublicJsonCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "Record payload must be valid JSON.");

  if (!parsedBody.success) {
    return withPublicJsonCors(request, parsedBody.response);
  }

  try {
    const result = await createCollectionRecord(access.env, params.name, parsedBody.body);

    return withPublicJsonCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(access.principal),
        collection: {
          collectionName: result.collection.definition.name,
          label: result.collection.definition.label,
          routes: createPublicCollectionCrudRoute(result.collection.definition.name),
          supportedFieldNames: result.supportedFieldNames,
        },
        message: "Record created.",
        record: result.record,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withPublicJsonCors(request, handleCollectionRecordError(error));
    }

    throw error;
  }
}

export async function getPublicCollectionRecord(
  request: Request,
  { params }: CollectionRecordContext,
) {
  const access = await requirePublicAccess(request, "read");

  if (!access.success) {
    return withPublicJsonCors(request, access.response);
  }

  try {
    const result = await getCollectionRecord(access.env, params.name, params.id);

    return withPublicJsonCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(access.principal),
        collection: {
          collectionName: result.collection.definition.name,
          label: result.collection.definition.label,
          routes: createPublicCollectionCrudRoute(result.collection.definition.name),
          supportedFieldNames: result.supportedFieldNames,
        },
        record: result.record,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withPublicJsonCors(request, handleCollectionRecordError(error));
    }

    throw error;
  }
}

export async function updatePublicCollectionRecord(
  request: Request,
  { params }: CollectionRecordContext,
) {
  const access = await requirePublicAccess(request, "write");

  if (!access.success) {
    return withPublicJsonCors(request, access.response);
  }

  const parsedBody = await readJsonBody(request, "Record payload must be valid JSON.");

  if (!parsedBody.success) {
    return withPublicJsonCors(request, parsedBody.response);
  }

  try {
    const result = await updateCollectionRecord(
      access.env,
      params.name,
      params.id,
      parsedBody.body,
    );

    return withPublicJsonCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(access.principal),
        collection: {
          collectionName: result.collection.definition.name,
          label: result.collection.definition.label,
          routes: createPublicCollectionCrudRoute(result.collection.definition.name),
          supportedFieldNames: result.supportedFieldNames,
        },
        message: "Record updated.",
        record: result.record,
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withPublicJsonCors(request, handleCollectionRecordError(error));
    }

    throw error;
  }
}

export async function deletePublicCollectionRecord(
  request: Request,
  { params }: CollectionRecordContext,
) {
  const access = await requirePublicAccess(request, "write");

  if (!access.success) {
    return withPublicJsonCors(request, access.response);
  }

  try {
    const result = await deleteCollectionRecord(access.env, params.name, params.id);

    return withPublicJsonCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(access.principal),
        collection: {
          collectionName: result.collection.definition.name,
          label: result.collection.definition.label,
          routes: createPublicCollectionCrudRoute(result.collection.definition.name),
          supportedFieldNames: result.supportedFieldNames,
        },
        deletedRecordId: result.deletedRecordId,
        message: "Record deleted.",
      }),
    );
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return withPublicJsonCors(request, handleCollectionRecordError(error));
    }

    throw error;
  }
}
