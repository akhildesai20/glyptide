import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      patterns: "src/patterns.ts",
      presets: "src/presets.ts",
      engine: "src/engine-entry.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: "es2020",
    outDir: "dist",
  },
  {
    entry: { glyptide: "src/index.ts" },
    format: ["iife"],
    globalName: "Glyptide",
    dts: false,
    sourcemap: false,
    minify: true,
    target: "es2020",
    outDir: "dist",
    outExtension() {
      return { js: ".iife.js" };
    },
  },
]);
