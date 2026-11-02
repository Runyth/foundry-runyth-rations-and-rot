import { MODULE_ID, MODULE_TITLE, SETTINGS } from "../constants.mjs";
import { SpoilageService } from "../services/spoilage-service.mjs";
import { ItemSpoilageConfig } from "./item-config.mjs";
import { CustomSpoilableItem } from "./custom-spoilable-item.mjs";
import { logger } from "../logger.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ActorInventoryManager extends HandlebarsApplicationMixin(ApplicationV2) {
  static #instances = new Map();
  static #refreshTimers = new Map();

  static DEFAULT_OPTIONS = {
    id: "rations-and-rot-inventory-{id}",
    classes: ["rations-and-rot", "rnr-actor-inventory"],
    position: {
      width: 900,
      height: 680
    },
    window: {
      title: `${MODULE_TITLE} — Inventory`,
      icon: "fa-solid fa-basket-shopping",
      resizable: true
    },
    actions: {
      refresh: this.#onRefresh,
      scanActor: this.#onScanActor,
      openActor: this.#onOpenActor,
      openItem: this.#onOpenItem,
      configureItem: this.#onConfigureItem,
      freshenItem: this.#onFreshenItem,
      untrackItem: this.#onUntrackItem,
      trackItem: this.#onTrackItem,
      trackSelected: this.#onTrackSelected,
      createCustom: this.#onCreateCustom
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/actor-inventory.hbs`
    }
  };

  #actor;
  #positionTimer = null;

  constructor(actor, options = {}) {
    super({
      ...options,
      uniqueId: `rations-and-rot-inventory-${actor.id}`
    });
    this.#actor = actor;
    ActorInventoryManager.#instances.set(actor.id, this);
  }

  static open(actor) {
    const existing = this.#instances.get(actor.id);
    if (existing?.rendered) {
      existing.bringToFront();
      return existing;
    }
    const app = new this(actor);
    void app.render(true);
    return app;
  }

  static refreshOpenForActorDebounced(actorId) {
    if (!actorId) return;
    const app = this.#instances.get(actorId);
    if (!app?.rendered) return;
    clearTimeout(this.#refreshTimers.get(actorId));
    const timer = setTimeout(() => {
      this.#refreshTimers.delete(actorId);
      if (app.rendered) void app.render();
    }, 100);
    this.#refreshTimers.set(actorId, timer);
  }

  get title() {
    return `${MODULE_TITLE} — ${this.#actor?.name ?? "Inventory"}`;
  }

  _canRender(options) {
    if (!this.#actor) return false;
    if (!game.user?.isGM && !this.#actor.isOwner) {
      ui.notifications.warn(`${MODULE_TITLE}: You cannot browse this Actor inventory.`);
      return false;
    }
    return super._canRender(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const data = SpoilageService.getActorInventoryData(this.#actor);
    return {
      ...context,
      ...data,
      canManage: SpoilageService.canManageActor(this.#actor),
      empty: data.items.length === 0
    };
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const saved = game.settings.get(MODULE_ID, SETTINGS.INVENTORY_POSITION) ?? {};
    const permitted = {};
    for (const key of ["left", "top", "width", "height"]) {
      if (Number.isFinite(Number(saved[key]))) permitted[key] = Number(saved[key]);
    }
    if (Object.keys(permitted).length > 0) this.setPosition(permitted);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const search = this.element?.querySelector("[data-rnr-inventory-search]");
    const selectAll = this.element?.querySelector("[data-rnr-select-all]");
    const trackButton = this.element?.querySelector("[data-action='trackSelected']");
    const selectedCount = this.element?.querySelector("[data-rnr-selected-count]");

    const visibleSelectable = () => [...this.element.querySelectorAll("[data-rnr-item-row]:not([hidden]) [data-rnr-track-select]:not(:disabled)")];
    const updateSelection = () => {
      const selected = [...this.element.querySelectorAll("[data-rnr-track-select]:checked")];
      if (trackButton) trackButton.disabled = selected.length === 0;
      if (selectedCount) selectedCount.textContent = String(selected.length);
      if (selectAll) {
        const visible = visibleSelectable();
        selectAll.checked = visible.length > 0 && visible.every((checkbox) => checkbox.checked);
        selectAll.indeterminate = visible.some((checkbox) => checkbox.checked) && !selectAll.checked;
      }
    };

    if (search) {
      search.addEventListener("input", () => {
        const query = search.value.trim().toLocaleLowerCase();
        for (const row of this.element.querySelectorAll("[data-rnr-item-row]")) {
          const haystack = (row.dataset.search ?? "").toLocaleLowerCase();
          row.hidden = Boolean(query) && !haystack.includes(query);
        }
        updateSelection();
      });
    }

    if (selectAll) {
      selectAll.addEventListener("change", () => {
        for (const checkbox of visibleSelectable()) checkbox.checked = selectAll.checked;
        updateSelection();
      });
    }

    for (const checkbox of this.element.querySelectorAll("[data-rnr-track-select]")) {
      checkbox.addEventListener("change", updateSelection);
    }
    updateSelection();
  }

  _onPosition(position) {
    super._onPosition(position);
    clearTimeout(this.#positionTimer);
    this.#positionTimer = setTimeout(() => {
      void game.settings.set(MODULE_ID, SETTINGS.INVENTORY_POSITION, {
        left: position.left,
        top: position.top,
        width: position.width,
        height: position.height
      });
    }, 250);
  }

  _onClose(options) {
    clearTimeout(this.#positionTimer);
    clearTimeout(ActorInventoryManager.#refreshTimers.get(this.#actor?.id));
    ActorInventoryManager.#refreshTimers.delete(this.#actor?.id);
    if (ActorInventoryManager.#instances.get(this.#actor?.id) === this) {
      ActorInventoryManager.#instances.delete(this.#actor.id);
    }
    return super._onClose(options);
  }

  static async #resolveUuid(target) {
    const uuid = target?.dataset?.uuid;
    if (!uuid) return null;
    try {
      return await fromUuid(uuid);
    } catch (error) {
      logger.warnOnce(`bad-inventory-uuid:${uuid}`, `Could not resolve document UUID ${uuid}.`, error);
      return null;
    }
  }

  static async #onRefresh() {
    try {
      if (SpoilageService.isAutomationAuthority()) {
        await SpoilageService.reconcileTracked({ force: true, notify: false });
      }
      await this.render();
    } catch (error) {
      logger.error("Actor inventory refresh failed.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not refresh this inventory.`);
    }
  }

  static async #onScanActor() {
    try {
      const count = await SpoilageService.scanAndTrack({ actors: [this.#actor] });
      await SpoilageService.reconcileTracked({ force: true, notify: false });
      ui.notifications.info(`${MODULE_TITLE}: ${count} new food item${count === 1 ? "" : "s"} added for ${this.#actor.name}.`);
      await this.render();
    } catch (error) {
      logger.error("Actor inventory scan failed.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not scan ${this.#actor.name}.`);
    }
  }

  static async #onOpenActor() {
    if (this.#actor?.sheet) this.#actor.sheet.render(true);
  }

  static async #onOpenItem(event, target) {
    const item = await this.constructor.#resolveUuid(target);
    if (item?.sheet) item.sheet.render(true);
  }

  static async #onConfigureItem(event, target) {
    const item = await this.constructor.#resolveUuid(target);
    if (item) ItemSpoilageConfig.open(item);
  }

  static async #onFreshenItem(event, target) {
    const item = await this.constructor.#resolveUuid(target);
    if (!item) return;
    try {
      await SpoilageService.refreshItem(item);
      ui.notifications.info(`${MODULE_TITLE}: ${item.name} freshness reset.`);
      await this.render();
    } catch (error) {
      logger.error("Could not refresh Item freshness.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not refresh ${item.name}.`);
    }
  }

  static async #onUntrackItem(event, target) {
    const item = await this.constructor.#resolveUuid(target);
    if (!item) return;
    try {
      await SpoilageService.untrackItem(item);
      ui.notifications.info(`${MODULE_TITLE}: Stopped tracking ${item.name}.`);
      await this.render();
    } catch (error) {
      logger.error("Could not stop tracking Item.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not stop tracking ${item.name}.`);
    }
  }

  static async #onTrackItem(event, target) {
    const item = await this.constructor.#resolveUuid(target);
    if (!item) return;
    try {
      await SpoilageService.trackItem(item);
      ui.notifications.info(`${MODULE_TITLE}: ${item.name} is now tracked as spoilable.`);
      await this.render();
    } catch (error) {
      logger.error("Could not track Item.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not track ${item.name}.`);
    }
  }

  static async #onTrackSelected() {
    const itemIds = [...(this.element?.querySelectorAll("[data-rnr-track-select]:checked") ?? [])]
      .map((checkbox) => checkbox.value);
    if (itemIds.length === 0) return;

    try {
      const count = await SpoilageService.trackItems(this.#actor, itemIds);
      ui.notifications.info(`${MODULE_TITLE}: ${count} selected Item${count === 1 ? "" : "s"} marked as spoilable.`);
      await this.render();
    } catch (error) {
      logger.error("Could not bulk-track selected Items.", error);
      ui.notifications.error(`${MODULE_TITLE}: Could not track the selected Items.`);
    }
  }

  static async #onCreateCustom() {
    CustomSpoilableItem.open(this.#actor);
  }
}
