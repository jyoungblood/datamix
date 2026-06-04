#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const localAppOrigin =
  process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.APP_ORIGIN ?? "http://127.0.0.1:3000";
const localAppEnv = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? "development";
const appLinkOrigin = toFriendlyLoopbackOrigin(localAppOrigin);

function toFriendlyLoopbackOrigin(origin) {
  const url = new URL(origin);

  if (url.hostname !== "127.0.0.1") {
    return origin;
  }

  return new URL(`${url.protocol}//localhost${url.port ? `:${url.port}` : ""}`).toString();
}

function isAppReadyLine(line) {
  return (
    line.includes("Ready on http://") ||
    line.includes("Local server updated and ready") ||
    line.includes("http://127.0.0.1:3000") ||
    line.includes("http://localhost:3000")
  );
}

function prefixOutput(stream, label) {
  stream?.on("data", (chunk) => {
    const text = chunk.toString();

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trimEnd();

      if (!line) {
        continue;
      }

      process.stdout.write(`[${label}] ${line}\n`);

      if (isAppReadyLine(line)) {
        process.stdout.write(`[datamix] Open ${appLinkOrigin}\n`);
      }
    }
  });
}

function spawnManaged(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  prefixOutput(child.stdout, label);
  prefixOutput(child.stderr, label);

  return child;
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({
        code,
        signal,
      });
    });
  });
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    waitForExit(child),
    new Promise((resolve) => {
      setTimeout(resolve, 5_000);
    }),
  ]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}

async function main() {
  process.stdout.write(`Starting Datamix unified app at ${localAppOrigin}...\n`);

  const appProcess = spawnManaged("app", "npm", ["run", "dev", "--workspace", "@datamix/app"], {
    ...process.env,
    APP_ENV: localAppEnv,
    APP_ORIGIN: localAppOrigin,
    MEDIA_PUBLIC_ORIGIN: process.env.MEDIA_PUBLIC_ORIGIN ?? localAppOrigin,
    NEXT_PUBLIC_APP_ENV: localAppEnv,
    NEXT_PUBLIC_APP_ORIGIN: localAppOrigin,
  });

  let shuttingDown = false;

  const shutdown = async () => {
    await stopChild(appProcess);
  };

  const handleSignal = (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    process.stdout.write(`\nShutting down Datamix unified app after ${signal}...\n`);
    void shutdown().finally(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", () => {
    handleSignal("SIGINT");
  });
  process.once("SIGTERM", () => {
    handleSignal("SIGTERM");
  });

  const result = await waitForExit(appProcess);

  if (!shuttingDown) {
    shuttingDown = true;

    const code =
      typeof result.code === "number" && Number.isInteger(result.code) ? result.code : 1;

    process.exit(code);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
