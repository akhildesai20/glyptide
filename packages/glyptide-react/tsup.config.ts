import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  external: ["react", "react-dom", "glyptide"],
  treeshake: true,
  clean: true,
  target: "es2020",
});
