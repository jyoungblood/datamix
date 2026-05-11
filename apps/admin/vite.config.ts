import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import vinext from "vinext";

/**
 * Cloudflare SPA mode serves an empty `#__next` (see generate-admin-spa-shell.mjs).
 * Vinext's pages client entry always calls `hydrateRoot`, which expects SSR markup
 * and triggers React hydration error #418. Use createRoot when the container has
 * no SSR children; keep hydrateRoot when the dev/SSR pipeline pre-filled the DOM.
 */
function vinextSpaHydrationMount(): Plugin {
  return {
    name: "datamix-vinext-spa-hydration-mount",
    generateBundle(_options, bundle) {
      const marker = "[vinext] No __NEXT_DATA__";
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk" || !chunk.isEntry) {
          continue;
        }
        if (!chunk.code.includes(marker) || !chunk.code.includes(".hydrateRoot(")) {
          continue;
        }

        let found = false;
        chunk.code = chunk.code.replace(
          /([\w$.]+)\.hydrateRoot\(([\w$.]+),([\w$.]+)\)/g,
          (_, reactDomNs, container, reactTree) => {
            found = true;
            return `((ctr,jsx,RD)=>{if(!ctr.firstChild){const r=RD.createRoot(ctr);r.render(jsx);return r}return RD.hydrateRoot(ctr,jsx)})(${container},${reactTree},${reactDomNs})`;
          },
        );

        if (!found) {
          this.warn("[datamix-vinext-spa-hydration-mount] hydrateRoot pattern did not match");
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [vinext(), tailwindcss(), vinextSpaHydrationMount()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
