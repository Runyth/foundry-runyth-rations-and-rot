# rations-and-rot-1.0.2

## Test Results

Test date: 2026-08-09

Command: `npm run verify`

### Runtime syntax verification

Result: **PASS**

- Runtime ES modules checked: 12
- Syntax failures: 0

### Automated tests

Result: **PASS**

- Tests: 26
- Passed: 26
- Failed: 0
- Skipped: 0

Patch-specific regression coverage includes:

1. Bounded dashboard control-grid markup.
2. Removal of the legacy non-wrapping dashboard action row.
3. Border-box sizing containment for module Applications.
4. Dashboard-content container query for narrow Application widths.
5. Fixed 18rem Actor grid rows.
6. Explicit identity/body/action card row isolation.
7. Overflow containment inside the card body.
8. Equal three-column Fresh/Warning/Spoiled status geometry.
9. Fixed Manage food + Actor-sheet footer columns.
10. Existing hierarchical Actor/folder picker layout and semantics.
11. Existing bulk inventory enrollment and custom spoilable actions.

Existing regression coverage remains in place for Actor scope, explicit/recursive folder selection, folder regex handling, API/hook registration, custom D&D food creation, scope-independent tracked spoilage, world-time advancement, clock rollback, warning/spoiled boundaries, suspended storage, rate changes, freshness reset, transition scheduling, duration formatting, D&D food detection, regex safety, auto-scan, and batched reconciliation.

### Static Foundry v13 audit

Result: **PASS**

- Runtime/template/style files audited: 18
- Manifest identity/version/compatibility checks passed.
- Manifest runtime/language paths resolve.
- Selected legacy/deprecated helper patterns were not found.
- Dashboard control-containment contract passed.
- Actor-card fixed-zone/status-grid contract passed.
- Inventory bulk tracking/custom creation contract passed.
- Hierarchical Actor/folder picker contract passed.

The complete command output is bundled as `docs/AUTOMATED-VALIDATION.txt`.

### Compatibility qualification

Foundry's official release list identifies **13.351** as the latest Version 13 stable release, and the module manifest remains verified for 13.351.

A live Foundry VTT v13.351 server/browser was not available inside the build environment. Interactive rendering, Theme V2 combinations, third-party sheet combinations, and actual Foundry database persistence therefore remain covered by the bundled manual qualification checklist rather than being represented as live-tested.
