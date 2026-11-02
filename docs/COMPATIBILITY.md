# rations-and-rot-1.0.2

## Compatibility

### Foundry VTT

The module manifest targets Foundry Virtual Tabletop v13 with minimum `13`, verified `13.351`, and maximum `13`.

The v1.0.2 scope picker and dashboard implementation were designed against Foundry v13 Actor collections, Actor folders, Folder ancestry, ApplicationV2, and world/client settings interfaces.

### Game systems

Rations & Rot has no mandatory game-system dependency. Manual and dashboard-based tracking require only embedded Actor Items.

D&D 5e receives conservative enhancements:

- automatic recognition of `consumable` Items with food subtype;
- custom spoilable creation prefers `consumable` when available;
- custom D&D 5e consumables created by the module receive subtype `food`.

### Sheet compatibility

The module does not patch D&D 5e or third-party sheet DOM selectors. It uses Foundry sheet-header hooks for ApplicationV2 plus the legacy ApplicationV1 compatibility hook retained for v13 sheet ecosystems.

### Calendar compatibility

Automatic spoilage uses Foundry world time. Calendar modules work when they advance Foundry's normal world-time value. A private calendar clock that never updates Foundry world time cannot drive automatic spoilage.

### Upgrade from 1.0.1

No destructive migration is required. Existing `flags.rations-and-rot.tracking` data and v1.0.1 discovery settings remain valid. v1.0.2 changes dashboard markup/CSS and release validation only; it does not change persisted tracking schema.

Already-tracked Items remain in automatic reconciliation even if discovery filters no longer include their Actor.
