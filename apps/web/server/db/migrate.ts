import {
  datamixApiKeysTableName,
  datamixCollectionDefinitionsTableName,
  datamixMediaAssetsTableName,
  datamixRolesTableName,
} from "@datamix/core";

import type { DatamixBindings } from "../env";
import { quoteIdentifier } from "./d1-dialect";

type TableRow = {
  name: string;
};

type ColumnRow = {
  name: string;
};

const fixedTableNames = [
  "user",
  "session",
  "account",
  "verification",
  datamixRolesTableName,
  datamixApiKeysTableName,
  datamixMediaAssetsTableName,
  datamixCollectionDefinitionsTableName,
] as const;

async function listExistingTables(database: D1Database) {
  const rows = await database
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name IN (${fixedTableNames.map(() => "?").join(", ")})
      `.trim(),
    )
    .bind(...fixedTableNames)
    .all<TableRow>();

  return new Set(rows.results.map((row) => row.name));
}

async function listTableColumns(database: D1Database, tableName: string) {
  const rows = await database
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    .all<ColumnRow>();

  return new Set(rows.results.map((row) => row.name));
}

const createFixedSchemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL,
      "emailVerified" integer NOT NULL,
      "image" text,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL,
      "role" text
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email")`,
  `
    CREATE TABLE IF NOT EXISTS "session" (
      "id" text PRIMARY KEY NOT NULL,
      "expiresAt" integer NOT NULL,
      "token" text NOT NULL,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL,
      "ipAddress" text,
      "userAgent" text,
      "userId" text NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token")`,
  `CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId")`,
  `
    CREATE TABLE IF NOT EXISTS "account" (
      "id" text PRIMARY KEY NOT NULL,
      "accountId" text NOT NULL,
      "providerId" text NOT NULL,
      "userId" text NOT NULL,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" integer,
      "refreshTokenExpiresAt" integer,
      "scope" text,
      "password" text,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON UPDATE no action ON DELETE cascade
    )
  `,
  `CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId")`,
  `
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text PRIMARY KEY NOT NULL,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expiresAt" integer NOT NULL,
      "createdAt" integer NOT NULL,
      "updatedAt" integer NOT NULL
    )
  `,
  `CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`,
  `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixRolesTableName)} (
      "id" TEXT PRIMARY KEY,
      "label" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "permissions_json" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixApiKeysTableName)} (
      "id" TEXT PRIMARY KEY,
      "label" TEXT NOT NULL,
      "access_level" TEXT NOT NULL,
      "secret_hash" TEXT NOT NULL UNIQUE,
      "secret_preview" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      "last_used_at" TEXT,
      "revoked_at" TEXT
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "dmx_api_keys_secret_hash_unique" ON ${quoteIdentifier(datamixApiKeysTableName)} ("secret_hash")`,
  `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixMediaAssetsTableName)} (
      "id" TEXT PRIMARY KEY,
      "file_name" TEXT NOT NULL,
      "mime_type" TEXT NOT NULL,
      "byte_size" INTEGER NOT NULL,
      "storage_key" TEXT NOT NULL UNIQUE,
      "uploaded_by_user_id" TEXT,
      "uploaded_by_user_email" TEXT,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "dmx_media_assets_storage_key_unique" ON ${quoteIdentifier(datamixMediaAssetsTableName)} ("storage_key")`,
  `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixCollectionDefinitionsTableName)} (
      "name" TEXT PRIMARY KEY,
      "label" TEXT NOT NULL,
      "description" TEXT,
      "schema_json" TEXT NOT NULL,
      "table_name" TEXT NOT NULL UNIQUE,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS "dmx_collections_table_name_unique" ON ${quoteIdentifier(datamixCollectionDefinitionsTableName)} ("table_name")`,
].map((statement) => statement.trim());

async function ensureUserRoleColumn(database: D1Database) {
  const columns = await listTableColumns(database, "user");

  if (columns.has("role")) {
    return false;
  }

  await database.prepare(`ALTER TABLE "user" ADD COLUMN "role" text`).run();

  return true;
}

export async function bootstrapFixedSchema(env: DatamixBindings) {
  const existingTables = await listExistingTables(env.DB);

  await env.DB.batch(
    createFixedSchemaStatements.map((statement) => env.DB.prepare(statement)),
  );

  const alteredTables = (await ensureUserRoleColumn(env.DB)) ? ["user"] : [];

  return {
    alteredTables,
    createdTables: fixedTableNames.filter((tableName) => !existingTables.has(tableName)),
  };
}
