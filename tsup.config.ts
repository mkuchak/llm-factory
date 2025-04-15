import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  treeshake: true,
  target: "es2020",
  outDir: "dist",
  platform: "node",
  skipNodeModulesBundle: true,
  external: ["openai", "@anthropic-ai/sdk", "@google/generative-ai"],
});
