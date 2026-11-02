// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  DEFAULT_NAME_PATTERN,
  MODULE_ID,
  MODULE_TITLE,
  SETTINGS
} from "./constants.mjs";

export function registerSettings(DashboardClass, ActorScopePickerClass, onRelevantChange) {
  game.settings.registerMenu(MODULE_ID, "dashboard", {
    name: `${MODULE_TITLE} Dashboard`,
    label: "Open Dashboard",
    hint: "Inspect and manage spoilage across accessible Actor inventories.",
    icon: "fa-solid fa-apple-whole",
    type: DashboardClass,
    restricted: false
  });

  game.settings.registerMenu(MODULE_ID, "actorScopePicker", {
    name: "Tracked Actor / Folder Picker",
    label: "Choose Actors and Folders",
    hint: "Limit automatic inventory discovery to selected Actors or Actor folders using a scalable hierarchical picker.",
    icon: "fa-solid fa-folder-tree",
    type: ActorScopePickerClass,
    restricted: true
  });

  const worldSetting = (key, data) => game.settings.register(MODULE_ID, key, {
    scope: "world",
    config: true,
    onChange: onRelevantChange,
    ...data
  });

  worldSetting(SETTINGS.ENABLE_AUTOMATION, {
    name: "Enable automatic spoilage",
    hint: "Use Foundry world-time advances to update warning/spoiled states. The active GM is the sole automatic writer.",
    type: Boolean,
    default: true
  });

  worldSetting(SETTINGS.AUTO_DETECT_DND5E, {
    name: "Auto-detect D&D 5e food consumables",
    hint: "Automatically begins tracking D&D 5e consumable Items whose subtype is Food.",
    type: Boolean,
    default: true
  });

  worldSetting(SETTINGS.ENABLE_NAME_MATCHING, {
    name: "Enable item-name detection",
    hint: "Also auto-track Items whose names match the configured regular expression. Disabled by default to avoid false positives.",
    type: Boolean,
    default: false
  });

  worldSetting(SETTINGS.NAME_PATTERN, {
    name: "Food name regular expression",
    hint: "Case-insensitive Unicode regular expression used only when item-name detection is enabled.",
    type: String,
    default: DEFAULT_NAME_PATTERN
  });

  worldSetting(SETTINGS.DEFAULT_SHELF_LIFE_DAYS, {
    name: "Default shelf life (days)",
    hint: "Shelf life assigned to newly discovered or manually enrolled spoilable Items. Existing tracked Items keep their configured value.",
    type: Number,
    default: 3,
    range: {
      min: 0.01,
      max: 3650,
      step: 0.25
    }
  });

  worldSetting(SETTINGS.WARNING_HOURS, {
    name: "Freshness warning threshold (hours)",
    hint: "Food enters the warning state when this much effective shelf life remains.",
    type: Number,
    default: 24,
    range: {
      min: 0,
      max: 8760,
      step: 1
    }
  });

  worldSetting(SETTINGS.ACTOR_SCOPE, {
    name: "Automatic actor scope",
    hint: "First-stage filter for automatic inventory discovery. Folder regex and picker selections further narrow this scope when configured.",
    type: String,
    default: "playerOwned",
    choices: {
      playerOwned: "Player-owned actors",
      characters: "Character actors",
      all: "All world actors"
    }
  });

  worldSetting(SETTINGS.ACTOR_FOLDER_PATTERN, {
    name: "Actor folder regular expression",
    hint: "Optional case-insensitive Unicode regex matched against the full Actor folder path (for example Characters/Players). Leave blank to disable this filter.",
    type: String,
    default: ""
  });

  worldSetting(SETTINGS.ACTOR_FOLDER_RECURSIVE, {
    name: "Search selected Actor folders recursively",
    hint: "When enabled, an Actor inside any descendant of a selected folder is included. When disabled, only Actors directly inside selected folders are included.",
    type: Boolean,
    default: true
  });

  worldSetting(SETTINGS.NOTIFICATION_AUDIENCE, {
    name: "Spoilage notifications",
    hint: "Choose who receives chat whispers when food crosses into warning or spoiled state.",
    type: String,
    default: "gm",
    choices: {
      none: "Disabled",
      gm: "GMs",
      owners: "Actor owners and GMs"
    }
  });

  worldSetting(SETTINGS.PLAYERS_CAN_MANAGE, {
    name: "Players can manage owned food",
    hint: "Allows players to enroll, configure, refresh, or stop tracking Items on Actors they own.",
    type: Boolean,
    default: true
  });

  worldSetting(SETTINGS.DASHBOARD_VISIBLE_TO_PLAYERS, {
    name: "Players can open dashboard",
    hint: "Players see only Actors they own. GMs retain world-scope visibility plus any already-tracked Actors.",
    type: Boolean,
    default: true
  });

  const hiddenWorldSetting = (key, defaultValue) => game.settings.register(MODULE_ID, key, {
    scope: "world",
    config: false,
    type: Object,
    default: defaultValue,
    onChange: onRelevantChange
  });

  hiddenWorldSetting(SETTINGS.SELECTED_ACTOR_IDS, []);
  hiddenWorldSetting(SETTINGS.SELECTED_ACTOR_FOLDER_IDS, []);

  game.settings.register(MODULE_ID, SETTINGS.DEBUG_LOGGING, {
    name: "Debug logging",
    hint: "Write additional namespaced diagnostics to the browser console.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  for (const key of [
    SETTINGS.DASHBOARD_POSITION,
    SETTINGS.INVENTORY_POSITION,
    SETTINGS.ACTOR_PICKER_POSITION,
    SETTINGS.CUSTOM_ITEM_POSITION
  ]) {
    game.settings.register(MODULE_ID, key, {
      scope: "client",
      config: false,
      type: Object,
      default: {}
    });
  }
}
