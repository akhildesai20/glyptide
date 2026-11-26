import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: "public",
  resolve: {
    alias: [
      {
        find: "glyptide/styles.css",
        replacement: resolve(
          __dirname,
          "../packages/glyptide/src/styles.css",
        ),
      },
      {
        find: "glyptide/patterns",
        replacement: resolve(
          __dirname,
          "../packages/glyptide/src/patterns.ts",
        ),
      },
      {
        find: /^glyptide$/,
        replacement: resolve(__dirname, "../packages/glyptide/src/index.ts"),
      },
    ],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        forAi: resolve(__dirname, "for-ai.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});
