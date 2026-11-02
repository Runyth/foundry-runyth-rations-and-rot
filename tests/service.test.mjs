import test from "node:test";
import assert from "node:assert/strict";

import { MODULE_ID, SECONDS_PER_DAY, SECONDS_PER_HOUR, STATES } from "../scripts/constants.mjs";
import { SpoilageService } from "../scripts/services/spoilage-service.mjs";

function createItem({ id, name, type = "consumable", subtype = "food", tracking = null }) {
  return {
    id,
    name,
    type,
    img: "icons/svg/item-bag.svg",
    documentName: "Item",
    system: {
      type: { value: subtype },
      quantity: 1
    },
    flags: tracking ? { [MODULE_ID]: { tracking } } : {},
    getFlag(namespace, key) {
      return this.flags?.[namespace]?.[key] ?? null;
    }
  };
}

function setTracking(item, value) {
  item.flags ??= {};
  item.flags[MODULE_ID] ??= {};
  item.flags[MODULE_ID].tracking = value;
}

test("service auto-scan and reconciliation batch embedded Item state changes", async () => {
  const settings = new Map([
    [`${MODULE_ID}.defaultShelfLifeDays`, 1],
    [`${MODULE_ID}.warningHours`, 12],
    [`${MODULE_ID}.actorScope`, "playerOwned"],
    [`${MODULE_ID}.autoDetectDnd5e`, true],
    [`${MODULE_ID}.enableNameMatching`, false],
    [`${MODULE_ID}.namePattern`, String.raw`\\bfood\\b`],
    [`${MODULE_ID}.enableAutomation`, true],
    [`${MODULE_ID}.notificationAudience`, "none"],
    [`${MODULE_ID}.playersCanManage`, true],
    [`${MODULE_ID}.dashboardVisibleToPlayers`, true],
    [`${MODULE_ID}.debugLogging`, false]
  ]);

  const gm = { id: "gm", isGM: true };
  const player = { id: "player", isGM: false };
  const food = createItem({ id: "food", name: "Fresh Fish" });
  const actor = {
    id: "actor",
    name: "Hero",
    documentName: "Actor",
    type: "character",
    hasPlayerOwner: true,
    isOwner: true,
    ownership: { player: 3 },
    items: null,
    updateCalls: [],
    testUserPermission(user) {
      return user.id === "player" || user.isGM;
    },
    async updateEmbeddedDocuments(type, updates) {
      assert.equal(type, "Item");
      this.updateCalls.push(updates);
      for (const update of updates) {
        const item = this.items.get(update._id);
        const value = update[`flags.${MODULE_ID}.tracking`];
        if (value) setTracking(item, value);
      }
      return updates.map((update) => this.items.get(update._id));
    }
  };
  food.parent = actor;
  food.isOwner = true;
  const itemArray = [food];
  itemArray.get = (id) => itemArray.find((item) => item.id === id);
  actor.items = itemArray;

  const actorArray = [actor];
  actorArray.get = (id) => actorArray.find((entry) => entry.id === id);
  const userArray = [gm, player];
  userArray.activeGM = gm;

  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } };
  globalThis.Hooks = { callAll() {} };
  globalThis.ChatMessage = { async create() {} };
  globalThis.game = {
    user: gm,
    users: userArray,
    actors: actorArray,
    system: { id: "dnd5e" },
    time: { worldTime: 0 },
    settings: {
      get(namespace, key) {
        return settings.get(`${namespace}.${key}`);
      }
    }
  };

  SpoilageService.rebuildIndex();
  const scanned = await SpoilageService.scanAndTrack();
  assert.equal(scanned, 1);
  assert.equal(food.getFlag(MODULE_ID, "tracking").state, STATES.FRESH);

  actor.updateCalls.length = 0;
  game.time.worldTime = 13 * SECONDS_PER_HOUR;
  const first = await SpoilageService.reconcileTracked({ force: true, notify: false });
  assert.equal(first.updated, 1);
  assert.equal(actor.updateCalls.length, 1);
  assert.equal(actor.updateCalls[0].length, 1);
  assert.equal(food.getFlag(MODULE_ID, "tracking").state, STATES.WARNING);

  actor.updateCalls.length = 0;
  const second = await SpoilageService.reconcileTracked({ force: true, notify: false });
  assert.equal(second.updated, 0);
  assert.equal(actor.updateCalls.length, 0);

  game.time.worldTime = SECONDS_PER_DAY;
  const third = await SpoilageService.reconcileTracked({ force: true, notify: false });
  assert.equal(third.updated, 1);
  assert.equal(food.getFlag(MODULE_ID, "tracking").state, STATES.SPOILED);
});
