import path from "node:path";
import url from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const root = path.dirname(url.fileURLToPath(import.meta.url));
const src = path.resolve(root, "./src");
const contractsSrc = path.resolve(
  root,
  "../../packages/contracts/src/index.ts",
);

export default defineConfig({
  plugins: [tailwindcss(), vue()],
  resolve: {
    alias: {
      "@": src,
      "@checkout/contracts": contractsSrc,
    },
  },
  server: {
    port: 5173,
  },
});
