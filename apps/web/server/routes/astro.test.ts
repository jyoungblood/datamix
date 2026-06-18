import assert from "node:assert/strict";
import test from "node:test";

import type { APIContext } from "astro";

import { createAuthOptions } from "../auth";
import type { DatamixBindings } from "../env";
import {
  defineAstroRequestRoute,
  defineAstroRoute,
  getAstroExecutionContext,
} from "./astro";

function createApiContext(
  request: Request,
  options?: {
    executionContext?: ExecutionContext;
    params?: APIContext["params"];
  },
) {
  return {
    locals: options?.executionContext
      ? {
          cfContext: options.executionContext,
        }
      : {},
    params: options?.params ?? {},
    request,
  } as APIContext;
}

function createDatamixBindings(): DatamixBindings {
  return {
    APP_ENV: "development",
    APP_ORIGIN: "http://localhost:3000",
    AUTH_EMAIL_FROM_EMAIL: "",
    AUTH_EMAIL_FROM_NAME: "",
    AUTH_EMAIL_PROVIDER: "",
    AUTH_EMAIL_REPLY_TO_EMAIL: "",
    AUTH_SMTP_HOST: "",
    AUTH_SMTP_PORT: "",
    AUTH_SMTP_TLS: "",
    BETTER_AUTH_SECRET: "test-secret",
    DB: {} as D1Database,
    IMAGES: {} as ImagesBinding,
    MEDIA_BUCKET: {} as R2Bucket,
    MEDIA_PUBLIC_ORIGIN: "",
    PUBLIC_API_READ_ACCESS: "public",
    PUBLIC_API_WRITE_ACCESS: "disabled",
  };
}

test("defineAstroRoute forwards the request and route params", async () => {
  const request = new Request("http://localhost/api/items/first");
  const route = defineAstroRoute((receivedRequest, context) => {
    assert.equal(receivedRequest, request);
    assert.deepEqual(context.params, {
      id: "first",
    });

    return new Response("created", { status: 201 });
  });

  const response = await route(
    createApiContext(request, {
      params: {
        id: "first",
      },
    }),
  );

  assert.equal(response.status, 201);
  assert.equal(await response.text(), "created");
});

test("defineAstroRequestRoute forwards only the request", async () => {
  const request = new Request("http://localhost/api/health");
  const route = defineAstroRequestRoute((receivedRequest) => {
    assert.equal(receivedRequest, request);
    return Response.json({ ok: true });
  });

  const response = await route(createApiContext(request));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("getAstroExecutionContext reads the Cloudflare context from locals", () => {
  const waited: Promise<unknown>[] = [];
  const executionContext = {
    waitUntil(promise: Promise<unknown>) {
      waited.push(promise);
    },
  } as ExecutionContext;
  const request = new Request("http://localhost/api/health");

  assert.equal(
    getAstroExecutionContext(createApiContext(request, { executionContext })),
    executionContext,
  );
});

test("createAuthOptions sends background tasks to the explicit execution context", () => {
  const waited: Promise<unknown>[] = [];
  const executionContext = {
    waitUntil(promise: Promise<unknown>) {
      waited.push(promise);
    },
  } as ExecutionContext;
  const options = createAuthOptions(createDatamixBindings(), {
    baseURL: "http://localhost:3000",
    executionContext,
  });
  const task = Promise.resolve();

  options.advanced?.backgroundTasks?.handler(task);

  assert.deepEqual(waited, [task]);
});
