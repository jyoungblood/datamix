import { fileURLToPath } from "node:url";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const persistStatePath = process.env.DATAMIX_PERSIST_TO?.trim();

export default defineConfig({
  adapter: cloudflare({
    imageService: "cloudflare-binding",
    imagesBindingName: "IMAGES",
    persistState: persistStatePath ? { path: persistStatePath } : undefined,
    prerenderEnvironment: "node",
  }),
  integrations: [react()],
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL(".", import.meta.url)),
      },
    },
  },
});
