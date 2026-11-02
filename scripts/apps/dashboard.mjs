// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID, MODULE_TITLE, SETTINGS } from "../constants.mjs";
import { SpoilageService } from "../services/spoilage-service.mjs";
import { ActorInventoryManager } from "./actor-inventory.mjs";
import { logger } from "../logger.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SpoilageDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instance = null;
  static #refreshTimer = null;

  static DEFAULT_OPTIONS = {
    id: "rations-and-rot-dashboard",
    classes: ["rations-and-rot", "rnr-dashboard"],
    position: {
      width: 940,
      height: 650
    },
    window: {
      title: `${MODULE_TITLE} — Dashboard`,
      icon: "fa-solid fa-apple-whole",
      resizable: true
    },
    actions: {
      refresh: this.#onRefresh,
      scan: this.#onScan,
      openActor: this.#onOpenActor,
      manageActor: this.#onManageActor
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/dashboard.hbs`
    }
  };

  #positionTimer = null;

  constructor(options = {}) {
    super(options);
    SpoilageDashboard.#instance = this;
  }

  static open() {
    if (this.#instance?.rendered) {
      this.#instance.bringToFront();
      return this.#instance;
    }

    const app = new this();
    void app.render(true);
    return app;
  }

  static refreshOpenDebounced() {
    if (!this.#instance?.rendered) return;
    clearTimeout(this.#refreshTimer);
    this.#refreshTimer = setTimeout(() => {
      if (this.#instance?.rendered) void this.#instance.render();
    }, 100);
  }

  _canRender(options) {
    if (!SpoilageService.canOpenDashboard()) {
      ui.notifications.warn(`${MODULE_TITLE}: The dashboard is disabled for players.`);
      return false;
    }
    return super._canRender(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = SpoilageService.getDashboardData();
    return {
      ...context,
      ...data,
      isGM: Boolean(game.user?.isGM),
      canScan: Boolean(game.user?.isGM || game.settings.get(MODULE_ID, SETTINGS.PLAYERS_CAN_MANAGE)),
      automationEnabled: Boolean(game.settings.get(MODULE_ID, SETTINGS.ENABLE_AUTOMATION)),
      authority: SpoilageService.isAutomationAuthority(),
      empty: data.actors.length === 0
    };
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const saved = game.settings.get(MODULE_ID, SETTINGS.DASHBOARD_POSITION) ?? {};
    const permitted = {};
    for (const key of ["left", "top", "width", "height"]) {
      if (Number.isFinite(Number(saved[key]))) permitted[key] = Number(saved[key]);
    }
    if (Object.keys(permitted).length > 0) this.setPosition(permitted);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const search = this.element?.querySelector("[data-rnr-search]");
    if (!search) return;

    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      for (const card of this.element.querySelectorAll("[data-rnr-actor-card]")) {
        const haystack = (card.dataset.search ?? "").toLocaleLowerCase();
        card.hidden = Boolean(query) && !haystack.includes(query);
      }
    });
  }

  _onPosition(position) {
    super._onPosition(position);
    clearTimeout(this.#positionTimer);
    this.#positionTimer = setTimeout(() => {
      void game.settings.set(MODULE_ID, SETTINGS.DASHBOARD_POSITION, {
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height
      });
    }, 250);
  }

  _onClose(options) {
    clearTimeout(this.#positionTimer);
    if (SpoilageDashboard.#instance === this) SpoilageDashboard.#instance = null;
    return super._onClose(options);
  }

  static async #resolveUuid(target) {
    const uuid = target?.dataset?.uuid;
    if (!uuid) return null;
    try {
      return await fromUuid(uuid);
    } catch (error) {
      logger.warnOnce(`bad-uuid:${uuid}`, `Could not resolve document UUID ${uuid}.`, error);
      return null;
    }
  }

  static async #onRefresh() {
    try {
      if (SpoilageService.isAutomationAuthority()) {
        await SpoilageService.reconcileTracked({ force: true, notify: true });
      }
      await this.render();
    } catch (error) {
      logger.error("Dashboard refresh failed.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not refresh spoilage state. See console for details.`);
    }
  }

  static async #onScan() {
    try {
      const count = await SpoilageService.scanAndTrack();
      await SpoilageService.reconcileTracked({ force: true, notify: false });
      ui.notifications.info(`${MODULE_TITLE}: ${count} new food item${count === 1 ? "" : "s"} added to tracking.`);
      await this.render();
    } catch (error) {
      logger.error("Inventory scan failed.", error);
      ui.notifications.error(`${MODULE_TITLE}: Inventory scan failed. See console for details.`);
    }
  }

  static async #onOpenActor(event, target) {
    const actor = await this.constructor.#resolveUuid(target);
    if (actor?.sheet) actor.sheet.render(true);
  }

  static async #onManageActor(event, target) {
    const actor = await this.constructor.#resolveUuid(target);
    if (actor?.documentName === "Actor") ActorInventoryManager.open(actor);
  }
}
