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
const virtualV1Targets = "virtual:mura-v1-targets";
const virtualV1Procedures = "virtual:mura-v1-procedures";
const virtualV1RawData = "virtual:mura-v1-raw-data";

function jsonFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function schemaDocuments(moduleId, directory, schema) {
  const resolvedId = `\0${moduleId}`;
  return {
    name: moduleId.replaceAll(":", "-"),
    resolveId(source) {
      return source === moduleId ? resolvedId : null;
    },
    load(id) {
      if (id !== resolvedId) {
        return null;
      }
      const documents = jsonFiles(path.join(root, directory))
        .map((name) => fs.readFileSync(name, "utf8"))
        .filter((text) => {
          try {
            return JSON.parse(text).schema === schema;
          } catch {
            return false;
          }
        });
      return `export default ${JSON.stringify(documents)};`;
    },
  };
}

function rawDocuments(moduleId, directories) {
  const resolvedId = `\0${moduleId}`;
  return {
    name: moduleId.replaceAll(":", "-"),
    resolveId(source) {
      return source === moduleId ? resolvedId : null;
    },
    load(id) {
      if (id !== resolvedId) {
        return null;
      }
      const documents = directories
        .flatMap((directory) => jsonFiles(path.join(root, directory)))
        .map((name) => ({
          path: path.relative(root, name).split(path.sep).join("/"),
          text: fs.readFileSync(name, "utf8"),
        }))
        .sort((left, right) =>
          left.path < right.path ? -1 : left.path > right.path ? 1 : 0
        );
      return `export default ${JSON.stringify(documents)};`;
    },
  };
}

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
  sourcemapPathTransform(relativeSourcePath) {
    for (const rootName of ["node_modules/", "vendor/", "src/"]) {
      const index = relativeSourcePath.lastIndexOf(rootName);
      if (index !== -1) {
        return relativeSourcePath.slice(index);
      }
    }
    return relativeSourcePath;
  },
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
    schemaDocuments(
      virtualV1Targets,
      "catalog/targets",
      "org.mura.flash.target-record/v1",
    ),
    schemaDocuments(
      virtualV1Procedures,
      "recipes/procedures",
      "org.mura.flash.install-procedure/v1",
    ),
    rawDocuments(virtualV1RawData, ["catalog", "records", "replay"]),
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
