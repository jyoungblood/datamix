import type { DatamixBindings } from "../env";

export type D1StatementRunner =
  | Pick<D1Database, "batch" | "prepare">
  | Pick<D1DatabaseSession, "batch" | "prepare">;

export type D1TableColumnDescription = {
  name: string;
  notnull: 0 | 1;
  pk: 0 | 1;
  type: string;
};

export function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export function createFirstPrimarySession(env: DatamixBindings) {
  return env.DB.withSession("first-primary");
}

export async function readTableColumns(
  database: D1StatementRunner,
  tableName: string,
) {
  const rows = await database
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    .all<D1TableColumnDescription>();

  return rows.results;
}
