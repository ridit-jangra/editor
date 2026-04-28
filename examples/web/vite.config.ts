import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    target: "esnext",
    minify: false,
  },
  resolve: {
    alias: {
      "@ridit/editor-ui/static-css": resolve(
        __dirname,
        "../../packages/ui/src/static-css",
      ),
      "@ridit/editor-ui": resolve(__dirname, "../../packages/ui/src/index.ts"),
    },
  },
});
