# rations-and-rot-1.0.2

## Architecture

### Design goals

1. Foundry v13-native ApplicationV2 interfaces.
2. Stable dashboard geometry and aligned controls across practical window sizes.
3. No real-time polling or per-tick write storms.
4. A single automatic write authority.
5. System-neutral manual tracking with conservative D&D 5e enhancement.
6. Scalable Actor discovery without coupling discovery filters to already-tracked spoilage state.
7. Non-destructive inventory behavior.
8. Testable spoilage and Actor-scope logic isolated from Foundry globals where practical.

### Runtime layout

| File | Responsibility |
|---|---|
| `scripts/main.mjs` | Hooks, lifecycle wiring, public API, debounced refresh/reconciliation. |
| `scripts/settings.mjs` | World/client settings and application menus. |
| `scripts/core/spoilage.mjs` | Pure spoilage calculations and Item detection helpers. |
| `scripts/core/actor-scope.mjs` | Folder-path, regex, explicit Actor/folder, and recursion matching. |
| `scripts/services/spoilage-service.mjs` | Indexing, discovery, batch tracking, creation, reconciliation, notifications. |
| `scripts/apps/dashboard.mjs` | Stable Actor summary-card dashboard. |
| `scripts/apps/actor-inventory.mjs` | Focused Actor inventory browser and bulk enrollment. |
| `scripts/apps/actor-scope-picker.mjs` | Searchable hierarchical Actor/folder scope picker. |
| `scripts/apps/custom-spoilable-item.mjs` | Custom Item creation and immediate tracking. |
| `scripts/apps/item-config.mjs` | Per-Item spoilage configuration. |
| `scripts/logger.mjs` | Namespaced debug/warn/error output. |

### Stable dashboard layout

The main dashboard deliberately renders only Actor-level summary cards. Each card has the same row allocation and a footer containing the same fixed action grid. Item count therefore cannot change card height or move actions relative to neighboring cards.

Detailed inventory rows are rendered only inside the focused Actor inventory manager. The inventory manager uses fixed table columns, a scrollable body, and a separate bulk-action footer, so large inventories expand through scrolling rather than destabilizing the main dashboard.

### Actor discovery scope

Actor discovery is an intersection of enabled filters:

- coarse Actor scope;
- optional folder-path regex;
- optional explicit Actor/folder picker selection.

Selected folders can match only direct members or all descendants. The picker itself is hierarchical, searchable, and scrollable.

Discovery determines which Actors are candidates for scanning and dashboard browsing. It does **not** determine whether an already-tracked Item ages. Reconciliation iterates the tracked-item index independently of later discovery changes.

### World-time model

Each tracked Item stores `shelfLifeSeconds`, `accumulatedAgeSeconds`, `baselineWorldTime`, `rate`, cached `state`, `autoDetected`, and optional `note` under `flags.rations-and-rot.tracking`.

Live effective age is `accumulatedAgeSeconds + max(0, worldTime - baselineWorldTime) * rate`. Backward world-time movement contributes zero new age.

### Rate changes

Elapsed age is settled at the old rate before a new rate is applied, then the baseline moves to current world time. Storage changes therefore affect only future elapsed time.

### Transition scheduling

The service maintains an in-memory Actor → tracked Item-ID index and the earliest world-time boundary at which warning/spoilage can change. `updateWorldTime` returns early until that boundary can be reached. At a boundary, only indexed tracked Items are evaluated, changed embedded Items are batched per Actor, and the next boundary is calculated.

### Write authority and explicit actions

Automatic state persistence is restricted to the active GM. Explicit user actions still use normal ownership/permission checks. Bulk enrollment produces a single `updateEmbeddedDocuments` call for the selected untracked Items on one Actor.

### Safety properties

- No automatic Item deletion.
- No automatic quantity reduction.
- No Item-name mutation.
- No discovery-filter change can silently stop existing tracked Items from aging.
- Invalid regex configuration fails open for that filter and is reported without repeated console spam.
- Chat transition notices are aggregated.
