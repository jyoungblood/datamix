import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Miniflare } from "miniflare";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const apiRoot = path.join(repoRoot, "apps/api");
const adminRoot = path.join(repoRoot, "apps/admin");
const apiPort = 8787;
const adminPort = 3000;
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const adminOrigin = `http://127.0.0.1:${adminPort}`;
const authBaseUrl = `${apiOrigin}/api/auth`;

class CookieJar {
  #cookies = new Map();

  capture(response) {
    const setCookies = [];

    if (typeof response.headers.getSetCookie === "function") {
      setCookies.push(...response.headers.getSetCookie());
    } else {
      for (const [name, value] of response.headers.entries()) {
        if (name.toLowerCase() === "set-cookie") {
          setCookies.push(value);
        }
      }
    }

    for (const cookie of setCookies) {
      const [pair] = cookie.split(";", 1);
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (!name) {
        continue;
      }

      if (value.length === 0) {
        this.#cookies.delete(name);
        continue;
      }

      this.#cookies.set(name, value);
    }
  }

  clear() {
    this.#cookies.clear();
  }

  toHeader() {
    return [...this.#cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

function createManagedProcess(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const lines = [];

  const pushChunk = (chunk, label) => {
    const text = chunk.toString();

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trimEnd();

      if (!line) {
        continue;
      }

      lines.push(`[${options.name}:${label}] ${line}`);

      if (lines.length > 80) {
        lines.shift();
      }
    }
  };

  child.stdout?.on("data", (chunk) => {
    pushChunk(chunk, "stdout");
  });
  child.stderr?.on("data", (chunk) => {
    pushChunk(chunk, "stderr");
  });

  return {
    child,
    name: options.name,
    tail() {
      return lines.slice(-20).join("\n");
    },
  };
}

async function stopManagedProcess(processHandle) {
  if (processHandle.child.exitCode !== null) {
    return;
  }

  processHandle.child.kill("SIGTERM");

  const exited = await Promise.race([
    new Promise((resolve) => {
      processHandle.child.once("exit", () => resolve(true));
    }),
    delay(5_000, false),
  ]);

  if (exited) {
    return;
  }

  processHandle.child.kill("SIGKILL");
  await new Promise((resolve) => {
    processHandle.child.once("exit", () => resolve(undefined));
  });
}

async function waitForUrl(url, options) {
  const timeoutAt = Date.now() + options.timeoutMs;
  let lastError = null;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(url, {
        headers: options.headers,
      });

      if (!response.ok) {
        throw new Error(`Expected ${url} to respond with 2xx, received ${response.status}.`);
      }

      if (options.validateResponse) {
        await options.validateResponse(response.clone());
      }

      return response;
    } catch (error) {
      lastError = error;
      await delay(1_000);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Timed out waiting for ${url}.`);
}

function createExecutionContext() {
  const waitUntilPromises = [];

  return {
    passThroughOnException() {
      return undefined;
    },
    async settle() {
      await Promise.allSettled(waitUntilPromises);
    },
    waitUntil(promise) {
      waitUntilPromises.push(Promise.resolve(promise));
    },
  };
}

async function readJsonResponse(response) {
  const body = (await response.json().catch(() => null)) ?? null;

  return body;
}

async function request(url, options = {}) {
  const headers = new Headers(options.headers);

  if (options.cookieJar) {
    const cookieHeader = options.cookieJar.toHeader();

    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }
  }

  if (options.origin) {
    headers.set("origin", options.origin);
  }

  const response = await fetch(url, {
    body: options.body,
    headers,
    method: options.method ?? "GET",
    redirect: "manual",
  });

  options.cookieJar?.capture(response);

  return response;
}

async function requestJson(url, options = {}) {
  const requestImpl = options.requestImpl ?? request;
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const response = await requestImpl(url, {
    ...options,
    body:
      options.body === undefined || options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body),
    headers,
  });
  const json = await readJsonResponse(response);

  return {
    json,
    response,
  };
}

async function createApiHarness() {
  const [{ app }, { getMediaObject }, { Miniflare: RuntimeMiniflare }] = await Promise.all([
    import(pathToFileURL(path.join(apiRoot, "src/app.ts")).href),
    import(pathToFileURL(path.join(apiRoot, "src/media.ts")).href),
    Promise.resolve({ Miniflare }),
  ]);
  const runtime = new RuntimeMiniflare({
    compatibilityDate: "2026-05-06",
    bindings: {
      ADMIN_ORIGIN: adminOrigin,
      APP_ENV: "development",
      BETTER_AUTH_SECRET: "datamix-smoke-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
      MEDIA_PUBLIC_ORIGIN: apiOrigin,
      PUBLIC_API_READ_ACCESS: "public",
      PUBLIC_API_WRITE_ACCESS: "disabled",
    },
    d1Databases: ["DB"],
    modules: true,
    r2Buckets: ["MEDIA_BUCKET"],
    script: `export default { fetch() { return new Response("miniflare"); } }`,
  });
  const env = await runtime.getBindings();

  return {
    async dispose() {
      await runtime.dispose();
    },
    async readMediaObject(storageKey, url) {
      return getMediaObject(env, storageKey, new URL(url));
    },
    async request(url, options = {}) {
      const headers = new Headers(options.headers);

      if (options.cookieJar) {
        const cookieHeader = options.cookieJar.toHeader();

        if (cookieHeader) {
          headers.set("cookie", cookieHeader);
        }
      }

      if (options.origin) {
        headers.set("origin", options.origin);
      }

      const executionContext = createExecutionContext();
      const response = await app.fetch(
        new Request(url, {
          body: options.body,
          headers,
          method: options.method ?? "GET",
          redirect: "manual",
        }),
        env,
        executionContext,
      );

      await executionContext.settle();
      options.cookieJar?.capture(response);

      return response;
    },
  };
}

function assertOk(response, message) {
  assert.equal(
    response.ok,
    true,
    `${message} (received ${response.status} ${response.statusText})`,
  );
}

function createFixtureImage() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X7n2WQAAAABJRU5ErkJggg==",
    "base64",
  );
}

async function main() {
  const cookieJar = new CookieJar();
  const adminEmail = "smoke-admin@datamix.local";
  const adminPassword = "datamix-smoke-password";
  const apiHarness = await createApiHarness();
  let adminProcess = null;

  try {
    console.log("Starting local admin server for smoke coverage...");
    adminProcess = createManagedProcess(
      "npx",
      ["vinext", "dev", "--port", String(adminPort), "--hostname", "127.0.0.1"],
      {
        cwd: adminRoot,
        env: {
          ...process.env,
          NEXT_PUBLIC_API_ORIGIN: apiOrigin,
          NEXT_PUBLIC_APP_ENV: "development",
          NEXT_PUBLIC_MEDIA_ORIGIN: apiOrigin,
        },
        name: "admin",
      },
    );

    await waitForUrl(adminOrigin, {
      timeoutMs: 120_000,
    });

    const healthResponse = await apiHarness.request(`${apiOrigin}/health`);
    assertOk(healthResponse, "Expected the in-process API health route to load.");
    const healthJson = await readJsonResponse(healthResponse);

    assert.equal(healthJson?.status, "ok");
    assert.equal(healthJson?.surface, "api");

    console.log("Checking first-run readiness...");

    const homeResponse = await request(adminOrigin);
    assertOk(homeResponse, "Expected the admin home page to load.");

    const setupStatusBefore = await requestJson(`${apiOrigin}/setup/status`, {
      requestImpl: apiHarness.request,
    });
    assertOk(setupStatusBefore.response, "Expected /setup/status to load before setup.");
    assert.equal(setupStatusBefore.json?.auth?.setup?.setupRequired, true);
    assert.equal(setupStatusBefore.json?.auth?.setup?.userCount, 0);

    console.log("Creating the first admin account through Better Auth...");

    const signUpResponse = await requestJson(`${authBaseUrl}/sign-up/email`, {
      body: {
        email: adminEmail,
        name: "Smoke Admin",
        password: adminPassword,
        rememberMe: true,
      },
      cookieJar,
      method: "POST",
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assertOk(signUpResponse.response, "Expected the first admin sign-up flow to succeed.");

    const sessionAfterSetup = await requestJson(`${apiOrigin}/session`, {
      cookieJar,
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assertOk(sessionAfterSetup.response, "Expected the first admin session to be active.");
    assert.equal(sessionAfterSetup.json?.session?.user?.email, adminEmail);
    assert.equal(sessionAfterSetup.json?.authorization?.role?.id, "administrator");

    const setupStatusAfter = await requestJson(`${apiOrigin}/setup/status`, {
      requestImpl: apiHarness.request,
    });
    assertOk(setupStatusAfter.response, "Expected /setup/status to load after setup.");
    assert.equal(setupStatusAfter.json?.auth?.setup?.setupRequired, false);
    assert.equal(setupStatusAfter.json?.auth?.setup?.canLogin, true);

    console.log("Verifying normal login after sign-out...");

    const signOutResponse = await requestJson(`${authBaseUrl}/sign-out`, {
      cookieJar,
      method: "POST",
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assertOk(signOutResponse.response, "Expected sign-out to succeed.");
    cookieJar.clear();

    const sessionAfterSignOut = await requestJson(`${apiOrigin}/session`, {
      cookieJar,
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assert.equal(sessionAfterSignOut.response.status, 401);

    const signInResponse = await requestJson(`${authBaseUrl}/sign-in/email`, {
      body: {
        email: adminEmail,
        password: adminPassword,
        rememberMe: true,
      },
      cookieJar,
      method: "POST",
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assertOk(signInResponse.response, "Expected email sign-in to succeed.");

    const sessionAfterSignIn = await requestJson(`${apiOrigin}/session`, {
      cookieJar,
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assertOk(sessionAfterSignIn.response, "Expected the admin session to restore after login.");
    assert.equal(sessionAfterSignIn.json?.session?.user?.email, adminEmail);

    console.log("Saving a smoke collection and record...");

    const collectionDefinition = {
      description: "End-to-end smoke coverage collection.",
      fields: [
        {
          label: "Title",
          name: "title",
          required: true,
          type: "text",
        },
        {
          label: "Body",
          name: "body",
          required: false,
          type: "markdown",
        },
        {
          label: "Hero image",
          name: "hero_image",
          required: false,
          type: "image",
        },
      ],
      label: "Smoke Articles",
      name: "smoke_articles",
    };
    const saveCollectionResponse = await requestJson(
      `${apiOrigin}/collection-definitions/${collectionDefinition.name}`,
      {
        body: collectionDefinition,
        cookieJar,
        method: "PUT",
        origin: adminOrigin,
        requestImpl: apiHarness.request,
      },
    );
    assertOk(saveCollectionResponse.response, "Expected collection save to succeed.");
    assert.equal(saveCollectionResponse.json?.collection?.definition?.name, collectionDefinition.name);

    const listCollectionsResponse = await requestJson(
      `${apiOrigin}/collection-definitions`,
      {
        cookieJar,
        origin: adminOrigin,
        requestImpl: apiHarness.request,
      },
    );
    assertOk(listCollectionsResponse.response, "Expected collection list to load.");
    assert.equal(listCollectionsResponse.json?.collections?.length, 1);

    const createRecordResponse = await requestJson(
      `${apiOrigin}/collections/${collectionDefinition.name}/records`,
      {
        body: {
          values: {
            body: "# Smoke body",
            title: "Smoke article",
          },
        },
        cookieJar,
        method: "POST",
        origin: adminOrigin,
        requestImpl: apiHarness.request,
      },
    );
    assertOk(createRecordResponse.response, "Expected record creation to succeed.");
    const recordId = createRecordResponse.json?.record?.id;

    assert.equal(typeof recordId, "string");

    const listRecordsResponse = await requestJson(
      `${apiOrigin}/collections/${collectionDefinition.name}/records`,
      {
        cookieJar,
        origin: adminOrigin,
        requestImpl: apiHarness.request,
      },
    );
    assertOk(listRecordsResponse.response, "Expected record list to load.");
    assert.equal(listRecordsResponse.json?.records?.length, 1);

    console.log("Uploading media and wiring it into the record...");

    const uploadForm = new FormData();

    uploadForm.set(
      "file",
      new File([createFixtureImage()], "smoke.png", { type: "image/png" }),
    );

    const uploadMediaResponse = await requestJson(`${apiOrigin}/media/assets`, {
      body: uploadForm,
      cookieJar,
      method: "POST",
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assertOk(uploadMediaResponse.response, "Expected media upload to succeed.");
    const uploadedAsset = uploadMediaResponse.json?.asset;

    assert.equal(uploadedAsset?.mimeType, "image/png");

    const listMediaResponse = await requestJson(`${apiOrigin}/media/assets`, {
      cookieJar,
      origin: adminOrigin,
      requestImpl: apiHarness.request,
    });
    assertOk(listMediaResponse.response, "Expected media list to load.");
    assert.equal(listMediaResponse.json?.assets?.length, 1);

    const updateRecordResponse = await requestJson(
      `${apiOrigin}/collections/${collectionDefinition.name}/records/${recordId}`,
      {
        body: {
          values: {
            body: "# Smoke body updated",
            hero_image: uploadedAsset.storageKey,
            title: "Smoke article updated",
          },
        },
        cookieJar,
        method: "PUT",
        origin: adminOrigin,
        requestImpl: apiHarness.request,
      },
    );
    assertOk(updateRecordResponse.response, "Expected record update to succeed.");
    assert.equal(
      updateRecordResponse.json?.record?.values?.hero_image,
      uploadedAsset.storageKey,
    );

    const originalMediaObject = await apiHarness.readMediaObject(
      uploadedAsset.storageKey,
      `${apiOrigin}/media/object/${uploadedAsset.storageKey}`,
    );
    assert.equal(originalMediaObject.contentType, "image/png");
    assert.ok(originalMediaObject.contentLength > 0);

    const transformedMediaObject = await apiHarness.readMediaObject(
      uploadedAsset.storageKey,
      `${apiOrigin}/media/object/${uploadedAsset.storageKey}?width=1&format=webp`,
    );
    assert.equal(transformedMediaObject.contentType, "image/webp");
    assert.ok(transformedMediaObject.contentLength > 0);

    console.log("Checking the public JSON API surface...");

    const publicCollectionsResponse = await requestJson(`${apiOrigin}/api/collections`, {
      requestImpl: apiHarness.request,
    });
    assertOk(
      publicCollectionsResponse.response,
      "Expected the public collections route to load.",
    );
    assert.equal(publicCollectionsResponse.json?.collections?.length, 1);

    const publicCollectionResponse = await requestJson(
      `${apiOrigin}/api/collections/${collectionDefinition.name}`,
      {
        requestImpl: apiHarness.request,
      },
    );
    assertOk(
      publicCollectionResponse.response,
      "Expected the public collection detail route to load.",
    );
    assert.equal(
      publicCollectionResponse.json?.collection?.collectionName,
      collectionDefinition.name,
    );

    const publicRecordsResponse = await requestJson(
      `${apiOrigin}/api/collections/${collectionDefinition.name}/records`,
      {
        requestImpl: apiHarness.request,
      },
    );
    assertOk(
      publicRecordsResponse.response,
      "Expected the public record list route to load.",
    );
    assert.equal(publicRecordsResponse.json?.records?.length, 1);

    const publicRecordResponse = await requestJson(
      `${apiOrigin}/api/collections/${collectionDefinition.name}/records/${recordId}`,
      {
        requestImpl: apiHarness.request,
      },
    );
    assertOk(
      publicRecordResponse.response,
      "Expected the public record detail route to load.",
    );
    assert.equal(
      publicRecordResponse.json?.record?.values?.title,
      "Smoke article updated",
    );

    console.log("Datamix smoke flow completed successfully.");
  } catch (error) {
    if (adminProcess) {
      console.error("\nAdmin log tail:\n" + adminProcess.tail());
    }

    throw error;
  } finally {
    await Promise.allSettled([
      adminProcess ? stopManagedProcess(adminProcess) : Promise.resolve(),
      apiHarness.dispose(),
    ]);
  }
}

await main();
