import { asc, eq } from "drizzle-orm";

import type { DatamixBindings } from "../env";
import { createDb } from "./index";
import { user } from "./schema";

export type DatamixUserRow = {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  role: string | null;
  updatedAt: Date;
};

export async function listUserRows(env: DatamixBindings) {
  return createDb(env)
    .select({
      createdAt: user.createdAt,
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      name: user.name,
      role: user.role,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt), asc(user.email));
}

export async function getUserRow(env: DatamixBindings, userId: string) {
  const [row] = await createDb(env)
    .select({
      createdAt: user.createdAt,
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      name: user.name,
      role: user.role,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? null;
}

export async function updateUserRoleRow(
  env: DatamixBindings,
  input: {
    roleId: string;
    updatedAt: Date;
    userId: string;
  },
) {
  await createDb(env)
    .update(user)
    .set({
      role: input.roleId,
      updatedAt: input.updatedAt,
    })
    .where(eq(user.id, input.userId));
}
