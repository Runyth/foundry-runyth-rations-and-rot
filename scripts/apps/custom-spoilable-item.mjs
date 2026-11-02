// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, MODULE_TITLE, SETTINGS, STORAGE_PRESETS } from "../constants.mjs";
import { SpoilageService } from "../services/spoilage-service.mjs";
import { logger } from "../logger.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CustomSpoilableItem extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "rations-and-rot-custom-item-{id}",
    classes: ["rations-and-rot", "rnr-custom-item"],
    tag: "form",
    position: {
      width: 520,
      height: 520
    },
    window: {
      title: `${MODULE_TITLE} — Create Spoilable`,
      icon: "fa-solid fa-plus",
      resizable: true
    },
    form: {
      closeOnSubmit: true,
      handler: this.#onSubmit
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/custom-spoilable-item.hbs`
    }
  };

  #actor;
  #positionTimer = null;

  constructor(actor, options = {}) {
    super({
      ...options,
      uniqueId: `rations-and-rot-custom-item-${actor.id}`
    });
    this.#actor = actor;
  }

  static open(actor) {
    const app = new this(actor);
    void app.render(true);
    return app;
  }

  get title() {
    return `${MODULE_TITLE} — New spoilable for ${this.#actor?.name ?? "Actor"}`;
  }

  _canRender(options) {
    if (!SpoilageService.canManageActor(this.#actor)) {
      ui.notifications.warn(`${MODULE_TITLE}: You cannot add Items to this Actor.`);
      return false;
    }
    return super._canRender(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const { choices, preferred } = SpoilageService.getAllowedItemTypes(this.#actor);
    return {
      ...context,
      actor: this.#actor,
      itemTypes: choices.map((choice) => ({ ...choice, selected: choice.value === preferred })),
      defaultShelfLifeDays: Number(game.settings.get(MODULE_ID, SETTINGS.DEFAULT_SHELF_LIFE_DAYS)),
      presets: STORAGE_PRESETS.map((preset) => ({ ...preset, selected: preset.value === 1 }))
    };
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const saved = game.settings.get(MODULE_ID, SETTINGS.CUSTOM_ITEM_POSITION) ?? {};
    const permitted = {};
    for (const key of ["left", "top", "width", "height"]) {
      if (Number.isFinite(Number(saved[key]))) permitted[key] = Number(saved[key]);
    }
    if (Object.keys(permitted).length > 0) this.setPosition(permitted);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const preset = this.element?.querySelector("[data-rnr-storage-preset]");
    const rate = this.element?.querySelector("input[name='rate']");
    if (!preset || !rate) return;
    preset.addEventListener("change", () => {
      if (preset.value !== "custom") rate.value = preset.value;
    });
  }

  _onPosition(position) {
    super._onPosition(position);
    clearTimeout(this.#positionTimer);
    this.#positionTimer = setTimeout(() => {
      void game.settings.set(MODULE_ID, SETTINGS.CUSTOM_ITEM_POSITION, {
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

  static async #onSubmit(event, form) {
    const name = String(form.elements.name?.value ?? "").trim();
    const type = String(form.elements.type?.value ?? "").trim();
    const shelfLifeDays = Number(form.elements.shelfLifeDays?.value);
    const rate = Number(form.elements.rate?.value);
    const note = String(form.elements.note?.value ?? "");

    try {
      const item = await SpoilageService.createSpoilableItem(this.#actor, {
        name,
        type,
        shelfLifeDays: Number.isFinite(shelfLifeDays) ? shelfLifeDays : undefined,
        rate: Number.isFinite(rate) ? rate : 1,
        note
      });
      if (!item) throw new Error("Foundry did not return the created Item.");
      ui.notifications.info(`${MODULE_TITLE}: Created ${item.name} and marked it as spoilable.`);
    } catch (error) {
      logger.error("Could not create custom spoilable Item.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not create the spoilable Item.`);
      throw error;
    }
  }
}
