import { createAuthBaseUrl } from "@datamix/core";
import { createAuthClient } from "better-auth/react";

import { getAdminAppOrigin } from "./runtime";

export type DatamixAuthClient = ReturnType<typeof createAuthClient>;

export const authClient: DatamixAuthClient = createAuthClient({
  baseURL: createAuthBaseUrl(getAdminAppOrigin()),
  fetchOptions: {
    credentials: "include",
  },
});
