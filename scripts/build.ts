// WRITTEN BY CLAUDE

import { $ } from "bun";
import { join, resolve } from "path";
import { readFileSync, writeFileSync } from "fs";

const ROOT = join(import.meta.dir, "..");

const PACKAGES = [
  { name: "@ridit/editor-ui", dir: join(ROOT, "packages/ui") },
  { name: "@ridit/editor-services", dir: join(ROOT, "packages/services") },
];

function readPackageJson(dir: string) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
}

function getExternals(pkgDir: string): string[] {
  const pkg = readPackageJson(pkgDir);
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ];
}

function resolveEntrypoints(pkgDir: string): string[] {
  const pkg = readPackageJson(pkgDir);
  const exports = pkg.exports ?? {};
  const seen = new Set<string>();

  for (const value of Object.values(exports)) {
    // value can be a string or { default: string, ... }
    const raw =
      typeof value === "string"
        ? value
        : typeof value === "object" && value !== null
          ? Object.values(value as Record<string, string>)[0]
          : null;

    if (!raw) continue;

    // only include local ts src files
    if (!raw.startsWith("./src/")) continue;

    const abs = resolve(pkgDir, raw);
    if (!seen.has(abs)) seen.add(abs);
  }

  return [...seen];
}

function buildExportsMap(pkgDir: string, outDir: string) {
  const pkg = readPackageJson(pkgDir);
  const exports = pkg.exports ?? {};
  const result: Record<string, object> = {};

  for (const [key, value] of Object.entries(exports)) {
    const raw =
      typeof value === "string"
        ? value
        : typeof value === "object" && value !== null
          ? Object.values(value as Record<string, string>)[0]
          : null;

    if (!raw?.startsWith("./src/")) continue;

    // ./src/exports/browser.ts → exports/browser
    const rel = raw.replace("./src/", "").replace(/\.ts$/, "");

    result[key] = {
      import: `./${join("esm", rel)}.js`,
      require: `./${join("cjs", rel)}.js`,
      types: `./${join("types", rel)}.d.ts`,
    };
  }

  return result;
}

async function buildPackage(pkg: { name: string; dir: string }) {
  console.log(`\n▶ Building ${pkg.name}...`);

  const outDir = join(pkg.dir, "dist");
  const srcDir = join(pkg.dir, "src");
  const tsconfigPath = join(pkg.dir, "tsconfig.build.json");

  await $`rm -rf ${outDir}`;
  await $`mkdir -p ${outDir}`;

  const entrypoints = resolveEntrypoints(pkg.dir);
  console.log(
    `  entrypoints: ${entrypoints.map((e) => e.replace(pkg.dir, "")).join(", ")}`,
  );

  // --- ESM ---
  console.log(`  → ESM`);
  await Bun.build({
    entrypoints,
    outdir: join(outDir, "esm"),
    format: "esm",
    target: "browser",
    splitting: true,
    sourcemap: "external",
    external: getExternals(pkg.dir),
  });

  // --- CJS ---
  console.log(`  → CJS`);
  await Bun.build({
    entrypoints,
    outdir: join(outDir, "cjs"),
    format: "cjs",
    target: "browser",
    sourcemap: "external",
    external: getExternals(pkg.dir),
  });

  // --- Types ---
  console.log(`  → Types`);
  await $`bunx tsc --project ${tsconfigPath} --emitDeclarationOnly --declaration --declarationDir ${join(outDir, "types")} --noEmit false --noUnusedLocals false --noUnusedParameters false`.cwd(
    pkg.dir,
  );

  // --- dist/package.json ---
  const pkgJson = readPackageJson(pkg.dir);
  const exportsMap = buildExportsMap(pkg.dir, outDir);

  // find the root entrypoint (the "." export)
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
    main: rootExport?.require ?? "./cjs/index.js",
    module: rootExport?.import ?? "./esm/index.js",
    types: rootExport?.types ?? "./types/index.d.ts",
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
