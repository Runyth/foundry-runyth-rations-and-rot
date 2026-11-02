// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

import { MODULE_ID } from "../scripts/constants.mjs";

test("runtime entrypoint registers hooks, settings, API, and item header control with Foundry-like globals", async () => {
  const onceHooks = new Map();
  const onHooks = new Map();
  const menus = new Set();
  const settings = new Map([
    [`${MODULE_ID}.playersCanManage`, true],
    [`${MODULE_ID}.dashboardVisibleToPlayers`, true],
    [`${MODULE_ID}.debugLogging`, false]
  ]);

  class ApplicationV2 {
    constructor(options = {}) {
      this.options = options;
    }

    _canRender() {
      return true;
    }

    async _prepareContext() {
      return {};
    }

    async _onFirstRender() {}
    async _onRender() {}
    _onPosition() {}
    _onClose() {}
  }

  const HandlebarsApplicationMixin = (Base) => class extends Base {};

  globalThis.foundry = {
    applications: {
      api: {
        ApplicationV2,
        HandlebarsApplicationMixin
      }
    },
    documents: {
      Item: {
        implementation: {
          TYPES: ["consumable", "loot"]
        }
      }
    }
  };
  globalThis.CONFIG = { Item: { typeLabels: {} } };
  globalThis.CONST = {
    DOCUMENT_OWNERSHIP_LEVELS: {
      OWNER: 3
    }
  };
  globalThis.ui = {
    notifications: {
      warn() {},
      error() {},
      info() {}
    }
  };
  globalThis.Hooks = {
    once(name, callback) {
      onceHooks.set(name, callback);
    },
    on(name, callback) {
      const callbacks = onHooks.get(name) ?? [];
      callbacks.push(callback);
      onHooks.set(name, callbacks);
    },
    callAll() {}
  };
  globalThis.fromUuid = async () => null;

  const moduleRecord = {};
  const actors = [];
  actors.get = () => null;
  actors.folders = [];
  globalThis.game = {
    user: { id: "gm", isGM: true },
    users: Object.assign([], { activeGM: null }),
    actors,
    system: { id: "dnd5e" },
    time: { worldTime: 0 },
    i18n: { localize: (key) => key },
    modules: new Map([[MODULE_ID, moduleRecord]]),
    settings: {
      registerMenu(namespace, key) {
        assert.equal(namespace, MODULE_ID);
        menus.add(key);
      },
      register(namespace, key, config) {
        const storageKey = `${namespace}.${key}`;
        if (!settings.has(storageKey)) settings.set(storageKey, config.default);
      },
      get(namespace, key) {
        return settings.get(`${namespace}.${key}`);
      },
      async set(namespace, key, value) {
        settings.set(`${namespace}.${key}`, value);
        return value;
      }
    }
  };

  await import(`../scripts/main.mjs?smoke=${Date.now()}`);
  assert.ok(onceHooks.has("init"));
  assert.ok(onceHooks.has("ready"));
  assert.ok(onHooks.has("updateWorldTime"));
  assert.ok(onHooks.has("getHeaderControlsApplicationV2"));
  assert.ok(onHooks.has("createFolder"));
  assert.ok(onHooks.has("updateFolder"));
  assert.ok(onHooks.has("deleteFolder"));

  onceHooks.get("init")();
  assert.deepEqual([...menus].sort(), ["actorScopePicker", "dashboard"]);
  assert.equal(moduleRecord.api.version, "1.0.3");
  assert.equal(typeof moduleRecord.api.openDashboard, "function");
  assert.equal(typeof moduleRecord.api.openActorInventory, "function");
  assert.equal(typeof moduleRecord.api.trackItem, "function");
  assert.equal(typeof moduleRecord.api.trackItems, "function");
  assert.equal(typeof moduleRecord.api.createSpoilableItem, "function");

  const item = {
    documentName: "Item",
    id: "food1",
    isOwner: true,
    parent: { documentName: "Actor", isOwner: true }
  };
  const controls = [];
  for (const callback of onHooks.get("getHeaderControlsApplicationV2")) {
    callback({ document: item }, controls);
  }

  assert.equal(controls.length, 1);
  assert.equal(controls[0].action, "rationsAndRotSpoilage");
  assert.equal(typeof controls[0].onClick, "function");
});
