// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  FLAGS,
  MODULE_ID,
  MODULE_TITLE,
  SETTINGS,
  STORAGE_PRESETS
} from "../constants.mjs";
import { SpoilageService } from "../services/spoilage-service.mjs";
import { logger } from "../logger.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ItemSpoilageConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "rations-and-rot-item-config-{id}",
    classes: ["rations-and-rot", "rnr-item-config"],
    tag: "form",
    position: {
      width: 540,
      height: 520
    },
    window: {
      title: `${MODULE_TITLE} — Food`,
      icon: "fa-solid fa-apple-whole",
      resizable: true
    },
    form: {
      closeOnSubmit: true,
      handler: this.#onSubmit
    },
    actions: {
      freshen: this.#onFreshen,
      stopTracking: this.#onStopTracking
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/item-config.hbs`
    }
  };

  #item;

  constructor(item, options = {}) {
    super({
      ...options,
      uniqueId: `rations-and-rot-item-config-${item.id}`
    });
    this.#item = item;
  }

  static open(item) {
    const app = new this(item);
    void app.render(true);
    return app;
  }

  get title() {
    return `${MODULE_TITLE} — ${this.#item?.name ?? "Food"}`;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const raw = this.#item?.getFlag?.(MODULE_ID, FLAGS.TRACKING) ?? null;
    const status = SpoilageService.getStatus(this.#item);
    const defaultDays = Number(game.settings.get(MODULE_ID, SETTINGS.DEFAULT_SHELF_LIFE_DAYS));
    const rate = status?.data?.rate ?? 1;

    return {
      ...context,
      item: this.#item,
      tracked: Boolean(raw),
      enabled: raw?.enabled !== false,
      canManage: SpoilageService.canManageItem(this.#item),
      shelfLifeDays: status?.shelfLifeDays ?? defaultDays,
      rate,
      note: status?.data?.note ?? "",
      status,
      autoDetected: Boolean(status?.data?.autoDetected),
      presets: STORAGE_PRESETS.map((preset) => ({
        ...preset,
        selected: Math.abs(preset.value - rate) < 0.000001
      })),
      customRate: !STORAGE_PRESETS.some((preset) => Math.abs(preset.value - rate) < 0.000001)
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const preset = this.element.querySelector("[data-rnr-storage-preset]");
    const rate = this.element.querySelector("input[name='rate']");
    if (!preset || !rate) return;

    preset.addEventListener("change", () => {
      if (preset.value !== "custom") rate.value = preset.value;
    });
  }

  static async #onSubmit(event, form) {
    if (!SpoilageService.canManageItem(this.#item)) {
      ui.notifications.warn(`${MODULE_TITLE}: You do not have permission to configure this Item.`);
      return;
    }

    const enabled = Boolean(form.elements.enabled?.checked);
    const shelfLifeDays = Number(form.elements.shelfLifeDays?.value);
    const rate = Number(form.elements.rate?.value);
    const note = String(form.elements.note?.value ?? "");

    try {
      if (!enabled) {
        await SpoilageService.untrackItem(this.#item);
      } else {
        await SpoilageService.configureItem(this.#item, {
          shelfLifeDays: Number.isFinite(shelfLifeDays) ? shelfLifeDays : undefined,
          rate: Number.isFinite(rate) ? rate : undefined,
          note,
          enabled: true
        });
      }
      await SpoilageService.reconcileTracked({ force: true, notify: false });
    } catch (error) {
      logger.error("Could not save item spoilage configuration.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not save spoilage configuration.`);
      throw error;
    }
  }

  static async #onFreshen() {
    try {
      await SpoilageService.refreshItem(this.#item);
      ui.notifications.info(`${MODULE_TITLE}: ${this.#item.name} freshness reset.`);
      await this.render();
    } catch (error) {
      logger.error("Could not reset item freshness.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not reset freshness.`);
    }
  }

  static async #onStopTracking() {
    try {
      await SpoilageService.untrackItem(this.#item);
      ui.notifications.info(`${MODULE_TITLE}: Stopped tracking ${this.#item.name}.`);
      await this.close();
    } catch (error) {
      logger.error("Could not stop tracking item.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not stop tracking this Item.`);
    }
  }
}
