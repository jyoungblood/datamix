import { defineConfig } from "drizzle-kit";

export default defineConfig({
  breakpoints: true,
  dialect: "sqlite",
  out: "./drizzle/d1",
  schema: "./apps/web/server/db/schema.ts",
});
