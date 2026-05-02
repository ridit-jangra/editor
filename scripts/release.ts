#!/usr/bin/env bun

// WRITTEN BY CLAUDE

import { $ } from "bun";
import { join } from "path";
import { readFileSync, writeFileSync } from "fs";

const ROOT = join(import.meta.dir, "..");

const PACKAGES = [
  { name: "@ridit/editor-ui", dir: join(ROOT, "packages/ui") },
  { name: "@ridit/editor-services", dir: join(ROOT, "packages/services") },
];

type BumpType = "patch" | "minor" | "major";

function bumpVersion(version: string, type: BumpType): string {
  const [major, minor, patch] = version.split(".").map(Number);
  if (type === "major") return `${major! + 1}.0.0`;
  if (type === "minor") return `${major}.${minor! + 1}.0`;
  return `${major}.${minor}.${patch! + 1}`;
}

function readPackageJson(dir: string) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
}

function writePackageJson(dir: string, data: object) {
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(data, null, 2) + "\n",
  );
}

async function releasePackage(
  pkg: { name: string; dir: string },
  bump: BumpType,
  tag: string,
) {
  const pkgJson = readPackageJson(pkg.dir);
  const oldVersion = pkgJson.version;
  const newVersion = bumpVersion(oldVersion, bump);

  console.log(`\n▶ Releasing ${pkg.name}@${newVersion} (was ${oldVersion})`);

  // bump version in package.json
  pkgJson.version = newVersion;
  writePackageJson(pkg.dir, pkgJson);

  // build
  await $`bun run ${join(ROOT, "scripts/build.ts")} ${pkg.name}`;

  // write a dist package.json that points to the right files
  const distPkgJson = {
    name: pkgJson.name,
    version: newVersion,
    description: pkgJson.description ?? "",
    license: pkgJson.license ?? "MIT",
    author: pkgJson.author ?? "",
    repository: pkgJson.repository ?? {},
    keywords: pkgJson.keywords ?? [],
    type: "module",
    main: "./cjs/index.js",
    module: "./esm/index.js",
    types: "./types/index.d.ts",
    exports: {
      ".": {
        import: "./esm/index.js",
        require: "./cjs/index.js",
        types: "./types/index.d.ts",
      },
      // expose sub-paths that exist in exports/
      "./browser": {
        import: "./esm/exports/browser.js",
        require: "./cjs/exports/browser.js",
        types: "./types/exports/browser.d.ts",
      },
      "./workbench": {
        import: "./esm/exports/workbench.js",
        require: "./cjs/exports/workbench.js",
        types: "./types/exports/workbench.d.ts",
      },
    },
    peerDependencies: pkgJson.peerDependencies ?? {},
    sideEffects: false,
  };

  writeFileSync(
    join(pkg.dir, "dist/package.json"),
    JSON.stringify(distPkgJson, null, 2) + "\n",
  );

  // copy readme if it exists
  try {
    await $`cp ${join(pkg.dir, "README.md")} ${join(pkg.dir, "dist/README.md")}`;
  } catch {}

  // publish from dist
  console.log(`  → Publishing to npm with tag: ${tag}`);
  await $`npm publish ${join(pkg.dir, "dist")} --access public --tag ${tag}`;

  // git tag
  const gitTag = `${pkg.name}@${newVersion}`;
  await $`git tag ${gitTag}`;

  console.log(`  ✓ Released ${pkg.name}@${newVersion}`);
  return newVersion;
}

// --- CLI ---
const args = process.argv.slice(2);
const bump = (args.find((a) => ["patch", "minor", "major"].includes(a)) ??
  "patch") as BumpType;
const tag = args.find((a) => a.startsWith("--tag="))?.split("=")[1] ?? "latest";
const only = args.find((a) => a.startsWith("--pkg="))?.split("=")[1];
const dryRun = args.includes("--dry-run");

if (dryRun) {
  console.log("🔍 Dry run — no files will be published or tagged");
}

console.log(`\n🚀 Release`);
console.log(`   bump: ${bump}`);
console.log(`   tag:  ${tag}`);
if (only) console.log(`   pkg:  ${only}`);

const targets = only
  ? PACKAGES.filter((p) => p.name === only || p.dir.endsWith(only))
  : PACKAGES;

if (targets.length === 0) {
  console.error(`No matching package for: ${only}`);
  process.exit(1);
}

for (const pkg of targets) {
  if (dryRun) {
    const pkgJson = readPackageJson(pkg.dir);
    const next = bumpVersion(pkgJson.version, bump);
    console.log(`\n  [dry-run] ${pkg.name}: ${pkgJson.version} → ${next}`);
  } else {
    await releasePackage(pkg, bump, tag);
  }
}

if (!dryRun) {
  console.log("\n📌 Pushing git tags...");
  await $`git push --tags`;
}

console.log("\n✅ Release complete");
