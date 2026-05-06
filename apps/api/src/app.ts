import { createServiceStatus } from "@datamix/core";
import { Hono } from "hono";

import { readApiRuntime, type ApiBindings } from "./env";

export const app = new Hono<{ Bindings: ApiBindings }>();

app.get("/", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
    message: "Datamix API scaffold is ready for Cloudflare runtime wiring.",
  });
});

app.get("/health", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
  });
});
