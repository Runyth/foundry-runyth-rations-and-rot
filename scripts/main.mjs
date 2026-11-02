import { MODULE_ID, MODULE_TITLE, MODULE_VERSION } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { SpoilageDashboard } from "./apps/dashboard.mjs";
import { ActorScopePicker } from "./apps/actor-scope-picker.mjs";
import { ActorInventoryManager } from "./apps/actor-inventory.mjs";
import { ItemSpoilageConfig } from "./apps/item-config.mjs";
import { SpoilageService } from "./services/spoilage-service.mjs";
import { logger } from "./logger.mjs";

let settingsChangeTimer = null;

function embeddedActorItem(application) {
  const candidate = application?.document ?? application?.item ?? application?.object;
  if (candidate?.documentName !== "Item") return null;
  if (candidate.parent?.documentName !== "Actor") return null;
  return candidate;
}

function scheduleSettingsReconcile() {
  SpoilageService.invalidateSchedule();
  clearTimeout(settingsChangeTimer);
  settingsChangeTimer = setTimeout(async () => {
    try {
      if (SpoilageService.isAutomationAuthority()) {
        await SpoilageService.scanAndTrack();
        await SpoilageService.reconcileTracked({ force: true, notify: false });
      }
      SpoilageDashboard.refreshOpenDebounced();
    } catch (error) {
      logger.error("Could not apply changed module settings.", error);
    }
  }, 100);
}

async function resolveItem(itemOrUuid) {
  if (itemOrUuid?.documentName === "Item") return itemOrUuid;
  if (typeof itemOrUuid !== "string") return null;
  const document = await fromUuid(itemOrUuid);
  return document?.documentName === "Item" ? document : null;
}

async function resolveActor(actorOrUuid) {
  if (actorOrUuid?.documentName === "Actor") return actorOrUuid;
  if (typeof actorOrUuid !== "string") return null;
  const document = await fromUuid(actorOrUuid);
  return document?.documentName === "Actor" ? document : null;
}

Hooks.once("init", () => {
  registerSettings(SpoilageDashboard, ActorScopePicker, scheduleSettingsReconcile);

  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = Object.freeze({
      version: MODULE_VERSION,
      openDashboard: () => SpoilageDashboard.open(),
      openActorInventory: async (actorOrUuid) => {
        const actor = await resolveActor(actorOrUuid);
        return actor ? ActorInventoryManager.open(actor) : null;
      },
      openItemConfig: async (itemOrUuid) => {
        const item = await resolveItem(itemOrUuid);
        if (!item) return null;
        return ItemSpoilageConfig.open(item);
      },
      getStatus: async (itemOrUuid) => {
        const item = await resolveItem(itemOrUuid);
        return item ? SpoilageService.getStatus(item) : null;
      },
      trackItem: async (itemOrUuid, options = {}) => {
        const item = await resolveItem(itemOrUuid);
        if (!item) throw new Error(`${MODULE_TITLE}: Item not found.`);
        return SpoilageService.trackItem(item, options);
      },
      trackItems: async (actorOrUuid, itemIds, options = {}) => {
        const actor = await resolveActor(actorOrUuid);
        if (!actor) throw new Error(`${MODULE_TITLE}: Actor not found.`);
        return SpoilageService.trackItems(actor, itemIds, options);
      },
      createSpoilableItem: async (actorOrUuid, options = {}) => {
        const actor = await resolveActor(actorOrUuid);
        if (!actor) throw new Error(`${MODULE_TITLE}: Actor not found.`);
        return SpoilageService.createSpoilableItem(actor, options);
      },
      configureItem: async (itemOrUuid, options = {}) => {
        const item = await resolveItem(itemOrUuid);
        if (!item) throw new Error(`${MODULE_TITLE}: Item not found.`);
        return SpoilageService.configureItem(item, options);
      },
      refreshItem: async (itemOrUuid) => {
        const item = await resolveItem(itemOrUuid);
        if (!item) throw new Error(`${MODULE_TITLE}: Item not found.`);
        return SpoilageService.refreshItem(item);
      },
      untrackItem: async (itemOrUuid) => {
        const item = await resolveItem(itemOrUuid);
        if (!item) throw new Error(`${MODULE_TITLE}: Item not found.`);
        return SpoilageService.untrackItem(item);
      },
      scan: (options = {}) => SpoilageService.scanAndTrack(options),
      reconcile: (options = {}) => SpoilageService.reconcileTracked({ force: true, ...options })
    });
  }

  logger.debug(`Initialized ${MODULE_TITLE} ${MODULE_VERSION}.`);
});

