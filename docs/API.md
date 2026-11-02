# rations-and-rot-1.0.2

## Public API

Access the API after Foundry initialization through `game.modules.get("rations-and-rot").api`.

| Method | Result |
|---|---|
| `openDashboard()` | Opens the Actor summary dashboard. |
| `openActorInventory(actorOrUuid)` | Opens the focused inventory manager for an Actor. |
| `openItemConfig(itemOrUuid)` | Opens per-Item spoilage configuration. |
| `getStatus(itemOrUuid)` | Returns live derived status or `null`. |
| `trackItem(itemOrUuid, options)` | Starts tracking one embedded Item. |
| `trackItems(actorOrUuid, itemIds, options)` | Batch-enrolls selected embedded Items. |
| `createSpoilableItem(actorOrUuid, options)` | Creates and immediately tracks a custom embedded Item. |
| `configureItem(itemOrUuid, options)` | Updates shelf life/rate/note/enabled state. |
| `refreshItem(itemOrUuid)` | Resets freshness to current world time. |
| `untrackItem(itemOrUuid)` | Removes the tracking flag. |
| `scan(options)` | Auto-detects eligible embedded Items in discovery scope. |
| `reconcile(options)` | Forces tracked-state reconciliation. |

Document arguments may be document instances or UUID strings where the method accepts `actorOrUuid`/`itemOrUuid`.

### Tracking options

`trackItem` and `trackItems` accept:

- `shelfLifeDays` — positive number;
- `rate` — number from 0 through 100;
- `note` — string;
- `autoDetected` — boolean.

`configureItem` accepts `shelfLifeDays`, `rate`, `note`, and `enabled`.

`createSpoilableItem` accepts:

- `name` — required Item name;
- `type` — valid Item type for the active system;
- `shelfLifeDays`;
- `rate`;
- `note`.

For D&D 5e, a custom Item created with type `consumable` is also authored with consumable subtype `food`.

### Custom hook

Whenever automatic reconciliation persists a state transition, Rations & Rot emits `rations-and-rot.stateChanged` with:

1. the Item document;
2. previous state: `fresh`, `warning`, or `spoiled`;
3. new state.

This keeps campaign-specific consequences decoupled from the generic spoilage tracker.
