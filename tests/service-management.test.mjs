// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

import { MODULE_ID, SECONDS_PER_DAY, STATES } from "../scripts/constants.mjs";
import { SpoilageService } from "../scripts/services/spoilage-service.mjs";

function createItem(id, name, tracking = null) {
  return {
    id,
    uuid: `Actor.actor.Item.${id}`,
    name,
    type: "consumable",
    img: "icons/svg/item-bag.svg",
    documentName: "Item",
    system: { type: { value: "food" }, quantity: 1 },
    flags: tracking ? { [MODULE_ID]: { tracking } } : {},
    getFlag(namespace, key) {
      return this.flags?.[namespace]?.[key] ?? null;
    },
    async update(change) {
      const value = change[`flags.${MODULE_ID}.tracking`];
      if (value) {
        this.flags ??= {};
        this.flags[MODULE_ID] ??= {};
        this.flags[MODULE_ID].tracking = value;
      }
      return this;
    },
    async unsetFlag(namespace, key) {
      if (this.flags?.[namespace]) delete this.flags[namespace][key];
    }
  };
}

function baseSettings() {
  return new Map([
    [`${MODULE_ID}.defaultShelfLifeDays`, 3],
    [`${MODULE_ID}.warningHours`, 24],
    [`${MODULE_ID}.actorScope`, "all"],
    [`${MODULE_ID}.actorFolderPattern`, ""],
    [`${MODULE_ID}.actorFolderRecursive`, true],
    [`${MODULE_ID}.selectedActorIds`, []],
    [`${MODULE_ID}.selectedActorFolderIds`, []],
    [`${MODULE_ID}.autoDetectDnd5e`, true],
    [`${MODULE_ID}.enableNameMatching`, false],
    [`${MODULE_ID}.namePattern`, ""],
    [`${MODULE_ID}.enableAutomation`, true],
    [`${MODULE_ID}.notificationAudience`, "none"],
    [`${MODULE_ID}.playersCanManage`, true],
    [`${MODULE_ID}.dashboardVisibleToPlayers`, true],
    [`${MODULE_ID}.debugLogging`, false]
  ]);
}

function installGlobals(actor, settings) {
  const gm = { id: "gm", isGM: true };
  const actors = [actor];
  actors.get = (id) => actors.find((candidate) => candidate.id === id);
  actors.folders = [];
  const users = [gm];
  users.activeGM = gm;

  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } };
  globalThis.Hooks = { callAll() {} };
  globalThis.ChatMessage = { async create() {} };
  globalThis.CONFIG = { Item: { typeLabels: { consumable: "Consumable", loot: "Loot" } } };
  globalThis.foundry = {
    documents: {
      Item: {
        implementation: {
          TYPES: ["consumable", "loot"]
        }
      }
    }
  };
  globalThis.game = {
    user: gm,
    users,
    actors,
    system: { id: "dnd5e" },
    time: { worldTime: 100 },
    i18n: { localize: (value) => value },
    settings: {
      get(namespace, key) {
        return settings.get(`${namespace}.${key}`);
      }
    }
  };
}

test("bulk enrollment marks only untracked selected Items in one embedded update", async () => {
  const existingTracking = {
    enabled: true,
    shelfLifeSeconds: 3 * SECONDS_PER_DAY,
    accumulatedAgeSeconds: 0,
    baselineWorldTime: 100,
    rate: 1,
    state: STATES.FRESH,
    autoDetected: false,
    note: ""
  };
  const first = createItem("one", "Bread");
  const second = createItem("two", "Cheese");
  const already = createItem("three", "Jerky", existingTracking);
  const items = [first, second, already];
  items.get = (id) => items.find((item) => item.id === id);

  const actor = {
    id: "actor",
    uuid: "Actor.actor",
    name: "Hero",
    documentName: "Actor",
    type: "character",
    isOwner: true,
    hasPlayerOwner: true,
    items,
    updateCalls: [],
    async updateEmbeddedDocuments(type, updates) {
      assert.equal(type, "Item");
      this.updateCalls.push(updates);
      for (const update of updates) {
        const item = items.get(update._id);
        item.flags ??= {};
        item.flags[MODULE_ID] ??= {};
        item.flags[MODULE_ID].tracking = update[`flags.${MODULE_ID}.tracking`];
      }
      return updates.map((update) => items.get(update._id));
    }
  };
  for (const item of items) {
    item.parent = actor;
    item.isOwner = true;
  }

  const settings = baseSettings();
  installGlobals(actor, settings);
  SpoilageService.rebuildIndex();

  const count = await SpoilageService.trackItems(actor, ["one", "two", "three"]);
  assert.equal(count, 2);
  assert.equal(actor.updateCalls.length, 1);
  assert.equal(actor.updateCalls[0].length, 2);
  assert.ok(first.getFlag(MODULE_ID, "tracking"));
  assert.ok(second.getFlag(MODULE_ID, "tracking"));
  assert.equal(already.getFlag(MODULE_ID, "tracking"), existingTracking);

  const repeated = await SpoilageService.trackItems(actor, ["one", "two"]);
  assert.equal(repeated, 0);
  assert.equal(actor.updateCalls.length, 1);
});

