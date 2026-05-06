import { createAuthBaseUrl } from "@datamix/core";
import { createAuthClient } from "better-auth/react";

import { adminPublicEnv } from "./runtime";

export type DatamixAuthClient = ReturnType<typeof createAuthClient>;

export const authClient: DatamixAuthClient = createAuthClient({
  baseURL: createAuthBaseUrl(adminPublicEnv.NEXT_PUBLIC_API_ORIGIN),
  fetchOptions: {
    credentials: "include",
  },
});
