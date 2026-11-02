// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const runtimeRoot = join(root, "scripts");

function collectMjs(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) result.push(...collectMjs(path));
    else if (path.endsWith(".mjs")) result.push(path);
  }
  return result;
}

const files = collectMjs(runtimeRoot).sort();
for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}
console.log(`Syntax check passed for ${files.length} runtime module files.`);
