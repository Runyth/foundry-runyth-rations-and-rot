// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
// Source notice, licence, and publication hygiene for Runyth Rations & Rot.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = (name) => path.join(root, name);
const read = (name) => readFileSync(repo(name), "utf8");

function everyProgramFile(directory) {
  const rows = readdirSync(repo(directory), { withFileTypes: true });
  const files = [];
  for (const row of rows) {
    const absolute = path.join(repo(directory), row.name);
    if (row.isDirectory()) files.push(...everyProgramFile(`${directory}/${row.name}`));
    else if (row.name.endsWith(".mjs")) files.push(`${directory}/${row.name}`);
  }
  return files;
}

test("every program file starts with the standard two-line source notice", () => {
  const files = [...everyProgramFile("scripts"), ...everyProgramFile("tooling"), ...everyProgramFile("tools"), ...everyProgramFile("tests")];
  assert.ok(files.length > 0);
  const holder = ["// SPDX-License-Identifier: AGPL-3.0-or-later", "// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations."];
  const holderFragment = ["// Copyright (C) 2026 Daniel ", "Brani", "ewski. See the LICENSE file for rights and obligations."].join("");
  for (const file of files) {
    const lines = read(file).split("\n");
    assert.deepEqual(lines.slice(0, 2), holder, `${file} carries the source notice`);
    assert.ok(lines[1].startsWith(holderFragment), `${file} notice holder`);
  }
});

test("every python tool carries the python-form notice after its shebang", () => {
  const pyNotice = "# SPDX-License-Identifier: AGPL-3.0-or-later\n# Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.\n";
  for (const file of readdirSync(repo("tooling")).filter((name) => name.endsWith(".py"))) {
    const text = read(`tooling/${file}`);
    const effective = text.startsWith("#!") ? text.slice(text.indexOf("\n") + 1) : text;
    assert.ok(effective.startsWith(pyNotice), `${file} carries the python notice`);
  }
});

test("the LICENSE file is the full GNU Affero General Public License v3", () => {
  const licence = read("LICENSE");
  assert.match(licence, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(licence, /Version 3, 19 November 2007/);
  assert.ok(licence.length > 30000);
});

test("the README quotes the standard licence chapter", () => {
  const readme = read("README.md");
  const holderLine = ["Copyright © 2026  [Daniel ", "Brani", "ewski](https://brani.dev/)"].join("");
  assert.ok(readme.includes("## Licence"));
  assert.ok(readme.includes(holderLine));
  assert.ok(readme.includes("This program is free software: you can redistribute it and/or modify"));
  assert.ok(readme.includes("<https://www.gnu.org/licenses/>"));
});

test("the changelog carries the 1.0.2 release section and its Runyth publication record", () => {
  const changelog = read("CHANGELOG.md");
  assert.ok(changelog.includes("## 1.0.2 — 2026-08-09"));
  assert.ok(changelog.includes("First publication as a Runyth module"));
});

test("published surfaces name no foreign module and give no foreign credit", () => {
  const foreignProject = ["token-", "hud-wildcard"].join("");
  const foreignName = ["Token HUD ", "Wildcard"].join("");
  const externalCredit = ["Mid", "i-QoL"].join("");
  const volunteer = ["aki", "to"].join("");
  const mitRule = new RegExp(["MIT ", "License|Permission is hereby ", "granted"].join(""), "");
  for (const file of ["module.json", "README.md", "CHANGELOG.md", ...everyProgramFile("scripts"), ...everyProgramFile("tooling"), ...everyProgramFile("tools"), ...everyProgramFile("tests")]) {
    const text = read(file);
    assert.ok(!text.includes(foreignProject), `${file} must not carry the foreign module id`);
    assert.ok(!text.includes(foreignName), `${file} must not carry the foreign module name`);
    assert.ok(!text.includes(externalCredit), `${file} must not carry third-party module credit`);
    assert.ok(!/[Cc]ourtesy of|[Tt]hanks to/.test(text), `${file} must not hand out upstream credit`);
    assert.ok(!text.includes(volunteer), `${file} must not carry personal identity outside licence surfaces`);
    assert.ok(!mitRule.test(text), `${file} must not quote the removed MIT licence`);
  }
});

test("game-system references stay technical and dependency-free", () => {
  // The D&D 5e references in this module are game-system integrations, not module credits:
  // permitted inside docs and runtime detection, but never in manifest relationships or supporter prose.
  const manifestText = read("module.json");
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.relationships?.systems, undefined);
  for (const file of ["README.md", "docs/SOURCES.md"]) {
    const text = read(file);
    assert.ok(!/donate|patreon|ko-?fi/i.test(text), `${file} must not carry funding prompts`);
  }
});

test("no private material lives on published source surfaces", () => {
  const pattern = (...parts) => new RegExp(parts.join(""), "iu"); // rules assembled at runtime
  const patterns = [
    pattern(["akki", "@"]),
    pattern(["ik", "\\.me"]),
    pattern(["GITHUB_", "TOKEN"]),
    pattern(["gh", "[psro]_[A-Za-z0-9]{20,}"]),
    pattern(["http.*\\.extra", "header"]),
    pattern(["x-access-", "token"]),
    pattern(["/mnt", "/"]),
    pattern(["/home", "/"])
  ];
  for (const file of [
    "module.json",
    "package.json",
    "package-lock.json",
    ".github/workflows/quality.yml",
    ".github/workflows/release.yml",
    ...everyProgramFile("scripts"),
    ...everyProgramFile("tooling"),
    ...everyProgramFile("tools"),
    ...everyProgramFile("tests")
  ]) {
    const text = read(file);
    for (const rule of patterns) {
      assert.ok(!rule.test(text), `${file} must not match ${String(rule)}`);
    }
  }
});
