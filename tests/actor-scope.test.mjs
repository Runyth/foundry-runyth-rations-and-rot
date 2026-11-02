// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

import {
  actorMatchesPicker,
  actorMatchesSelection,
  folderPath,
  matchesFolderPattern,
  normalizeIdList
} from "../scripts/core/actor-scope.mjs";

function folder(id, name, depth, ancestors = []) {
  return { id, name, depth, ancestors };
}

test("ID lists are normalized and de-duplicated", () => {
  assert.deepEqual(normalizeIdList([" a ", "a", "", null, "b"]), ["a", "b"]);
  assert.deepEqual(normalizeIdList(null), []);
});

test("folder paths are deterministic from root to leaf", () => {
  const root = folder("root", "Characters", 0);
  const players = folder("players", "Players", 1, [root]);
  const active = folder("active", "Active", 2, [players, root]);
  assert.equal(folderPath(active), "Characters/Players/Active");
});

test("folder regex matches the full hierarchy and invalid patterns fail open", () => {
  const root = folder("root", "Characters", 0);
  const players = folder("players", "Players", 1, [root]);
  const actor = { id: "a", folder: players };

  assert.equal(matchesFolderPattern(actor, String.raw`^Characters/Players$`), true);
  assert.equal(matchesFolderPattern(actor, String.raw`NPCs`), false);
  assert.equal(matchesFolderPattern(actor, "["), true);
  assert.equal(matchesFolderPattern(actor, ""), true);
});

test("picker includes explicit Actors regardless of folder selection", () => {
  const actor = { id: "hero", folder: null };
  assert.equal(actorMatchesPicker(actor, { selectedActorIds: ["hero"], selectedFolderIds: ["other"] }), true);
});

test("recursive folder selection includes descendants but non-recursive selection does not", () => {
  const root = folder("root", "Characters", 0);
  const players = folder("players", "Players", 1, [root]);
  const active = folder("active", "Active", 2, [players, root]);
  const actor = { id: "hero", folder: active };

  assert.equal(actorMatchesPicker(actor, { selectedFolderIds: ["players"], recursive: true }), true);
  assert.equal(actorMatchesPicker(actor, { selectedFolderIds: ["players"], recursive: false }), false);
  assert.equal(actorMatchesPicker(actor, { selectedFolderIds: ["active"], recursive: false }), true);
});

test("empty picker selection applies no additional restriction", () => {
  assert.equal(actorMatchesPicker({ id: "hero", folder: null }, {}), true);
});

test("combined selection requires regex and picker filters to match", () => {
  const root = folder("root", "Characters", 0);
  const players = folder("players", "Players", 1, [root]);
  const actor = { id: "hero", folder: players };

  assert.equal(actorMatchesSelection(actor, {
    folderPattern: "Characters",
    selectedFolderIds: ["players"],
    recursive: false
  }), true);
  assert.equal(actorMatchesSelection(actor, {
    folderPattern: "NPC",
    selectedFolderIds: ["players"],
    recursive: false
  }), false);
});
