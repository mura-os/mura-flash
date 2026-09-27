import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

const root = path.dirname(fileURLToPath(import.meta.url));
const virtualCatalog = "virtual:mura-recipes";
const resolvedVirtualCatalog = `\0${virtualCatalog}`;

function recipeCatalog() {
  return {
    name: "mura-recipe-catalog",
    resolveId(source) {
      return source === virtualCatalog ? resolvedVirtualCatalog : null;
    },
    load(id) {
      if (id !== resolvedVirtualCatalog) {
        return null;
      }

      const directory = path.join(root, "recipes", "targets");
      const recipes = fs.existsSync(directory)
        ? fs
            .readdirSync(directory)
            .filter((name) => name.endsWith(".json"))
            .sort()
            .map((name) => fs.readFileSync(path.join(directory, name), "utf8"))
        : [];
      return `export default ${JSON.stringify(recipes)};`;
    },
  };
}

const sharedOutput = {
  format: "es",
  sourcemap: true,
  inlineDynamicImports: true,
};

export default {
  input: "src/web/index.ts",
  output: [
    {
      ...sharedOutput,
      file: "dist/mura-flash.mjs",
    },
    {
      ...sharedOutput,
      file: "dist/mura-flash.min.mjs",
      plugins: [
        terser({
          format: {
            comments: /^!|@license|@preserve/,
          },
        }),
      ],
    },
  ],
  plugins: [
    recipeCatalog(),
    json(),
    nodeResolve({ browser: true }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
  ],
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
  },
};
