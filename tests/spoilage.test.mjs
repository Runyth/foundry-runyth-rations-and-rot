// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import test from "node:test";
import assert from "node:assert/strict";

import {
  computeState,
  configureTrackingData,
  effectiveAgeSeconds,
  formatDuration,
  isDnd5eFood,
  matchesNamePattern,
  nextTransitionWorldTime,
  remainingSeconds,
  resetFreshness
} from "../scripts/core/spoilage.mjs";
import { SECONDS_PER_DAY, SECONDS_PER_HOUR, STATES } from "../scripts/constants.mjs";

function tracking(overrides = {}) {
  return {
    enabled: true,
    shelfLifeSeconds: 3 * SECONDS_PER_DAY,
    accumulatedAgeSeconds: 0,
    baselineWorldTime: 1000,
    rate: 1,
    state: STATES.FRESH,
    autoDetected: false,
    note: "",
    ...overrides
  };
}

test("effective age follows positive world-time at the configured rate", () => {
  const data = tracking({ rate: 0.5 });
  assert.equal(effectiveAgeSeconds(data, 1000 + (2 * SECONDS_PER_DAY)), SECONDS_PER_DAY);
});

test("backward world-time movement does not make food fresher", () => {
  const data = tracking({ accumulatedAgeSeconds: 5000 });
  assert.equal(effectiveAgeSeconds(data, 500), 5000);
});

test("state moves from fresh to warning to spoiled at boundaries", () => {
  const data = tracking();
  const warning = SECONDS_PER_DAY;

  assert.equal(computeState(data, 1000, warning), STATES.FRESH);
  assert.equal(computeState(data, 1000 + (2 * SECONDS_PER_DAY), warning), STATES.WARNING);
  assert.equal(computeState(data, 1000 + (3 * SECONDS_PER_DAY), warning), STATES.SPOILED);
});

test("suspended storage freezes spoilage age", () => {
  const data = tracking({ rate: 0, accumulatedAgeSeconds: SECONDS_PER_DAY });
  assert.equal(remainingSeconds(data, 1000 + (100 * SECONDS_PER_DAY)), 2 * SECONDS_PER_DAY);
  assert.equal(nextTransitionWorldTime(data, 1000, SECONDS_PER_DAY), Infinity);
});

test("changing rate settles prior age before applying the new rate", () => {
  const data = tracking({ rate: 1 });
  const changedAt = 1000 + SECONDS_PER_DAY;
  const changed = configureTrackingData(data, changedAt, { rate: 0.5 });

  assert.equal(changed.accumulatedAgeSeconds, SECONDS_PER_DAY);
  assert.equal(changed.baselineWorldTime, changedAt);
  assert.equal(effectiveAgeSeconds(changed, changedAt + SECONDS_PER_DAY), 1.5 * SECONDS_PER_DAY);
});

test("reset freshness preserves configuration and resets age", () => {
  const data = tracking({ rate: 0.25, note: "ice cellar", accumulatedAgeSeconds: SECONDS_PER_DAY });
  const refreshed = resetFreshness(data, 9000);

  assert.equal(refreshed.rate, 0.25);
  assert.equal(refreshed.note, "ice cellar");
  assert.equal(refreshed.accumulatedAgeSeconds, 0);
  assert.equal(refreshed.baselineWorldTime, 9000);
  assert.equal(refreshed.state, STATES.FRESH);
});

test("next transition targets warning first and spoilage second", () => {
  const data = tracking();
  const warning = SECONDS_PER_DAY;
  const first = nextTransitionWorldTime(data, 1000, warning);
  assert.equal(first, 1000 + (2 * SECONDS_PER_DAY));

  const warningData = tracking({
    accumulatedAgeSeconds: 2 * SECONDS_PER_DAY,
    baselineWorldTime: 1000,
    state: STATES.WARNING
  });
  const second = nextTransitionWorldTime(warningData, 1000, warning);
  assert.equal(second, 1000 + SECONDS_PER_DAY);
});

test("duration formatting is compact and marks overdue values", () => {
  assert.deepEqual(formatDuration((2 * SECONDS_PER_DAY) + (3 * SECONDS_PER_HOUR)), {
    text: "2d 3h",
    overdue: false
  });
  assert.equal(formatDuration(-90).overdue, true);
});

test("D&D 5e food detection is conservative", () => {
  assert.equal(isDnd5eFood({ type: "consumable", system: { type: { value: "food" } } }), true);
  assert.equal(isDnd5eFood({ type: "consumable", system: { type: { value: "potion" } } }), false);
  assert.equal(isDnd5eFood({ type: "loot", system: { type: { value: "food" } } }), false);
});

test("optional name regex detection handles valid and invalid patterns safely", () => {
  assert.equal(matchesNamePattern({ name: "Salted Fish" }, String.raw`\bfish\b`), true);
  assert.equal(matchesNamePattern({ name: "Iron Rations" }, "["), false);
});
