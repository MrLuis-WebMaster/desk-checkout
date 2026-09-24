import path from "node:path";
import url from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const src = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  "./src",
);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": src,
    },
  },
  server: {
    port: 5173,
  },
});