test("custom spoilable creation uses an active-system Item type and embeds tracking immediately", async () => {
  const items = [];
  items.get = (id) => items.find((item) => item.id === id);
  const actor = {
    id: "actor",
    uuid: "Actor.actor",
    name: "Hero",
    documentName: "Actor",
    type: "character",
    isOwner: true,
    hasPlayerOwner: true,
    items,
    createCalls: [],
    async createEmbeddedDocuments(type, sources) {
      assert.equal(type, "Item");
      this.createCalls.push(sources);
      const source = sources[0];
      const item = createItem("created", source.name, source.flags?.[MODULE_ID]?.tracking);
      item.type = source.type;
      item.system = source.system ?? {};
      item.parent = this;
      item.isOwner = true;
      items.push(item);
      return [item];
    }
  };

  const settings = baseSettings();
  installGlobals(actor, settings);
  SpoilageService.rebuildIndex();

  const created = await SpoilageService.createSpoilableItem(actor, {
    name: "  Camp Stew  ",
    type: "consumable",
    shelfLifeDays: 2,
    rate: 0.5,
    note: "cool cellar"
  });

  assert.equal(created.name, "Camp Stew");
  assert.equal(created.type, "consumable");
  assert.equal(actor.createCalls.length, 1);
  const source = actor.createCalls[0][0];
  assert.equal(source.system.type.value, "food");
  assert.equal(source.flags[MODULE_ID].tracking.rate, 0.5);
  assert.equal(source.flags[MODULE_ID].tracking.note, "cool cellar");
  assert.equal(source.flags[MODULE_ID].tracking.shelfLifeSeconds, 2 * SECONDS_PER_DAY);
});

test("Actor discovery filters do not freeze already tracked spoilage", async () => {
  const root = { id: "root", name: "Characters", depth: 0, ancestors: [] };
  const players = { id: "players", name: "Players", depth: 1, ancestors: [root] };
  const excluded = { id: "excluded", name: "NPCs", depth: 0, ancestors: [] };
  const food = createItem("food", "Fish", {
    enabled: true,
    shelfLifeSeconds: SECONDS_PER_DAY,
    accumulatedAgeSeconds: 0,
    baselineWorldTime: 0,
    rate: 1,
    state: STATES.FRESH,
    autoDetected: false,
    note: ""
  });
  const items = [food];
  items.get = (id) => items.find((item) => item.id === id);
  const actor = {
    id: "actor",
    uuid: "Actor.actor",
    name: "Hero",
    documentName: "Actor",
    type: "character",
    folder: players,
    isOwner: true,
    hasPlayerOwner: true,
    items,
    async updateEmbeddedDocuments(type, updates) {
      assert.equal(type, "Item");
      for (const update of updates) {
        items.get(update._id).flags[MODULE_ID].tracking = update[`flags.${MODULE_ID}.tracking`];
      }
      return updates.map((update) => items.get(update._id));
    }
  };
  food.parent = actor;
  food.isOwner = true;

  const settings = baseSettings();
  settings.set(`${MODULE_ID}.selectedActorFolderIds`, ["players"]);
  settings.set(`${MODULE_ID}.actorFolderPattern`, "Characters");
  installGlobals(actor, settings);
  game.actors.folders = [root, players, excluded];
  SpoilageService.rebuildIndex();

  assert.equal(SpoilageService.actorMatchesDiscoveryScope(actor), true);
  settings.set(`${MODULE_ID}.selectedActorFolderIds`, ["excluded"]);
  assert.equal(SpoilageService.actorMatchesDiscoveryScope(actor), false);

  game.time.worldTime = SECONDS_PER_DAY;
  const result = await SpoilageService.reconcileTracked({ force: true, notify: false });
  assert.equal(result.updated, 1);
  assert.equal(food.getFlag(MODULE_ID, "tracking").state, STATES.SPOILED);
});