Hooks.once("ready", async () => {
  SpoilageService.rebuildIndex();

  if (!SpoilageService.isAutomationAuthority()) return;
  try {
    await SpoilageService.scanAndTrack();
    await SpoilageService.reconcileTracked({ force: true, notify: false });
  } catch (error) {
    logger.error("Initial food spoilage reconciliation failed.", error);
    ui.notifications.error(`${MODULE_TITLE}: Initial spoilage scan failed. See console for details.`);
  }
});

Hooks.on("updateWorldTime", async (worldTime, delta) => {
  if (!SpoilageService.isAutomationAuthority()) return;
  if (!Number.isFinite(Number(delta)) || Number(delta) <= 0) return;

  try {
    await SpoilageService.reconcileTracked({ notify: true, force: false });
  } catch (error) {
    logger.error("World-time spoilage reconciliation failed.", error);
  }
});

Hooks.on("createItem", async (item, options, userId) => {
  try {
    await SpoilageService.maybeInitializeEligibleItem(item, userId);
  } catch (error) {
    logger.warn("Could not auto-initialize newly created food Item.", error);
  } finally {
    SpoilageService.indexItem(item);
    SpoilageDashboard.refreshOpenDebounced();
    ActorInventoryManager.refreshOpenForActorDebounced(item.parent?.id);
  }
});

Hooks.on("updateItem", async (item, change, options, userId) => {
  try {
    await SpoilageService.maybeInitializeEligibleItem(item, userId);
  } catch (error) {
    logger.warn("Could not auto-initialize an Item that became eligible for spoilage tracking.", error);
  } finally {
    SpoilageService.indexItem(item);
    SpoilageDashboard.refreshOpenDebounced();
    ActorInventoryManager.refreshOpenForActorDebounced(item.parent?.id);
  }
});

Hooks.on("deleteItem", (item) => {
  const actorId = item.parent?.id;
  SpoilageService.unindexItem(item);
  SpoilageDashboard.refreshOpenDebounced();
  ActorInventoryManager.refreshOpenForActorDebounced(actorId);
});

Hooks.on("createActor", () => {
  SpoilageService.invalidateSchedule();
  SpoilageDashboard.refreshOpenDebounced();
});

Hooks.on("deleteActor", (actor) => {
  SpoilageService.rebuildIndex();
  SpoilageDashboard.refreshOpenDebounced();
  ActorInventoryManager.refreshOpenForActorDebounced(actor?.id);
});

Hooks.on("updateActor", (actor) => {
  SpoilageService.invalidateSchedule();
  SpoilageDashboard.refreshOpenDebounced();
  ActorInventoryManager.refreshOpenForActorDebounced(actor?.id);
});

for (const hookName of ["createFolder", "updateFolder", "deleteFolder"]) {
  Hooks.on(hookName, (folder) => {
    if (folder?.type && folder.type !== "Actor") return;
    SpoilageService.invalidateSchedule();
    SpoilageDashboard.refreshOpenDebounced();
  });
}

Hooks.on("getHeaderControlsApplicationV2", (application, controls) => {
  const item = embeddedActorItem(application);
  if (!item || !SpoilageService.canManageItem(item)) return;

  controls.unshift({
    action: "rationsAndRotSpoilage",
    icon: "fa-solid fa-apple-whole",
    label: "Spoilage",
    visible: true,
    onClick: () => ItemSpoilageConfig.open(item)
  });
});

Hooks.on("getApplicationV1HeaderButtons", (application, buttons) => {
  const item = embeddedActorItem(application);
  if (!item || !SpoilageService.canManageItem(item)) return;

  buttons.unshift({
    label: "Spoilage",
    class: "rations-and-rot-spoilage",
    icon: "fas fa-apple-whole",
    onclick: () => ItemSpoilageConfig.open(item)
  });
});
