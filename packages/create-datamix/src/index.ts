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
  adminPagesProjectName: string;
  apiDevName: string;
  apiPreviewName: string;
  apiProductionName: string;
  d1LocalName: string;
  d1PreviewName: string;
  d1ProductionName: string;
  mediaLocalName: string;
  mediaPreviewName: string;
  mediaProductionName: string;
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
    adminPagesProjectName: `${projectSlug}-admin`,
    apiDevName: `${projectSlug}-api-dev`,
    apiPreviewName: `${projectSlug}-api-preview`,
    apiProductionName: `${projectSlug}-api`,
    d1LocalName: `${projectSlug}-local`,
    d1PreviewName: `${projectSlug}-preview`,
    d1ProductionName: `${projectSlug}-production`,
    mediaLocalName: `${projectSlug}-media-local`,
    mediaPreviewName: `${projectSlug}-media-preview`,
    mediaProductionName: `${projectSlug}-media-production`,
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

  const apiWranglerPath = path.join(targetDir, "apps/api/wrangler.jsonc");
  const apiWranglerSource = await readFile(apiWranglerPath, "utf8");
  const apiWranglerCustomized = apiWranglerSource
    .replace('"name": "datamix-api-dev"', `"name": "${names.apiDevName}"`)
    .replace('"database_name": "datamix-local"', `"database_name": "${names.d1LocalName}"`)
    .replace('"preview_database_id": "datamix-local"', `"preview_database_id": "${names.d1LocalName}"`)
    .replace('"bucket_name": "datamix-media-local"', `"bucket_name": "${names.mediaLocalName}"`)
    .replace(
      '"preview_bucket_name": "datamix-media-local"',
      `"preview_bucket_name": "${names.mediaLocalName}"`,
    )
    .replace('"name": "datamix-api-preview"', `"name": "${names.apiPreviewName}"`)
    .replace('"database_name": "datamix-preview"', `"database_name": "${names.d1PreviewName}"`)
    .replace(
      '"bucket_name": "datamix-media-preview"',
      `"bucket_name": "${names.mediaPreviewName}"`,
    )
    .replace(
      '"preview_bucket_name": "datamix-media-preview"',
      `"preview_bucket_name": "${names.mediaPreviewName}"`,
    )
    .replace('"name": "datamix-api"', `"name": "${names.apiProductionName}"`)
    .replace(
      '"database_name": "datamix-production"',
      `"database_name": "${names.d1ProductionName}"`,
    )
    .replace(
      '"bucket_name": "datamix-media-production"',
      `"bucket_name": "${names.mediaProductionName}"`,
    )
    .replace(
      '"preview_bucket_name": "datamix-media-production"',
      `"preview_bucket_name": "${names.mediaProductionName}"`,
    );

  await writeFile(apiWranglerPath, apiWranglerCustomized);

  const pagesConfigPath = path.join(targetDir, "apps/admin/wrangler.pages.jsonc.example");
  const pagesConfigSource = await readFile(pagesConfigPath, "utf8");
  const pagesConfigCustomized = pagesConfigSource.replace(
    '"name": "datamix-admin"',
    `"name": "${names.adminPagesProjectName}"`,
  );

  await writeFile(pagesConfigPath, pagesConfigCustomized);

  const deployDocPath = path.join(targetDir, "docs/deploy-runtime-contract.md");
  const deployDocSource = await readFile(deployDocPath, "utf8");
  const deployDocCustomized = deployDocSource
    .replace("- Pages project: `datamix-admin`", `- Pages project: \`${names.adminPagesProjectName}\``)
    .replace(
      "- API Worker: `datamix-api` with local top-level config and named `preview` / `production` environments",
      `- API Worker: \`${names.apiProductionName}\` with local top-level config and named \`preview\` / \`production\` environments`,
    )
    .replace("- Preview D1 database: `datamix-preview`", `- Preview D1 database: \`${names.d1PreviewName}\``)
    .replace(
      "- Production D1 database: `datamix-production`",
      `- Production D1 database: \`${names.d1ProductionName}\``,
    )
    .replace(
      "- Preview R2 bucket: `datamix-media-preview`",
      `- Preview R2 bucket: \`${names.mediaPreviewName}\``,
    )
    .replace(
      "- Production R2 bucket: `datamix-media-production`",
      `- Production R2 bucket: \`${names.mediaProductionName}\``,
    )
    .replace(
      "1. `npx wrangler d1 create datamix-preview`",
      `1. \`npx wrangler d1 create ${names.d1PreviewName}\``,
    )
    .replace(
      "2. `npx wrangler d1 create datamix-production`",
      `2. \`npx wrangler d1 create ${names.d1ProductionName}\``,
    )
    .replace(
      "3. `npx wrangler r2 bucket create datamix-media-preview`",
      `3. \`npx wrangler r2 bucket create ${names.mediaPreviewName}\``,
    )
    .replace(
      "4. `npx wrangler r2 bucket create datamix-media-production`",
      `4. \`npx wrangler r2 bucket create ${names.mediaProductionName}\``,
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
    console.log(`  npx wrangler d1 create ${input.names.d1PreviewName}`);
    console.log(`  npx wrangler d1 create ${input.names.d1ProductionName}`);
    console.log(`  npx wrangler r2 bucket create ${input.names.mediaPreviewName}`);
    console.log(`  npx wrangler r2 bucket create ${input.names.mediaProductionName}`);
    console.log("  Update apps/api/wrangler.jsonc with the returned IDs and real admin domains.");
    console.log("  Set the matching Pages build env for NEXT_PUBLIC_API_ORIGIN.");
    console.log("  Run npm run typegen:api after editing wrangler.jsonc.");
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
