#!/usr/bin/env bun

import { $ } from "bun";
import { join, resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import { cp } from "fs/promises";

const ROOT = join(import.meta.dir, "..");

const PACKAGES = [
  {
    name: "@ridit/editor-ui",
    dir: join(ROOT, "packages/ui"),
    typesBase: "ui/src",
  },
  {
    name: "@ridit/editor-services",
    dir: join(ROOT, "packages/services"),
    typesBase: "services/src",
  },
];

function readPackageJson(dir: string) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
}

function writePackageJson(dir: string, data: object) {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(data, null, 2) + "\n",
  );
}

function getExternals(pkgDir: string): string[] {
  const pkg = readPackageJson(pkgDir);
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    "monaco-editor/esm/vs/editor/editor.worker?worker",
    "monaco-editor/esm/vs/language/json/json.worker?worker",
    "monaco-editor/esm/vs/language/css/css.worker?worker",
    "monaco-editor/esm/vs/language/html/html.worker?worker",
    "monaco-editor/esm/vs/language/typescript/ts.worker?worker",
    "monaco-editor/esm/vs/editor/standalone/browser/standaloneServices?internal",
    "monaco-editor/esm/vs/editor/common/services/resolverService?internal",
  ];
}

function resolveEntrypoints(pkgDir: string): string[] {
  const pkg = readPackageJson(pkgDir);
  const exports = pkg.exports ?? {};
  const seen = new Set<string>();

  for (const value of Object.values(exports)) {
    const raw =
      typeof value === "string"
        ? value
        : typeof value === "object" && value !== null
          ? (Object.values(value as Record<string, string>)[0] ?? null)
          : null;

    if (!raw?.startsWith("./src/")) continue;

    const abs = resolve(pkgDir, raw);
    if (!seen.has(abs)) seen.add(abs);
  }

  return [...seen];
}

function buildExportsMap(
  pkgDir: string,
  typesBase: string,
): Record<string, object> {
  const pkg = readPackageJson(pkgDir);
  const exports = pkg.exports ?? {};
  const result: Record<string, object> = {};

  for (const [key, value] of Object.entries(exports)) {
    const raw =
      typeof value === "string"
        ? value
        : typeof value === "object" && value !== null
          ? (Object.values(value as Record<string, string>)[0] ?? null)
          : null;

    if (!raw?.startsWith("./src/")) continue;

    const rel = raw.replace("./src/", "").replace(/\.ts$/, "");

    result[key] = {
      import: `./esm/${rel}.js`,
      require: `./cjs/${rel}.js`,
      types: `./types/${typesBase}/${rel}.d.ts`,
    };
  }

  return result;
}

// helper for copying folders
async function copyDir(src: string, dest: string) {
  await cp(src, dest, {
    recursive: true,
    force: true,
  });
}

async function buildPackage(pkg: {
  name: string;
  dir: string;
  typesBase: string;
}) {
  console.log(`\n▶ Building ${pkg.name}...`);

  const outDir = join(pkg.dir, "dist");
  const tsconfigPath = join(pkg.dir, "tsconfig.build.json");

  await $`rm -rf ${outDir}`;
  await $`mkdir -p ${outDir}`;

  const entrypoints = resolveEntrypoints(pkg.dir);
  console.log(
    `  entrypoints: ${entrypoints
      .map((e) => e.replace(pkg.dir, ""))
      .join(", ")}`,
  );

  const externals = getExternals(pkg.dir);

  // --- ESM ---
  console.log(`  → ESM`);
  await Bun.build({
    entrypoints,
    outdir: join(outDir, "esm"),
    format: "esm",
    target: "browser",
    splitting: true,
    sourcemap: "external",
    external: externals,
  });

  // --- CJS ---
  console.log(`  → CJS`);
  await Bun.build({
    entrypoints,
    outdir: join(outDir, "cjs"),
    format: "cjs",
    target: "browser",
    sourcemap: "external",
    external: externals,
  });

  // --- Types ---
  console.log(`  → Types`);
  await $`bunx tsc --project "${tsconfigPath}" --emitDeclarationOnly --declaration --declarationDir "${join(
    outDir,
    "types",
  )}" --noEmit false --noUnusedLocals false --noUnusedParameters false`.cwd(
    pkg.dir,
  );

  // --- dist/package.json ---
  const pkgJson = readPackageJson(pkg.dir);
  const exportsMap = buildExportsMap(pkg.dir, pkg.typesBase);
  const rootExport = exportsMap["."] as any;

  const distPkg = {
    name: pkgJson.name,
    version: pkgJson.version,
    description: pkgJson.description ?? "",
    license: pkgJson.license ?? "MIT",
    author: pkgJson.author ?? "",
    repository: pkgJson.repository ?? {},
    keywords: pkgJson.keywords ?? [],
    type: "module",
    main: rootExport?.require ?? `./cjs/index.js`,
    module: rootExport?.import ?? `./esm/index.js`,
    types: rootExport?.types ?? `./types/${pkg.typesBase}/index.d.ts`,
    exports: exportsMap,
    peerDependencies: pkgJson.peerDependencies ?? {},
    dependencies: pkgJson.dependencies ?? {},
    sideEffects: false,
  };

  writeFileSync(
    join(outDir, "package.json"),
    JSON.stringify(distPkg, null, 2) + "\n",
  );

  // copy README
  try {
    await $`cp ${join(pkg.dir, "README.md")} ${join(outDir, "README.md")}`;
  } catch {}

  // --- copy static CSS (editor-ui only) ---
  if (pkg.name === "@ridit/editor-ui") {
    try {
      await copyDir(
        join(pkg.dir, "src/static-css"),
        join(outDir, "static-css"),
      );
      console.log(`  → static-css copied`);
    } catch (err) {
      console.warn("  ⚠ failed to copy static-css", err);
    }
  }

  console.log(`  ✓ ${pkg.name} built`);
}

// --- CLI ---
const target = process.argv[2];

if (target) {
  const pkg = PACKAGES.find((p) => p.name === target || p.dir.endsWith(target));
  if (!pkg) {
    console.error(`Unknown package: ${target}`);
    process.exit(1);
  }
  await buildPackage(pkg);
} else {
  for (const pkg of PACKAGES) {
    await buildPackage(pkg);
  }
}

console.log("\n✅ Build complete");
