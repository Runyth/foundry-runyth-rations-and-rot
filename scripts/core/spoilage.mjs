// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  STATES
} from "../constants.mjs";

/**
 * Coerce a value to a finite number and clamp it to a safe range.
 */
export function finiteNumber(value, fallback = 0, { min = -Infinity, max = Infinity } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Return a normalized tracking record. This is deliberately plain-data-only so
 * the calculation core can be unit tested outside Foundry.
 */
export function normalizeTrackingData(raw = {}, now = 0, defaults = {}) {
  const defaultShelfLifeSeconds = finiteNumber(
    defaults.shelfLifeSeconds,
    3 * SECONDS_PER_DAY,
    { min: 1 }
  );

  return {
    enabled: raw.enabled !== false,
    shelfLifeSeconds: finiteNumber(raw.shelfLifeSeconds, defaultShelfLifeSeconds, { min: 1 }),
    accumulatedAgeSeconds: finiteNumber(raw.accumulatedAgeSeconds, 0, { min: 0 }),
    baselineWorldTime: finiteNumber(raw.baselineWorldTime, finiteNumber(now, 0), { min: 0 }),
    rate: finiteNumber(raw.rate, 1, { min: 0, max: 100 }),
    state: Object.values(STATES).includes(raw.state) ? raw.state : STATES.FRESH,
    autoDetected: Boolean(raw.autoDetected),
    note: typeof raw.note === "string" ? raw.note : ""
  };
}

/**
 * Calculate effective spoilage age at a world-time timestamp.
 *
 * Backward world-time movement never makes food fresher. This avoids exploits
 * and accidental corruption when a calendar is corrected backwards.
 */
export function effectiveAgeSeconds(data, now) {
  const normalized = normalizeTrackingData(data, now);
  const elapsedWorldSeconds = Math.max(0, finiteNumber(now, normalized.baselineWorldTime) - normalized.baselineWorldTime);
  return normalized.accumulatedAgeSeconds + (elapsedWorldSeconds * normalized.rate);
}

export function remainingSeconds(data, now) {
  const normalized = normalizeTrackingData(data, now);
  return normalized.shelfLifeSeconds - effectiveAgeSeconds(normalized, now);
}

export function computeState(data, now, warningSeconds) {
  const remaining = remainingSeconds(data, now);
  if (remaining <= 0) return STATES.SPOILED;
  if (remaining <= Math.max(0, finiteNumber(warningSeconds, 0))) return STATES.WARNING;
  return STATES.FRESH;
}

/**
 * Settle elapsed time into accumulated age and move the baseline to now.
 * Use this before changing a spoilage rate so prior time keeps the old rate.
 */
export function settleTrackingData(data, now) {
  const normalized = normalizeTrackingData(data, now);
  return {
    ...normalized,
    accumulatedAgeSeconds: effectiveAgeSeconds(normalized, now),
    baselineWorldTime: Math.max(0, finiteNumber(now, normalized.baselineWorldTime))
  };
}

export function configureTrackingData(data, now, changes = {}) {
  const settled = settleTrackingData(data, now);
  const updated = {
    ...settled,
    shelfLifeSeconds: finiteNumber(changes.shelfLifeSeconds, settled.shelfLifeSeconds, { min: 1 }),
    rate: finiteNumber(changes.rate, settled.rate, { min: 0, max: 100 }),
    note: typeof changes.note === "string" ? changes.note : settled.note,
    enabled: changes.enabled ?? settled.enabled,
    autoDetected: changes.autoDetected ?? settled.autoDetected
  };

  return updated;
}

export function resetFreshness(data, now) {
  const normalized = normalizeTrackingData(data, now);
  return {
    ...normalized,
    accumulatedAgeSeconds: 0,
    baselineWorldTime: Math.max(0, finiteNumber(now, 0)),
    state: STATES.FRESH
  };
}

/**
 * Calculate the next world-time instant at which a state transition can occur.
 * Returns Infinity for suspended or already spoiled food.
 */
export function nextTransitionWorldTime(data, now, warningSeconds) {
  const normalized = normalizeTrackingData(data, now);
  if (!normalized.enabled || normalized.rate <= 0) return Infinity;

  const age = effectiveAgeSeconds(normalized, now);
  const warningAge = Math.max(0, normalized.shelfLifeSeconds - Math.max(0, finiteNumber(warningSeconds, 0)));

  let targetAge;
  if (age < warningAge) targetAge = warningAge;
  else if (age < normalized.shelfLifeSeconds) targetAge = normalized.shelfLifeSeconds;
  else return Infinity;

  const spoilageSecondsNeeded = Math.max(0, targetAge - age);
  return finiteNumber(now, 0) + (spoilageSecondsNeeded / normalized.rate);
}

export function formatDuration(seconds) {
  const finite = finiteNumber(seconds, 0);
  const sign = finite < 0 ? -1 : 1;
  let remaining = Math.abs(finite);

  const days = Math.floor(remaining / SECONDS_PER_DAY);
  remaining -= days * SECONDS_PER_DAY;
  const hours = Math.floor(remaining / SECONDS_PER_HOUR);
  remaining -= hours * SECONDS_PER_HOUR;
  const minutes = Math.floor(remaining / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 && parts.length < 2) parts.push(`${hours}h`);
  if (minutes > 0 && parts.length < 2) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push("<1m");

  return {
    text: parts.join(" "),
    overdue: sign < 0
  };
}

/**
 * D&D 5e has a dedicated consumable food subtype. Keep detection conservative:
 * manual tracking remains available for every system and item type.
 */
export function isDnd5eFood(itemLike) {
  if (!itemLike || itemLike.type !== "consumable") return false;
  const subtype = itemLike.system?.type?.value ?? itemLike.system?.type;
  return subtype === "food";
}

export function matchesNamePattern(itemLike, pattern) {
  if (!itemLike?.name || typeof pattern !== "string" || pattern.length === 0) return false;
  try {
    return new RegExp(pattern, "iu").test(itemLike.name);
  } catch {
    return false;
  }
}
