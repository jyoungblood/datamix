#!/usr/bin/env node

import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

type CliOptions = {
  deploy: boolean;
  install: boolean;
  projectDir: string | null;
};

type ProjectNames = {
  appName: string;
  d1Name: string;
  mediaName: string;
  packageName: string;
  projectSlug: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const templateRoot = path.join(packageRoot, "dist", "template");

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.projectDir) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await ensureTemplateExists();

  const targetDir = path.resolve(process.cwd(), options.projectDir);
  const targetParentDir = path.dirname(targetDir);
  const projectBasename = path.basename(targetDir);
  const names = createProjectNames(projectBasename);

  await ensureTargetDirIsAvailable(targetDir);
  await mkdir(targetParentDir, { recursive: true });
  await cp(templateRoot, targetDir, { recursive: true });
  await customizeTemplate(targetDir, names);

  let installSucceeded = false;

  if (options.install) {
    installSucceeded = await installDependencies(targetDir);
  }

  printSuccessMessage({
    installAttempted: options.install,
    installSucceeded,
    options,
    targetDir,
    names,
  });
}

function parseArgs(args: string[]): CliOptions {
  let deploy = false;
  let install = true;
  let projectDir: string | null = null;

  for (const argument of args) {
    if (argument === "--help" || argument === "-h") {
      printUsage();
      process.exit(0);
    }

    if (argument === "--deploy") {
      deploy = true;
      continue;
    }

    if (argument === "--no-install") {
      install = false;
      continue;
    }

    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }

    if (projectDir) {
      throw new Error("Only one project directory may be provided.");
    }

    projectDir = argument;
  }

  return {
    deploy,
    install,
    projectDir,
  };
}

function printUsage() {
  console.log(`Usage: create-datamix <project-directory> [--deploy] [--no-install]

Options:
  --deploy      Print Cloudflare provisioning next steps after scaffolding.
  --no-install  Skip npm install after files are created.
  --help        Show this help message.`);
}

async function ensureTemplateExists() {
  try {
    const templateStats = await stat(templateRoot);

    if (!templateStats.isDirectory()) {
      throw new Error("Template output is not a directory.");
    }
  } catch {
    throw new Error(
      "The create-datamix template has not been built yet. Run `npm run build --workspace create-datamix` first.",
    );
  }
}

function createProjectNames(projectDirName: string): ProjectNames {
  const rawSlug = projectDirName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const projectSlug = rawSlug.length > 0 ? rawSlug : "datamix-project";

  return {
    appName: `${projectSlug}-app`,
    d1Name: `${projectSlug}-db`,
    mediaName: `${projectSlug}-media`,
    packageName: projectSlug,
    projectSlug,
  };
}

async function ensureTargetDirIsAvailable(targetDir: string) {
  try {
    const existingEntries = await readdir(targetDir);

    if (existingEntries.length > 0) {
      throw new Error(
        `Target directory already exists and is not empty: ${path.relative(process.cwd(), targetDir)}`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function customizeTemplate(targetDir: string, names: ProjectNames) {
  const rootPackagePath = path.join(targetDir, "package.json");
  const rootPackageJson = JSON.parse(await readFile(rootPackagePath, "utf8")) as {
    name?: string;
  };

  rootPackageJson.name = names.packageName;

  await writeFile(rootPackagePath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

  const appWranglerPath = path.join(targetDir, "apps/web/wrangler.jsonc");
  const appWranglerSource = await readFile(appWranglerPath, "utf8");
  const appWranglerCustomized = appWranglerSource
    .replace('"name": "datamix-app"', `"name": "${names.appName}"`)
    .replace('"database_name": "datamix-db"', `"database_name": "${names.d1Name}"`)
    .replace('"bucket_name": "datamix-media"', `"bucket_name": "${names.mediaName}"`);

  await writeFile(appWranglerPath, appWranglerCustomized);

  const deployDocPath = path.join(targetDir, "docs/deploy-runtime-contract.md");
  const deployDocSource = await readFile(deployDocPath, "utf8");
  const deployDocCustomized = deployDocSource
    .replace("- App Worker: `datamix-app`", `- App Worker: \`${names.appName}\``)
    .replace("- D1 database: `datamix-db`", `- D1 database: \`${names.d1Name}\``)
    .replace("- R2 bucket: `datamix-media`", `- R2 bucket: \`${names.mediaName}\``)
    .replace(
      "1. `npx wrangler d1 create datamix-db`",
      `1. \`npx wrangler d1 create ${names.d1Name}\``,
    )
    .replace(
      "2. `npx wrangler r2 bucket create datamix-media`",
      `2. \`npx wrangler r2 bucket create ${names.mediaName}\``,
    );

  await writeFile(deployDocPath, deployDocCustomized);
}

async function installDependencies(targetDir: string) {
  console.log("Installing workspace dependencies with npm...");

  return new Promise<boolean>((resolve) => {
    const child = spawn("npm", ["install"], {
      cwd: targetDir,
      stdio: "inherit",
    });

    child.once("exit", (code) => {
      resolve(code === 0);
    });
    child.once("error", () => {
      resolve(false);
    });
  });
}

function printSuccessMessage(input: {
  installAttempted: boolean;
  installSucceeded: boolean;
  options: CliOptions;
  targetDir: string;
  names: ProjectNames;
}) {
  const targetDirDisplay = formatDisplayPath(input.targetDir);

  console.log("");
  console.log(`Datamix scaffolded at ${targetDirDisplay}.`);

  if (input.installAttempted) {
    if (input.installSucceeded) {
      console.log("Dependencies are installed.");
    } else {
      console.log("Dependency install did not finish cleanly. You can rerun `npm install` inside the project.");
    }
  } else {
    console.log("Dependencies were not installed because `--no-install` was passed.");
  }

  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${shellEscape(targetDirDisplay)}`);

  if (!input.installAttempted || !input.installSucceeded) {
    console.log("  npm install");
  }

  console.log("  npm run check");
  console.log("  npm run build");
  console.log("  npm run smoke");

  if (input.options.deploy) {
    console.log("");
    console.log("Deploy-oriented next steps:");
    console.log(`  npx wrangler d1 create ${input.names.d1Name}`);
    console.log(`  npx wrangler r2 bucket create ${input.names.mediaName}`);
    console.log("  Update apps/web/wrangler.jsonc with the returned D1 ID and real app domain.");
    console.log("  Run npm run typegen after editing wrangler.jsonc.");
    console.log("  Run npm run db:migrate:remote and npm run deploy when the config is ready.");
    console.log("");
    console.log("The browser-first deploy flow remains the primary v0 onboarding path.");
  }
}

function shellEscape(value: string) {
  if (/^[A-Za-z0-9_./-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function formatDisplayPath(targetDir: string) {
  const relativeTargetDir = path.relative(process.cwd(), targetDir);

  if (
    relativeTargetDir.length === 0 ||
    relativeTargetDir === "." ||
    (!relativeTargetDir.startsWith("..") && !path.isAbsolute(relativeTargetDir))
  ) {
    return relativeTargetDir || ".";
  }

  return targetDir;
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
