#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const localAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://127.0.0.1:8787";
const localAppEnv = process.env.NEXT_PUBLIC_APP_ENV ?? "development";
const watchAdminAssets = process.env.DATAMIX_ADMIN_WATCH !== "0";
const wranglerPersistTo = process.env.DATAMIX_PERSIST_TO?.trim();
const localAppUrl = new URL(localAppOrigin);
const appLinkOrigin =
  localAppUrl.hostname === "127.0.0.1"
    ? new URL(
        `${localAppUrl.protocol}//localhost${localAppUrl.port ? `:${localAppUrl.port}` : ""}`,
      ).toString()
    : localAppOrigin;
let adminShellRefresh = Promise.resolve();

function isWorkerReadyLine(line) {
  return line.includes("Ready on http://") || line.includes("Local server updated and ready");
}

function isAdminBuildCompleteLine(line) {
  return /built in \d+/i.test(line);
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

      if (label === "worker" && isWorkerReadyLine(line)) {
        process.stdout.write(`[datamix] Open ${appLinkOrigin}\n`);
      }

      if (label === "admin-watch" && isAdminBuildCompleteLine(line)) {
        adminShellRefresh = adminShellRefresh
          .catch(() => undefined)
          .then(() =>
            runStep("admin-shell", "node", ["./scripts/generate-admin-spa-shell.mjs"], process.env),
          )
          .catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`${message}\n`);
          });
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

async function runStep(label, command, args, env) {
  const child = spawnManaged(label, command, args, env);
  const result = await waitForExit(child);

  if (result.code !== 0) {
    throw new Error(`${label} exited with code ${String(result.code)}.`);
  }
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
  const adminEnv = {
    ...process.env,
    NEXT_PUBLIC_APP_ENV: localAppEnv,
    NEXT_PUBLIC_APP_ORIGIN: localAppOrigin,
  };

  process.stdout.write("Building the admin assets for the unified Worker...\n");
  await runStep("admin-build", "npm", ["run", "build", "--workspace", "@datamix/admin"], adminEnv);

  const childProcesses = [
    spawnManaged(
      "worker",
      "npm",
      [
        "run",
        "dev",
        "--workspace",
        "@datamix/api",
        ...(wranglerPersistTo ? ["--", "--persist-to", wranglerPersistTo] : []),
      ],
      {
        ...process.env,
        APP_ORIGIN: localAppOrigin,
      },
    ),
  ];

  if (watchAdminAssets) {
    childProcesses.unshift(
      spawnManaged(
        "admin-watch",
        "npm",
        ["exec", "--workspace", "@datamix/admin", "vite", "build", "--", "--watch", "--mode", "development"],
        adminEnv,
      ),
    );
  } else {
    process.stdout.write("Admin asset watcher disabled for this run.\n");
  }

  const shutdown = async () => {
    await Promise.allSettled(childProcesses.map((child) => stopChild(child)));
  };

  let shuttingDown = false;

  const handleSignal = (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    process.stdout.write(`\nShutting down unified local dev after ${signal}...\n`);
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

  const results = await Promise.race(childProcesses.map((child) => waitForExit(child)));

  if (!shuttingDown) {
    shuttingDown = true;
    await shutdown();

    const code =
      typeof results.code === "number" && Number.isInteger(results.code) ? results.code : 1;

    process.exit(code);
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
