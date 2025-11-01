import { defineConfig } from "tsup";
import packageJson from "./package.json" assert { type: "json" };

const pkg = packageJson as { version: string };

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cli/index": "src/cli/index.ts"
  },
  format: ["cjs", "esm"],
  sourcemap: true,
  dts: true,
  clean: true,
  minify: false,
  target: "node18",
  shims: false,
  splitting: false,
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  }
});
