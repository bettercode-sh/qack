import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  bundle: true,
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
