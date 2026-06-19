import { asc, eq } from "drizzle-orm";

import type { DatamixBindings } from "../env";
import { createDb } from "./index";
import { datamixRoles } from "./schema";

export type DatamixRoleRow = {
  createdAt: string;
  description: string;
  id: string;
  label: string;
  permissionsJson: string;
  updatedAt: string;
};

export async function listCustomRoleRows(env: DatamixBindings) {
  return createDb(env)
    .select()
    .from(datamixRoles)
    .orderBy(asc(datamixRoles.label), asc(datamixRoles.id));
}

export async function getCustomRoleRow(env: DatamixBindings, roleId: string) {
  const [row] = await createDb(env)
    .select()
    .from(datamixRoles)
    .where(eq(datamixRoles.id, roleId))
    .limit(1);

  return row ?? null;
}

export async function upsertCustomRoleRow(
  env: DatamixBindings,
  row: DatamixRoleRow,
) {
  await createDb(env)
    .insert(datamixRoles)
    .values(row)
    .onConflictDoUpdate({
      set: {
        description: row.description,
        label: row.label,
        permissionsJson: row.permissionsJson,
        updatedAt: row.updatedAt,
      },
      target: datamixRoles.id,
    });
}
