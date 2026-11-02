
# Changelog

## 1.0.3 — 2026-11-02

Publication-surface refinement: the release verification scan and the hygiene guard compose their `x-access` pattern pieces so no published reflection of a credential-pattern fragment exists verbatim in the guard sources themselves — the same fragment family that the scanners watch for is no longer materialised in the published source archive. No manifest, runtime, or dependency change.

## 1.0.2 — 2026-08-09

- First publication as a Runyth module: `runyth-rations-and-rot` / **Runyth Rations & Rot** with the publication standard in place — deterministic `-mod`, `-src`, and `-doc` archives with per-version checksums, byte-identical rebuild verification, standard quality and release pipelines, the full GNU AGPL-3.0-or-later licence with the standard source notice, the standard README licence chapter, and the manifest URL surfaces.
- Behaviour, detection, dashboards, and settings are unchanged; the module-internal `rnr-` CSS scope and `RATIONS_AND_ROT.*` localization namespace keep their contract.


### Fixed

- Rebuilt the dashboard control header so the search field, Refresh button, and Scan inventories button remain inside the Application content box instead of being clipped by an overflowing non-wrapping action row.
- Added border-box sizing and explicit minimum-width containment throughout module Applications to prevent padded controls and grid children from escaping their available width.
- Replaced the prior Actor-card metric layout with isolated fixed-height identity, metrics, and action zones so Fresh, Warning, and Spoiled indicators cannot flow into the Manage food footer.
- Increased and normalized Actor-card row geometry while preserving equal card height across the dashboard.

### Improved

- Redesigned Actor cards with a clearer identity header, prominent tracked-food summary, equal three-column freshness state tiles, consistent inventory metadata, and a visually separated action footer.
- Added subtle theme-aware borders, surfaces, focus/hover treatment, and hierarchy without adding image loading, observers, animations beyond short CSS transitions, or runtime layout JavaScript.
- Added Application-content container queries for deterministic narrow-window control placement based on dashboard width instead of desktop viewport width.
- Kept all primary and secondary Actor actions in fixed grid columns so button alignment is identical across every card.
- Expanded dashboard regression/audit coverage for clipped-control prevention, card zone isolation, equal status-grid geometry, and fixed action placement.

## 1.0.1 — 2026-08-09

### Fixed

- Replaced variable-height Actor inventory cards with a stable summary-card grid whose rows and action footers remain aligned across dashboard sizes.
- Removed full inventory tables from the main dashboard so one Actor with many Items can no longer distort every other Actor card.
- Preserved tracked-item spoilage when an Actor later falls outside discovery filters; scope settings affect discovery/browsing, not the aging clock of already tracked food.

### Added

- Focused per-Actor inventory manager opened from each dashboard card.
- Searchable inventory browsing with stable table columns and fixed action placement.
- Multi-select enrollment of arbitrary inventory Items as spoilables, including select-all-visible and one batched embedded-Item update.
- One-click enrollment for individual untracked inventory Items.
- Custom spoilable Item creation directly for a selected Actor, with Item type, shelf life, storage rate, and note controls.
- D&D 5e custom `consumable` Items created through the spoilable workflow are marked with the `food` consumable subtype.
- Actor-folder regular-expression filtering using the complete hierarchical folder path.
- Scalable, scrollable hierarchical Actor/folder picker stored as world configuration.
- Explicit Actor selection, explicit folder selection, and recursive/non-recursive folder matching.
- Dedicated client-side geometry persistence for the inventory manager, scope picker, and custom-item window.
- Folder create/update/delete refresh handling for scope-sensitive dashboards.
- Public API methods for opening an Actor inventory manager, batch tracking Items, and creating custom spoilables.
- Automated regression tests covering Actor scope, stable dashboard layout, batch enrollment, custom creation, and tracked-item persistence across scope changes.
- Static Foundry v13 release audit covering manifest paths, prohibited legacy helpers, dashboard structure, inventory bulk actions, and picker semantics.

## 1.0.0 — 2026-08-08

### Added

- Foundry VTT v13-native `ApplicationV2` dashboard and per-item configuration window.
- World-time-driven food spoilage with no real-time timers and no periodic background polling.
- Performance-conscious transition scheduling: tracked items are only re-evaluated when the next warning/spoilage boundary can be reached.
- Active-GM authority for automatic persistence so connected clients do not race to write the same item updates.
- Per-item shelf life, storage/spoilage rate, note, manual refresh, and opt-in/opt-out controls.
- D&D 5e food-consumable auto-detection, plus optional configurable name-regex detection for other systems/items.
- Actor-scope controls for player-owned actors, character actors, or all actors.
- Owner-aware dashboard visibility and configurable player management permissions.
- GM/owner/disabled transition notifications with de-duplication by cached state.
- Batched embedded Item updates per Actor.
- Global Module Settings entry for opening the dashboard.
- Item-sheet header control support for both ApplicationV2 and legacy ApplicationV1 sheets.
- Public module API for integrations and macros.
- Namespaced, non-spammy logging with optional debug output.
- Pure spoilage calculation core with automated tests.
