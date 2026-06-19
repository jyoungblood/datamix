import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type RouteExpectation = {
  methods: string[];
  route: string;
};

const routeExpectations: RouteExpectation[] = [
  {
    methods: ["GET", "OPTIONS"],
    route: "media/object/[...storageKey].ts",
  },
  {
    methods: ["GET", "OPTIONS"],
    route: "collections.ts",
  },
  {
    methods: ["GET", "OPTIONS"],
    route: "collections/[name].ts",
  },
  {
    methods: ["GET", "POST", "OPTIONS"],
    route: "collections/[name]/records.ts",
  },
  {
    methods: ["GET", "PUT", "DELETE", "OPTIONS"],
    route: "collections/[name]/records/[id].ts",
  },
  {
    methods: ["GET", "OPTIONS"],
    route: "admin/collections.ts",
  },
  {
    methods: ["GET", "OPTIONS"],
    route: "admin/collections/[name].ts",
  },
  {
    methods: ["GET", "POST", "OPTIONS"],
    route: "admin/collections/[name]/records.ts",
  },
  {
    methods: ["GET", "PUT", "DELETE", "OPTIONS"],
    route: "admin/collections/[name]/records/[id].ts",
  },
  {
    methods: ["GET", "OPTIONS"],
    route: "admin/collection-definitions.ts",
  },
  {
    methods: ["GET", "PUT", "OPTIONS"],
    route: "admin/collection-definitions/[name].ts",
  },
  {
    methods: ["GET", "POST", "OPTIONS"],
    route: "admin/records/[name].ts",
  },
  {
    methods: ["PUT", "OPTIONS"],
    route: "admin/records/[name]/[id].ts",
  },
  {
    methods: ["GET", "POST", "OPTIONS"],
    route: "admin/media/assets.ts",
  },
  {
    methods: ["GET", "OPTIONS"],
    route: "admin/users.ts",
  },
  {
    methods: ["PUT", "OPTIONS"],
    route: "admin/users/[id]/role.ts",
  },
  {
    methods: ["GET", "OPTIONS"],
    route: "admin/roles.ts",
  },
  {
    methods: ["PUT", "OPTIONS"],
    route: "admin/roles/[id].ts",
  },
  {
    methods: ["GET", "POST", "OPTIONS"],
    route: "admin/api-keys.ts",
  },
  {
    methods: ["PUT", "OPTIONS"],
    route: "admin/api-keys/[id].ts",
  },
  {
    methods: ["POST", "OPTIONS"],
    route: "admin/api-keys/[id]/revoke.ts",
  },
  {
    methods: ["POST", "OPTIONS"],
    route: "admin/invites.ts",
  },
  {
    methods: ["PUT", "OPTIONS"],
    route: "admin/account.ts",
  },
];

const pagesApiDirectory = path.resolve("apps/web/src/pages/api");

test("Slice 3 Astro API route inventory matches the planned endpoints", async () => {
  await Promise.all(
    routeExpectations.map(async ({ methods, route }) => {
      const routePath = path.join(pagesApiDirectory, route);
      const source = await readFile(routePath, "utf8");

      for (const method of methods) {
        assert.match(
          source,
          new RegExp(`export\\s+const\\s+${method}\\b`),
          `${route} should export ${method}`,
        );
      }
    }),
  );
});
