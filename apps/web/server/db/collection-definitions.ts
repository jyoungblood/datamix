import { asc, eq } from "drizzle-orm";

import type { DatamixBindings } from "../env";
import { createDb } from "./index";
import { datamixCollections } from "./schema";

export type CollectionDefinitionRow = {
  createdAt: string;
  description: string | null;
  label: string;
  name: string;
  schemaJson: string;
  tableName: string;
  updatedAt: string;
};

export async function listCollectionDefinitionRows(env: DatamixBindings) {
  return createDb(env)
    .select()
    .from(datamixCollections)
    .orderBy(asc(datamixCollections.label), asc(datamixCollections.name));
}

export async function getCollectionDefinitionRow(
  env: DatamixBindings,
  name: string,
) {
  const [row] = await createDb(env)
    .select()
    .from(datamixCollections)
    .where(eq(datamixCollections.name, name))
    .limit(1);

  return row ?? null;
}
