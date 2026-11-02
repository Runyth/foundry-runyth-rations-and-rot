// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, MODULE_TITLE, SETTINGS } from "../constants.mjs";
import { folderPath, normalizeIdList } from "../core/actor-scope.mjs";
import { logger } from "../logger.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function selectedSet(settingKey) {
  return new Set(normalizeIdList(game.settings.get(MODULE_ID, settingKey)));
}

function actorRows() {
  const selectedActors = selectedSet(SETTINGS.SELECTED_ACTOR_IDS);
  const selectedFolders = selectedSet(SETTINGS.SELECTED_ACTOR_FOLDER_IDS);
  const actors = [...(game.actors ?? [])];
  const actorsByFolder = new Map();

  for (const actor of actors) {
    const folderId = actor.folder?.id ?? "";
    const bucket = actorsByFolder.get(folderId) ?? [];
    bucket.push(actor);
    actorsByFolder.set(folderId, bucket);
  }

  for (const bucket of actorsByFolder.values()) {
    bucket.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  }

  const rows = [];
  for (const actor of actorsByFolder.get("") ?? []) {
    rows.push({
      kind: "actor",
      isFolder: false,
      id: actor.id,
      name: actor.name,
      img: actor.img,
      depth: 0,
      ariaLevel: 1,
      checked: selectedActors.has(actor.id),
      search: `actor ${actor.name ?? ""} root`
    });
  }

  const folders = [...(game.actors?.folders ?? [])]
    .map((folder) => ({ folder, path: folderPath(folder) }))
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const { folder, path } of folders) {
    const depth = Math.max(0, Number(folder.depth ?? 0));
    rows.push({
      kind: "folder",
      isFolder: true,
      id: folder.id,
      name: folder.name,
      depth,
      ariaLevel: depth + 1,
      checked: selectedFolders.has(folder.id),
      path,
      search: `folder ${path}`
    });

    for (const actor of actorsByFolder.get(folder.id) ?? []) {
      rows.push({
        kind: "actor",
        isFolder: false,
        id: actor.id,
        name: actor.name,
        img: actor.img,
        depth: depth + 1,
        ariaLevel: depth + 2,
        checked: selectedActors.has(actor.id),
        folderPath: path,
        search: `actor ${actor.name ?? ""} ${path}`
      });
    }
  }

  return rows;
}

export class ActorScopePicker extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "rations-and-rot-actor-scope-picker",
    classes: ["rations-and-rot", "rnr-actor-scope-picker"],
    tag: "form",
    position: {
      width: 680,
      height: 720
    },
    window: {
      title: `${MODULE_TITLE} — Actor / Folder Picker`,
      icon: "fa-solid fa-folder-tree",
      resizable: true
    },
    form: {
      closeOnSubmit: false,
      handler: this.#onSubmit
    },
    actions: {
      selectVisible: this.#onSelectVisible,
      clearVisible: this.#onClearVisible,
      clearAll: this.#onClearAll
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/actor-scope-picker.hbs`
    }
  };

  #positionTimer = null;

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const selectedActors = normalizeIdList(game.settings.get(MODULE_ID, SETTINGS.SELECTED_ACTOR_IDS));
    const selectedFolders = normalizeIdList(game.settings.get(MODULE_ID, SETTINGS.SELECTED_ACTOR_FOLDER_IDS));
    const folderPattern = String(game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER_PATTERN) ?? "");
    let patternValid = true;
    if (folderPattern.trim()) {
      try {
        new RegExp(folderPattern, "iu");
      } catch {
        patternValid = false;
      }
    }

    return {
      ...context,
      rows: actorRows(),
      selectedActorCount: selectedActors.length,
      selectedFolderCount: selectedFolders.length,
      recursive: Boolean(game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER_RECURSIVE)),
      folderPattern,
      patternValid,
      selectionActive: selectedActors.length > 0 || selectedFolders.length > 0
    };
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const saved = game.settings.get(MODULE_ID, SETTINGS.ACTOR_PICKER_POSITION) ?? {};
    const permitted = {};
    for (const key of ["left", "top", "width", "height"]) {
      if (Number.isFinite(Number(saved[key]))) permitted[key] = Number(saved[key]);
    }
    if (Object.keys(permitted).length > 0) this.setPosition(permitted);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const search = this.element?.querySelector("[data-rnr-picker-search]");
    if (!search) return;

    const applyFilter = () => {
      const query = search.value.trim().toLocaleLowerCase();
      for (const row of this.element.querySelectorAll("[data-rnr-picker-row]")) {
        row.hidden = Boolean(query) && !(row.dataset.search ?? "").toLocaleLowerCase().includes(query);
      }
    };
    search.addEventListener("input", applyFilter);
  }

  _onPosition(position) {
    super._onPosition(position);
    clearTimeout(this.#positionTimer);
    this.#positionTimer = setTimeout(() => {
      void game.settings.set(MODULE_ID, SETTINGS.ACTOR_PICKER_POSITION, {
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height
      });
    }, 250);
  }

  _onClose(options) {
    clearTimeout(this.#positionTimer);
    return super._onClose(options);
  }

  static #visibleCheckboxes(app) {
    return [...(app.element?.querySelectorAll("[data-rnr-picker-row]:not([hidden]) input[type='checkbox']") ?? [])];
  }

  static async #onSelectVisible() {
    for (const checkbox of this.constructor.#visibleCheckboxes(this)) checkbox.checked = true;
  }

  static async #onClearVisible() {
    for (const checkbox of this.constructor.#visibleCheckboxes(this)) checkbox.checked = false;
  }

  static async #onClearAll() {
    for (const checkbox of this.element?.querySelectorAll("[data-rnr-picker-row] input[type='checkbox']") ?? []) {
      checkbox.checked = false;
    }
  }

  static async #onSubmit(event, form) {
    if (!game.user?.isGM) {
      ui.notifications.warn(`${MODULE_TITLE}: Only a GM can change Actor discovery scope.`);
      return;
    }

    const actorIds = [...form.querySelectorAll("input[name='actorIds']:checked")].map((input) => input.value);
    const folderIds = [...form.querySelectorAll("input[name='folderIds']:checked")].map((input) => input.value);

    try {
      await game.settings.set(MODULE_ID, SETTINGS.SELECTED_ACTOR_IDS, normalizeIdList(actorIds));
      await game.settings.set(MODULE_ID, SETTINGS.SELECTED_ACTOR_FOLDER_IDS, normalizeIdList(folderIds));
      ui.notifications.info(`${MODULE_TITLE}: Actor discovery selection saved.`);
      await this.render();
    } catch (error) {
      logger.error("Could not save Actor/folder discovery selection.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not save Actor discovery selection.`);
      throw error;
    }
  }
}
