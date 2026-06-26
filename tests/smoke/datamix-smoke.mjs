import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const appDevVarsPath = path.join(repoRoot, "apps/web/.dev.vars");
const smokePersistPath = `/private/tmp/datamix-smoke-state-${Date.now()}`;
const appPort = 3000;
const appOrigin = `http://127.0.0.1:${appPort}`;
const adminApiOrigin = `${appOrigin}/api/admin`;
const authBaseUrl = `${appOrigin}/api/auth`;

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
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const response = await request(url, {
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

async function requestText(url, options = {}) {
  const response = await request(url, options);
  const text = await response.text();

  return {
    response,
    text,
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

function createMediaObjectUrlPath(storageKey) {
  const encodedStorageKey = storageKey
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/media/object/${encodedStorageKey}`;
}

async function main() {
  const cookieJar = new CookieJar();
  const adminEmail = "smoke-admin@datamix.local";
  const adminPassword = "datamix-smoke-password";
  const smokeAuthSecret =
    process.env.BETTER_AUTH_SECRET ??
    "datamix-smoke-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
  let originalDevVars = null;
  let appProcess = null;

  try {
    try {
      originalDevVars = await readFile(appDevVarsPath, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }

    await writeFile(
      appDevVarsPath,
      [
        "APP_ENV=development",
        `APP_ORIGIN=${appOrigin}`,
        `MEDIA_PUBLIC_ORIGIN=${appOrigin}`,
        "PUBLIC_DATAMIX_APP_ENV=development",
        `PUBLIC_DATAMIX_APP_ORIGIN=${appOrigin}`,
        `BETTER_AUTH_SECRET=${smokeAuthSecret}`,
        "PUBLIC_API_READ_ACCESS=public",
        "PUBLIC_API_WRITE_ACCESS=api-key",
      ].join("\n") + "\n",
    );

    console.log("Starting unified local Datamix app for smoke coverage...");
    appProcess = createManagedProcess(
      "npm",
      ["run", "dev"],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          APP_ORIGIN: appOrigin,
          DATAMIX_PERSIST_TO: smokePersistPath,
          MEDIA_PUBLIC_ORIGIN: appOrigin,
          PUBLIC_DATAMIX_APP_ENV: "development",
          PUBLIC_DATAMIX_APP_ORIGIN: appOrigin,
        },
        name: "app",
      },
    );

    const healthResponse = await waitForUrl(`${appOrigin}/api/health`, {
      timeoutMs: 120_000,
    });
    assertOk(healthResponse, "Expected the in-process API health route to load.");
    const healthJson = await readJsonResponse(healthResponse);

    assert.equal(healthJson?.status, "ok");
    assert.equal(healthJson?.surface, "api");

    console.log("Checking first-run readiness...");

    const homeResponse = await request(appOrigin);
    assertOk(homeResponse, "Expected the admin home page to load.");

    const setupStatusBefore = await requestJson(`${adminApiOrigin}/setup/status`);
    assertOk(setupStatusBefore.response, "Expected /api/admin/setup/status to load before setup.");
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
      origin: appOrigin,
    });
    assertOk(signUpResponse.response, "Expected the first admin sign-up flow to succeed.");

    const sessionAfterSetup = await requestJson(`${adminApiOrigin}/session`, {
      cookieJar,
      origin: appOrigin,
    });
    assertOk(sessionAfterSetup.response, "Expected the first admin session to be active.");
    assert.equal(sessionAfterSetup.json?.session?.user?.email, adminEmail);
    assert.equal(sessionAfterSetup.json?.authorization?.role?.id, "administrator");

    const setupStatusAfter = await requestJson(`${adminApiOrigin}/setup/status`);
    assertOk(setupStatusAfter.response, "Expected /api/admin/setup/status to load after setup.");
    assert.equal(setupStatusAfter.json?.auth?.setup?.setupRequired, false);
    assert.equal(setupStatusAfter.json?.auth?.setup?.canLogin, true);

    console.log("Verifying normal login after sign-out...");

    const signOutResponse = await requestJson(`${authBaseUrl}/sign-out`, {
      body: {},
      cookieJar,
      method: "POST",
      origin: appOrigin,
    });
    assertOk(signOutResponse.response, "Expected sign-out to succeed.");
    cookieJar.clear();

    const sessionAfterSignOut = await requestJson(`${adminApiOrigin}/session`, {
      cookieJar,
      origin: appOrigin,
    });
    assert.equal(sessionAfterSignOut.response.status, 401);

    const unauthorizedProfileUpdate = await requestJson(`${adminApiOrigin}/account`, {
      body: {
        image: "https://example.com/smoke-avatar.png",
        name: "Smoke Admin Updated",
      },
      cookieJar,
      method: "PUT",
      origin: appOrigin,
    });
    assert.equal(unauthorizedProfileUpdate.response.status, 401);

    const signInResponse = await requestJson(`${authBaseUrl}/sign-in/email`, {
      body: {
        email: adminEmail,
        password: adminPassword,
        rememberMe: true,
      },
      cookieJar,
      method: "POST",
      origin: appOrigin,
    });
    assertOk(signInResponse.response, "Expected email sign-in to succeed.");

    const sessionAfterSignIn = await requestJson(`${adminApiOrigin}/session`, {
      cookieJar,
      origin: appOrigin,
    });
    assertOk(sessionAfterSignIn.response, "Expected the admin session to restore after login.");
    assert.equal(sessionAfterSignIn.json?.session?.user?.email, adminEmail);

    const profileUpdateResponse = await requestJson(`${adminApiOrigin}/account`, {
      body: {
        image: "https://example.com/smoke-avatar.png",
        name: "Smoke Admin Updated",
      },
      cookieJar,
      method: "PUT",
      origin: appOrigin,
    });
    assertOk(profileUpdateResponse.response, "Expected profile update to succeed.");
    assert.equal(profileUpdateResponse.json?.user?.id, sessionAfterSignIn.json?.session?.user?.id);
    assert.equal(profileUpdateResponse.json?.user?.email, adminEmail);
    assert.equal(profileUpdateResponse.json?.user?.name, "Smoke Admin Updated");
    assert.equal(profileUpdateResponse.json?.user?.image, "https://example.com/smoke-avatar.png");

    const sessionAfterProfileUpdate = await requestJson(`${adminApiOrigin}/session`, {
      cookieJar,
      origin: appOrigin,
    });
    assertOk(
      sessionAfterProfileUpdate.response,
      "Expected session to remain active after profile update.",
    );
    assert.equal(sessionAfterProfileUpdate.json?.session?.user?.name, "Smoke Admin Updated");
    assert.equal(
      sessionAfterProfileUpdate.json?.session?.user?.image,
      "https://example.com/smoke-avatar.png",
    );

    const crossSiteProfileUpdate = await requestJson(`${adminApiOrigin}/account`, {
      body: {
        image: "https://example.com/cross-site-avatar.png",
        name: "Cross-site Admin Attempt",
      },
      cookieJar,
      method: "PUT",
    });
    assert.equal(crossSiteProfileUpdate.response.status, 403);

    console.log("Checking routed admin workspace pages...");

    const adminHomePage = await requestText(`${appOrigin}/admin`, {
      cookieJar,
      origin: appOrigin,
    });
    assertOk(adminHomePage.response, "Expected the routed admin home page to load.");
    assert.ok(
      adminHomePage.text.includes('data-admin-dashboard-placeholder="overview-v2"') ||
        adminHomePage.text.includes(
          '\\"data-admin-dashboard-placeholder\\":\\"overview-v2\\"',
        ),
      "Expected /admin to render the routed admin dashboard placeholder.",
    );
    assert.doesNotMatch(
      adminHomePage.text,
      /collections-builder|record-editor|inviteSectionId/,
      "Expected /admin to omit retired dashboard section ids.",
    );

    const routedAdminPaths = [
      "/admin/schema",
      "/admin/content",
      "/admin/media",
      "/admin/team",
      "/admin/settings",
      "/admin/account",
    ];

    for (const routedAdminPath of routedAdminPaths) {
      const routedAdminPage = await request(`${appOrigin}${routedAdminPath}`, {
        cookieJar,
        origin: appOrigin,
      });

      assertOk(routedAdminPage, `Expected ${routedAdminPath} to load.`);
    }

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
      `${adminApiOrigin}/collection-definitions/${collectionDefinition.name}`,
      {
        body: collectionDefinition,
        cookieJar,
        method: "PUT",
        origin: appOrigin,
      },
    );
    assertOk(saveCollectionResponse.response, "Expected collection save to succeed.");
    assert.equal(saveCollectionResponse.json?.collection?.definition?.name, collectionDefinition.name);

    const listCollectionsResponse = await requestJson(`${adminApiOrigin}/collection-definitions`, {
      cookieJar,
      origin: appOrigin,
    });
    assertOk(listCollectionsResponse.response, "Expected collection list to load.");
    assert.equal(listCollectionsResponse.json?.collections?.length, 1);

    const createRecordResponse = await requestJson(
      `${adminApiOrigin}/collections/${collectionDefinition.name}/records`,
      {
        body: {
          values: {
            body: "# Smoke body",
            title: "Smoke article",
          },
        },
        cookieJar,
        method: "POST",
        origin: appOrigin,
      },
    );
    assertOk(createRecordResponse.response, "Expected record creation to succeed.");
    const recordId = createRecordResponse.json?.record?.id;

    assert.equal(typeof recordId, "string");

    const listRecordsResponse = await requestJson(
      `${adminApiOrigin}/collections/${collectionDefinition.name}/records`,
      {
        cookieJar,
        origin: appOrigin,
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

    const uploadMediaResponse = await requestJson(`${adminApiOrigin}/media/assets`, {
      body: uploadForm,
      cookieJar,
      method: "POST",
      origin: appOrigin,
    });
    assertOk(uploadMediaResponse.response, "Expected media upload to succeed.");
    const uploadedAsset = uploadMediaResponse.json?.asset;

    assert.equal(uploadedAsset?.mimeType, "image/png");

    const listMediaResponse = await requestJson(`${adminApiOrigin}/media/assets`, {
      cookieJar,
      origin: appOrigin,
    });
    assertOk(listMediaResponse.response, "Expected media list to load.");
    assert.equal(listMediaResponse.json?.assets?.length, 1);

    const updateRecordResponse = await requestJson(
      `${adminApiOrigin}/collections/${collectionDefinition.name}/records/${recordId}`,
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
        origin: appOrigin,
      },
    );
    assertOk(updateRecordResponse.response, "Expected record update to succeed.");
    assert.equal(
      updateRecordResponse.json?.record?.values?.hero_image,
      uploadedAsset.storageKey,
    );

    const originalMediaObject = await request(
      `${appOrigin}${createMediaObjectUrlPath(uploadedAsset.storageKey)}`,
    );
    assertOk(originalMediaObject, "Expected the original media object route to load.");
    assert.equal(originalMediaObject.headers.get("content-type"), "image/png");
    assert.ok((await originalMediaObject.arrayBuffer()).byteLength > 0);

    const transformedMediaObject = await request(
      `${appOrigin}${createMediaObjectUrlPath(uploadedAsset.storageKey)}?width=1&format=webp`,
    );
    assertOk(transformedMediaObject, "Expected the transformed media object route to load.");
    assert.equal(transformedMediaObject.headers.get("content-type"), "image/webp");
    assert.ok((await transformedMediaObject.arrayBuffer()).byteLength > 0);

    console.log("Checking the public JSON API surface...");

    const publicCollectionsResponse = await requestJson(`${appOrigin}/api/collections`);
    assertOk(
      publicCollectionsResponse.response,
      "Expected the public collections route to load.",
    );
    assert.equal(publicCollectionsResponse.json?.collections?.length, 1);

    const publicCollectionResponse = await requestJson(
      `${appOrigin}/api/collections/${collectionDefinition.name}`,
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
      `${appOrigin}/api/collections/${collectionDefinition.name}/records`,
    );
    assertOk(
      publicRecordsResponse.response,
      "Expected the public record list route to load.",
    );
    assert.equal(publicRecordsResponse.json?.records?.length, 1);

    const publicRecordResponse = await requestJson(
      `${appOrigin}/api/collections/${collectionDefinition.name}/records/${recordId}`,
    );
    assertOk(
      publicRecordResponse.response,
      "Expected the public record detail route to load.",
    );
    assert.equal(
      publicRecordResponse.json?.record?.values?.title,
      "Smoke article updated",
    );

    console.log("Checking external API-key record CRUD...");

    const createReadOnlyApiKeyResponse = await requestJson(`${adminApiOrigin}/api-keys`, {
      body: {
        accessLevel: "read",
        label: "Smoke read-only external key",
      },
      cookieJar,
      method: "POST",
      origin: appOrigin,
    });
    assertOk(createReadOnlyApiKeyResponse.response, "Expected read-only API key creation to succeed.");
    const readOnlyApiKeySecret = createReadOnlyApiKeyResponse.json?.secret;

    assert.equal(typeof readOnlyApiKeySecret, "string");

    const createWriteApiKeyResponse = await requestJson(`${adminApiOrigin}/api-keys`, {
      body: {
        accessLevel: "write",
        label: "Smoke write external key",
      },
      cookieJar,
      method: "POST",
      origin: appOrigin,
    });
    assertOk(createWriteApiKeyResponse.response, "Expected write API key creation to succeed.");
    assert.equal(createWriteApiKeyResponse.json?.apiKey?.accessLevel, "write");
    const writeApiKeySecret = createWriteApiKeyResponse.json?.secret;

    assert.equal(typeof writeApiKeySecret, "string");

    const publicRecordsPath = `${appOrigin}/api/collections/${collectionDefinition.name}/records`;
    const readOnlyWriteAttempt = await requestJson(publicRecordsPath, {
      body: {
        values: {
          body: "# Read-only key should not write",
          title: "Read-only external attempt",
        },
      },
      headers: {
        "x-api-key": readOnlyApiKeySecret,
      },
      method: "POST",
    });

    assert.equal(readOnlyWriteAttempt.response.status, 403);
    assert.equal(readOnlyWriteAttempt.json?.error, "API key does not have write access.");

    const externalCreateResponse = await requestJson(publicRecordsPath, {
      body: {
        values: {
          body: "# External API body",
          title: "External API article",
        },
      },
      headers: {
        "x-api-key": writeApiKeySecret,
      },
      method: "POST",
    });
    assertOk(externalCreateResponse.response, "Expected external write-key record creation to succeed.");
    assert.equal(externalCreateResponse.json?.access?.type, "api-key");
    assert.equal(externalCreateResponse.json?.access?.accessLevel, "write");
    assert.equal(
      externalCreateResponse.json?.record?.values?.title,
      "External API article",
    );
    const externalRecordId = externalCreateResponse.json?.record?.id;

    assert.equal(typeof externalRecordId, "string");

    const externalUpdateResponse = await requestJson(
      `${publicRecordsPath}/${externalRecordId}`,
      {
        body: {
          values: {
            body: "# External API body updated",
            title: "External API article updated",
          },
        },
        headers: {
          authorization: `Bearer ${writeApiKeySecret}`,
        },
        method: "PUT",
      },
    );
    assertOk(externalUpdateResponse.response, "Expected external bearer-key record update to succeed.");
    assert.equal(
      externalUpdateResponse.json?.record?.values?.title,
      "External API article updated",
    );

    const externalDeleteResponse = await requestJson(
      `${publicRecordsPath}/${externalRecordId}`,
      {
        headers: {
          "x-api-key": writeApiKeySecret,
        },
        method: "DELETE",
      },
    );
    assertOk(
      externalDeleteResponse.response,
      `Expected external write-key record delete to succeed. Body: ${JSON.stringify(
        externalDeleteResponse.json,
      )}`,
    );
    assert.equal(externalDeleteResponse.json?.deletedRecordId, externalRecordId);

    const externalDeletedRecordResponse = await requestJson(
      `${publicRecordsPath}/${externalRecordId}`,
    );
    assert.equal(externalDeletedRecordResponse.response.status, 404);

    const publicRecordsAfterExternalCrud = await requestJson(publicRecordsPath);
    assertOk(
      publicRecordsAfterExternalCrud.response,
      "Expected public records to load after external CRUD.",
    );
    assert.equal(publicRecordsAfterExternalCrud.json?.records?.length, 1);

    const apiKeysAfterExternalCrud = await requestJson(`${adminApiOrigin}/api-keys`, {
      cookieJar,
      origin: appOrigin,
    });
    assertOk(apiKeysAfterExternalCrud.response, "Expected API key list to load after external CRUD.");
    assert.equal(apiKeysAfterExternalCrud.json?.runtime?.writeAccess, "api-key");
    assert.equal(
      typeof apiKeysAfterExternalCrud.json?.apiKeys?.find(
        (apiKey) => apiKey.label === "Smoke write external key",
      )?.lastUsedAt,
      "string",
    );

    console.log("Datamix smoke flow completed successfully.");
  } catch (error) {
    if (appProcess) {
      console.error("\nApp log tail:\n" + appProcess.tail());
    }

    throw error;
  } finally {
    await Promise.allSettled([appProcess ? stopManagedProcess(appProcess) : Promise.resolve()]);

    if (originalDevVars === null) {
      await rm(appDevVarsPath, { force: true });
    } else {
      await writeFile(appDevVarsPath, originalDevVars);
    }

    await rm(smokePersistPath, { force: true, recursive: true });
  }
}

await main();
