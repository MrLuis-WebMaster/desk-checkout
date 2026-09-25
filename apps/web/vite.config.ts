import path from "node:path";
import url from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

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
  test: {
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.vue",
        "src/main.ts",
        "src/vite-env.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/**/composition/index.ts",
        "src/**/infrastructure/http-*.ts",
        "src/**/infrastructure/wompi-browser.ts",
      ],
    },
  },
});
