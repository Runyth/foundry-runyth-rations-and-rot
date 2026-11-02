// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  FLAGS,
  MODULE_ID,
  MODULE_TITLE,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SETTINGS,
  STATES
} from "../constants.mjs";
import {
  actorMatchesSelection,
  folderPath,
  normalizeIdList
} from "../core/actor-scope.mjs";
import {
  computeState,
  configureTrackingData,
  effectiveAgeSeconds,
  formatDuration,
  isDnd5eFood,
  matchesNamePattern,
  nextTransitionWorldTime,
  normalizeTrackingData,
  remainingSeconds,
  resetFreshness
} from "../core/spoilage.mjs";
import { logger } from "../logger.mjs";

function currentWorldTime() {
  return Math.max(0, Number(game?.time?.worldTime ?? 0));
}

function defaultShelfLifeSeconds() {
  return Math.max(1, Number(game.settings.get(MODULE_ID, SETTINGS.DEFAULT_SHELF_LIFE_DAYS)) * SECONDS_PER_DAY);
}

function warningSeconds() {
  return Math.max(0, Number(game.settings.get(MODULE_ID, SETTINGS.WARNING_HOURS)) * SECONDS_PER_HOUR);
}

function trackingPath() {
  return `flags.${MODULE_ID}.${FLAGS.TRACKING}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function itemTracking(item) {
  return item?.getFlag?.(MODULE_ID, FLAGS.TRACKING) ?? item?.flags?.[MODULE_ID]?.[FLAGS.TRACKING] ?? null;
}

function newTrackingData({ autoDetected = false, shelfLifeDays, rate = 1, note = "" } = {}) {
  const now = currentWorldTime();
  const shelfLifeSeconds = Number.isFinite(Number(shelfLifeDays))
    ? Math.max(1, Number(shelfLifeDays) * SECONDS_PER_DAY)
    : defaultShelfLifeSeconds();
  return normalizeTrackingData({
    enabled: true,
    shelfLifeSeconds,
    accumulatedAgeSeconds: 0,
    baselineWorldTime: now,
    rate,
    state: STATES.FRESH,
    autoDetected,
    note
  }, now, { shelfLifeSeconds });
}

function hasPlayerOwner(actor) {
  if (typeof actor?.hasPlayerOwner === "boolean") return actor.hasPlayerOwner;
  if (!actor?.ownership || !game?.users) return false;

  const ownerLevel = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  return game.users.some((user) => !user.isGM && Number(actor.ownership[user.id] ?? 0) >= ownerLevel);
}

function actorMatchesCoarseScope(actor) {
  const scope = game.settings.get(MODULE_ID, SETTINGS.ACTOR_SCOPE);
  if (scope === "all") return true;
  if (scope === "characters") return actor?.type === "character";
  return hasPlayerOwner(actor);
}

function actorSelectionSettings() {
  return {
    folderPattern: String(game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER_PATTERN) ?? ""),
    recursive: Boolean(game.settings.get(MODULE_ID, SETTINGS.ACTOR_FOLDER_RECURSIVE)),
    selectedActorIds: normalizeIdList(game.settings.get(MODULE_ID, SETTINGS.SELECTED_ACTOR_IDS)),
    selectedFolderIds: normalizeIdList(game.settings.get(MODULE_ID, SETTINGS.SELECTED_ACTOR_FOLDER_IDS))
  };
}

function actorMatchesDiscoveryScope(actor) {
  if (!actorMatchesCoarseScope(actor)) return false;
  const options = actorSelectionSettings();
  if (options.folderPattern.trim()) {
    try {
      new RegExp(options.folderPattern, "iu");
    } catch (error) {
      logger.warnOnce(
        "invalid-actor-folder-pattern",
        "Actor folder regular expression is invalid; the folder-regex filter is ignored until corrected.",
        error
      );
    }
  }
  return actorMatchesSelection(actor, options);
}

function actorHasTrackedItems(actor) {
  return [...(actor?.items ?? [])].some((item) => Boolean(itemTracking(item)));
}

function actorVisibleToCurrentUser(actor) {
  if (game.user?.isGM) return actorMatchesDiscoveryScope(actor) || actorHasTrackedItems(actor);
  if (!game.settings.get(MODULE_ID, SETTINGS.DASHBOARD_VISIBLE_TO_PLAYERS)) return false;
  return Boolean(actor?.isOwner);
}

function canManageActor(actor) {
  if (!actor) return false;
  if (game.user?.isGM) return true;
  if (!game.settings.get(MODULE_ID, SETTINGS.PLAYERS_CAN_MANAGE)) return false;
  return Boolean(actor.isOwner);
}

function canManageItem(item) {
  if (!item) return false;
  if (game.user?.isGM) return true;
  if (!game.settings.get(MODULE_ID, SETTINGS.PLAYERS_CAN_MANAGE)) return false;
  return Boolean(item.isOwner ?? item.parent?.isOwner);
}

function shouldAutoDetect(item) {
  if (!item?.parent || item.parent.documentName !== "Actor") return false;

  if (game.system?.id === "dnd5e" && game.settings.get(MODULE_ID, SETTINGS.AUTO_DETECT_DND5E) && isDnd5eFood(item)) {
    return true;
  }

  if (!game.settings.get(MODULE_ID, SETTINGS.ENABLE_NAME_MATCHING)) return false;
  const pattern = game.settings.get(MODULE_ID, SETTINGS.NAME_PATTERN);
  try {
    new RegExp(pattern, "iu");
  } catch (error) {
    logger.warnOnce("invalid-name-pattern", "Food name regular expression is invalid; name-based auto-detection is disabled until it is corrected.", error);
    return false;
  }

  return matchesNamePattern(item, pattern);
}

function isAutomationAuthority() {
  const activeGM = game.users?.activeGM;
  return Boolean(activeGM && activeGM.id === game.user?.id);
}

function ownerWhisperIds(actor) {
  const recipients = new Set();
  const ownerLevel = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;

  for (const user of game.users ?? []) {
    if (user.isGM) {
      recipients.add(user.id);
      continue;
    }

    try {
      if (actor?.testUserPermission?.(user, ownerLevel)) recipients.add(user.id);
    } catch {
      if (Number(actor?.ownership?.[user.id] ?? 0) >= ownerLevel) recipients.add(user.id);
    }
  }

  return [...recipients];
}

function gmWhisperIds() {
  return (game.users ?? []).filter((user) => user.isGM).map((user) => user.id);
}

function stateLabel(state) {
  if (state === STATES.SPOILED) return "Spoiled";
  if (state === STATES.WARNING) return "Near spoilage";
  return "Fresh";
}

function itemQuantity(item) {
  const quantityRaw = item?.system?.quantity;
  const quantity = typeof quantityRaw === "object" ? quantityRaw?.value : quantityRaw;
  return Number.isFinite(Number(quantity)) ? Number(quantity) : null;
}

function itemTypeLabel(type) {
  const raw = globalThis.CONFIG?.Item?.typeLabels?.[type];
  if (!raw) return String(type ?? "Item");
  try {
    return game.i18n?.localize?.(raw) ?? raw;
  } catch {
    return raw;
  }
}

function allowedItemTypes(actor) {
  const discovered = new Set();
  const implementationTypes = globalThis.foundry?.documents?.Item?.implementation?.TYPES;
  if (Array.isArray(implementationTypes)) {
    for (const type of implementationTypes) discovered.add(String(type));
  }
  for (const item of actor?.items ?? []) {
    if (item?.type) discovered.add(String(item.type));
  }
  if (discovered.size === 0) discovered.add("loot");

  return [...discovered]
    .sort((a, b) => itemTypeLabel(a).localeCompare(itemTypeLabel(b)))
    .map((value) => ({ value, label: itemTypeLabel(value) }));
}

async function createTransitionMessage(transitions, whisper) {
  if (!transitions.length || !whisper.length) return;

  const shown = transitions.slice(0, 20);
  const list = shown.map(({ item, actor, newState }) => (
    `<li><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(actor.name)}: ${stateLabel(newState)}</li>`
  )).join("");
  const omitted = transitions.length - shown.length;
  const suffix = omitted > 0 ? `<p>…and ${omitted} more transition${omitted === 1 ? "" : "s"}.</p>` : "";

  await ChatMessage.create({
    speaker: { alias: MODULE_TITLE },
    content: `<section class="rnr-chat"><strong>${MODULE_TITLE}</strong><ul>${list}</ul>${suffix}</section>`,
    whisper
  });
}

async function notifyTransitions(transitions) {
  const audience = game.settings.get(MODULE_ID, SETTINGS.NOTIFICATION_AUDIENCE);
  if (audience === "none" || transitions.length === 0) return;

  if (audience === "gm") {
    await createTransitionMessage(transitions, gmWhisperIds());
    return;
  }

  const byActor = new Map();
  for (const transition of transitions) {
    const key = transition.actor.id;
    const bucket = byActor.get(key) ?? [];
    bucket.push(transition);
    byActor.set(key, bucket);
  }

  for (const actorTransitions of byActor.values()) {
    const actor = actorTransitions[0].actor;
    await createTransitionMessage(actorTransitions, ownerWhisperIds(actor));
  }
}

export class SpoilageService {
  static #trackedByActor = new Map();
  static #nextTransition = Infinity;
  static #reconcilePromise = null;

  static get nextTransition() {
    return this.#nextTransition;
  }

  static isAutomationAuthority() {
    return isAutomationAuthority();
  }

  static canManageActor(actor) {
    return canManageActor(actor);
  }

  static canManageItem(item) {
    return canManageItem(item);
  }

  static canOpenDashboard() {
    return Boolean(game.user?.isGM || game.settings.get(MODULE_ID, SETTINGS.DASHBOARD_VISIBLE_TO_PLAYERS));
  }

  static actorMatchesDiscoveryScope(actor) {
    return actorMatchesDiscoveryScope(actor);
  }

  static getActorFolderPath(actor) {
    return folderPath(actor?.folder);
  }

  static getAllowedItemTypes(actor) {
    const choices = allowedItemTypes(actor);
    const preferred = game.system?.id === "dnd5e" && choices.some((choice) => choice.value === "consumable")
      ? "consumable"
      : choices[0]?.value ?? "loot";
    return { choices, preferred };
  }

  static invalidateSchedule() {
    this.#nextTransition = -Infinity;
  }

  static rebuildIndex() {
    const rebuilt = new Map();
    for (const actor of game.actors ?? []) {
      const ids = new Set();
      for (const item of actor.items ?? []) {
        const tracking = itemTracking(item);
        if (tracking?.enabled !== false && tracking) ids.add(item.id);
      }
      if (ids.size > 0) rebuilt.set(actor.id, ids);
    }

    this.#trackedByActor = rebuilt;
    this.invalidateSchedule();
    logger.debug("Rebuilt tracked item index", {
      actors: rebuilt.size,
      items: [...rebuilt.values()].reduce((sum, ids) => sum + ids.size, 0)
    });
  }

  static indexItem(item) {
    const actor = item?.parent;
    if (!actor || actor.documentName !== "Actor") return;

    const tracking = itemTracking(item);
    const ids = this.#trackedByActor.get(actor.id) ?? new Set();
    if (tracking?.enabled !== false && tracking) ids.add(item.id);
    else ids.delete(item.id);

    if (ids.size > 0) this.#trackedByActor.set(actor.id, ids);
    else this.#trackedByActor.delete(actor.id);
    this.invalidateSchedule();
  }

  static unindexItem(item) {
    const actor = item?.parent;
    if (!actor || actor.documentName !== "Actor") return;
    const ids = this.#trackedByActor.get(actor.id);
    if (!ids) return;
    ids.delete(item.id);
    if (ids.size === 0) this.#trackedByActor.delete(actor.id);
    this.invalidateSchedule();
  }

  static async scanAndTrack({ actors = null } = {}) {
    const candidates = actors ?? [...(game.actors ?? [])].filter((actor) => (
      game.user?.isGM ? actorMatchesDiscoveryScope(actor) : actorVisibleToCurrentUser(actor)
    ));

    let tracked = 0;
    for (const actor of candidates) {
      if (!actor?.items || !canManageActor(actor)) continue;
      const updates = [];

      for (const item of actor.items) {
        if (itemTracking(item) || !shouldAutoDetect(item)) continue;
        updates.push({
          _id: item.id,
          [trackingPath()]: newTrackingData({ autoDetected: true })
        });
      }

      if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("Item", updates, { rationsAndRot: true });
        tracked += updates.length;
      }
    }

    if (tracked > 0) {
      this.rebuildIndex();
      logger.debug(`Auto-tracked ${tracked} food item(s).`);
    }
    return tracked;
  }

  static async maybeInitializeEligibleItem(item, userId) {
    if (!item?.parent || item.parent.documentName !== "Actor" || itemTracking(item) || !shouldAutoDetect(item)) return false;
    if (!actorMatchesDiscoveryScope(item.parent)) return false;

    const activeGM = game.users?.activeGM;
    const isAuthority = activeGM ? activeGM.id === game.user?.id : game.user?.id === userId;
    if (!isAuthority || !canManageItem(item)) return false;

    await item.update({
      [trackingPath()]: newTrackingData({ autoDetected: true })
    }, { rationsAndRot: true });
    this.indexItem(item);
    return true;
  }

  static async trackItem(item, { shelfLifeDays, rate = 1, note = "", autoDetected = false } = {}) {
    if (!canManageItem(item)) throw new Error("You do not have permission to manage this Item.");
    const now = currentWorldTime();
    const base = newTrackingData({ autoDetected });
    const configured = configureTrackingData(base, now, {
      shelfLifeSeconds: Number.isFinite(Number(shelfLifeDays)) ? Number(shelfLifeDays) * SECONDS_PER_DAY : base.shelfLifeSeconds,
      rate,
      note,
      enabled: true,
      autoDetected
    });
    configured.state = computeState(configured, now, warningSeconds());

    await item.update({ [trackingPath()]: configured }, { rationsAndRot: true });
    this.indexItem(item);
    return configured;
  }

  static async trackItems(actor, itemIds, { shelfLifeDays, rate = 1, note = "" } = {}) {
    if (!canManageActor(actor)) throw new Error("You do not have permission to manage this Actor.");
    const ids = new Set(normalizeIdList(itemIds));
    if (ids.size === 0) return 0;

    const updates = [];
    for (const item of actor.items ?? []) {
      if (!ids.has(item.id) || itemTracking(item)) continue;
      if (!canManageItem(item)) continue;
      const tracking = newTrackingData({ autoDetected: false, shelfLifeDays, rate, note });
      tracking.state = computeState(tracking, currentWorldTime(), warningSeconds());
      updates.push({ _id: item.id, [trackingPath()]: tracking });
    }

    if (updates.length === 0) return 0;
    await actor.updateEmbeddedDocuments("Item", updates, { rationsAndRot: true });
    this.rebuildIndex();
    return updates.length;
  }

  static async createSpoilableItem(actor, {
    name,
    type,
    shelfLifeDays,
    rate = 1,
    note = ""
  } = {}) {
    if (!canManageActor(actor)) throw new Error("You do not have permission to manage this Actor.");
    const itemName = String(name ?? "").trim();
    if (!itemName) throw new Error("Item name is required.");

    const { choices, preferred } = this.getAllowedItemTypes(actor);
    const allowed = new Set(choices.map((choice) => choice.value));
    const itemType = allowed.has(String(type ?? "")) ? String(type) : preferred;
    const tracking = newTrackingData({ autoDetected: false, shelfLifeDays, rate, note });
    tracking.state = computeState(tracking, currentWorldTime(), warningSeconds());

    const source = {
      name: itemName,
      type: itemType,
      flags: {
        [MODULE_ID]: {
          [FLAGS.TRACKING]: tracking
        }
      }
    };

    if (game.system?.id === "dnd5e" && itemType === "consumable") {
      source.system = { type: { value: "food" } };
    }

    const created = await actor.createEmbeddedDocuments("Item", [source], { rationsAndRot: true });
    const item = created?.[0] ?? null;
    if (item) this.indexItem(item);
    return item;
  }

  static async configureItem(item, { shelfLifeDays, rate, note, enabled = true } = {}) {
    if (!canManageItem(item)) throw new Error("You do not have permission to manage this Item.");
    if (!enabled) return this.untrackItem(item);

    const now = currentWorldTime();
    const current = itemTracking(item) ?? newTrackingData({ autoDetected: false });
    const configured = configureTrackingData(current, now, {
      shelfLifeSeconds: Number.isFinite(Number(shelfLifeDays)) ? Number(shelfLifeDays) * SECONDS_PER_DAY : undefined,
      rate,
      note,
      enabled: true
    });
    configured.state = computeState(configured, now, warningSeconds());

    await item.update({ [trackingPath()]: configured }, { rationsAndRot: true });
    this.indexItem(item);
    return configured;
  }

  static async refreshItem(item) {
    if (!canManageItem(item)) throw new Error("You do not have permission to manage this Item.");
    const current = itemTracking(item);
    if (!current) return this.trackItem(item);

    const now = currentWorldTime();
    const refreshed = resetFreshness(current, now);
    refreshed.state = STATES.FRESH;
    await item.update({ [trackingPath()]: refreshed }, { rationsAndRot: true });
    this.indexItem(item);
    return refreshed;
  }

  static async untrackItem(item) {
    if (!canManageItem(item)) throw new Error("You do not have permission to manage this Item.");
    if (!itemTracking(item)) {
      this.unindexItem(item);
      return false;
    }
    await item.unsetFlag(MODULE_ID, FLAGS.TRACKING);
    this.unindexItem(item);
    return true;
  }

  static getStatus(item, now = currentWorldTime()) {
    const raw = itemTracking(item);
    if (!raw) return null;

    const data = normalizeTrackingData(raw, now, { shelfLifeSeconds: defaultShelfLifeSeconds() });
    const remaining = remainingSeconds(data, now);
    const duration = formatDuration(remaining);
    const state = computeState(data, now, warningSeconds());
    const age = effectiveAgeSeconds(data, now);
    const rawProgress = data.shelfLifeSeconds > 0 ? Math.min(100, Math.max(0, (age / data.shelfLifeSeconds) * 100)) : 100;
    const progress = Math.round(rawProgress * 10) / 10;

    return {
      data,
      state,
      stateLabel: stateLabel(state),
      remainingSeconds: remaining,
      remainingLabel: duration.overdue ? `${duration.text} overdue` : duration.text,
      progress,
      shelfLifeDays: Math.round((data.shelfLifeSeconds / SECONDS_PER_DAY) * 100) / 100
    };
  }

  static getActorInventoryData(actor) {
    const now = currentWorldTime();
    const items = [...(actor?.items ?? [])].map((item) => {
      const status = this.getStatus(item, now);
      return {
        id: item.id,
        uuid: item.uuid,
        name: item.name,
        img: item.img,
        type: item.type,
        typeLabel: itemTypeLabel(item.type),
        quantity: itemQuantity(item),
        tracked: Boolean(status),
        canManage: canManageItem(item),
        search: `${item.name ?? ""} ${item.type ?? ""} ${itemTypeLabel(item.type)} ${status?.stateLabel ?? "untracked"}`,
        ...status
      };
    });

    const stateRank = { spoiled: 0, warning: 1, fresh: 2 };
    items.sort((a, b) => {
      if (a.tracked !== b.tracked) return a.tracked ? -1 : 1;
      if (a.tracked && b.tracked) {
        const stateOrder = stateRank[a.state] - stateRank[b.state];
        if (stateOrder !== 0) return stateOrder;
        const remainingOrder = a.remainingSeconds - b.remainingSeconds;
        if (remainingOrder !== 0) return remainingOrder;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      actor: {
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        img: actor.img,
        folderPath: folderPath(actor.folder),
        canManage: canManageActor(actor)
      },
      items,
      trackedCount: items.filter((item) => item.tracked).length,
      untrackedCount: items.filter((item) => !item.tracked).length
    };
  }

  static getDashboardData() {
    const actors = [];
    const summary = { total: 0, fresh: 0, warning: 0, spoiled: 0 };
    const now = currentWorldTime();

    for (const actor of game.actors ?? []) {
      if (!actorVisibleToCurrentUser(actor)) continue;
      const actorSummary = { total: 0, fresh: 0, warning: 0, spoiled: 0 };
      const trackedNames = [];

      for (const item of actor.items ?? []) {
        const status = this.getStatus(item, now);
        if (!status) continue;
        trackedNames.push(item.name);
        actorSummary.total += 1;
        actorSummary[status.state] += 1;
        summary.total += 1;
        summary[status.state] += 1;
      }

      actors.push({
        id: actor.id,
        uuid: actor.uuid,
        name: actor.name,
        img: actor.img,
        folderPath: folderPath(actor.folder) || "Root",
        itemCount: actor.items?.size ?? actor.items?.length ?? 0,
        canManage: canManageActor(actor),
        summary: actorSummary,
        search: `${actor.name ?? ""} ${folderPath(actor.folder)} ${trackedNames.join(" ")}`
      });
    }

    actors.sort((a, b) => a.name.localeCompare(b.name));
    return { actors, summary, worldTime: now };
  }

  static async reconcileTracked({ notify = true, force = false } = {}) {
    if (!game.settings.get(MODULE_ID, SETTINGS.ENABLE_AUTOMATION)) return { updated: 0, transitions: [] };
    if (!isAutomationAuthority()) return { updated: 0, transitions: [] };

    const now = currentWorldTime();
    if (!force && now < this.#nextTransition) return { updated: 0, transitions: [] };
    if (this.#reconcilePromise) return this.#reconcilePromise;

    this.#reconcilePromise = this.#performReconcile(now, { notify });
    try {
      return await this.#reconcilePromise;
    } finally {
      this.#reconcilePromise = null;
    }
  }

  static async #performReconcile(now, { notify }) {
    const transitions = [];
    let updated = 0;
    let nextTransition = Infinity;

    for (const [actorId, itemIds] of this.#trackedByActor.entries()) {
      const actor = game.actors?.get(actorId);
      if (!actor) continue;

      const updates = [];
      for (const itemId of itemIds) {
        const item = actor.items?.get(itemId);
        const raw = itemTracking(item);
        if (!item || !raw || raw.enabled === false) continue;

        const data = normalizeTrackingData(raw, now, { shelfLifeSeconds: defaultShelfLifeSeconds() });
        const oldState = data.state;
        const newState = computeState(data, now, warningSeconds());
        const itemNextTransition = nextTransitionWorldTime(data, now, warningSeconds());
        nextTransition = Math.min(nextTransition, itemNextTransition);

        if (newState === oldState) continue;
        const changed = { ...data, state: newState };
        updates.push({ _id: item.id, [trackingPath()]: changed });
        transitions.push({ item, actor, oldState, newState });
      }

      if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("Item", updates, { rationsAndRot: true });
        updated += updates.length;
      }
    }

    this.#nextTransition = nextTransition;
    if (notify && transitions.length > 0) await notifyTransitions(transitions);

    for (const transition of transitions) {
      Hooks.callAll(`${MODULE_ID}.stateChanged`, transition.item, transition.oldState, transition.newState);
    }

    logger.debug("Reconciled spoilage state", {
      updated,
      transitions: transitions.length,
      nextTransition: Number.isFinite(nextTransition) ? nextTransition : null
    });
    return { updated, transitions };
  }
}
