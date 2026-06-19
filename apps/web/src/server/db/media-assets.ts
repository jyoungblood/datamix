import { desc } from "drizzle-orm";

import type { DatamixBindings } from "../env";
import { createDb } from "./index";
import { datamixMediaAssets } from "./schema";

export type DatamixMediaAssetRow = {
  byteSize: number;
  createdAt: string;
  fileName: string;
  id: string;
  mimeType: string;
  storageKey: string;
  updatedAt: string;
  uploadedByUserEmail: string | null;
  uploadedByUserId: string | null;
};

export async function listMediaAssetRows(env: DatamixBindings, limit = 50) {
  return createDb(env)
    .select()
    .from(datamixMediaAssets)
    .orderBy(desc(datamixMediaAssets.createdAt), desc(datamixMediaAssets.id))
    .limit(limit);
}

export async function insertMediaAssetRow(
  env: DatamixBindings,
  row: DatamixMediaAssetRow,
) {
  await createDb(env).insert(datamixMediaAssets).values(row);
}
