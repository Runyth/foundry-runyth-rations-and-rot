# rations-and-rot-1.0.2

## Rations & Rot

Rations & Rot is a Foundry Virtual Tabletop v13 module for tracking food freshness and spoilage in Actor inventories without destructive inventory automation.

### Highlights

- Uses Foundry world time rather than real-world timers.
- Polished, strictly aligned Actor summary cards with isolated identity, status, and action zones.
- Bounded dashboard control grid that keeps Search, Refresh, and Scan inventories visible at supported window widths.
- Per-Actor inventory manager opened from each card.
- Searchable inventory browser with multi-select and one-click spoilable enrollment.
- Custom spoilable Item creation from the dashboard workflow.
- Actor discovery scope by ownership/type, folder-path regex, hierarchical Actor/folder selection, and optional recursive folder matching.
- Tracks shelf life per embedded Item stack with hot, normal, cool, cold, preserved, and suspended storage rates.
- Automatically detects D&D 5e consumable Items with the `food` subtype.
- Optional regular-expression Item-name matching for other systems and homebrew Items.
- GM dashboard plus owner-limited player access.
- Active-GM-only automatic transition writes and batched embedded Item updates.
- No automatic Item deletion, quantity mutation, or renaming.

### Installation

Extract the install ZIP into `Data/modules/rations-and-rot`, then enable **Rations & Rot** in the world.

The install ZIP contains only files required at Foundry runtime. The source ZIP contains the exact release source plus tests, documentation, audit tooling, and reproducible packaging workflow. The documentation ZIP contains release documentation, tests, validation output, and checksums.

### Dashboard workflow

1. Open **Game Settings → Configure Settings → Module Settings → Rations & Rot Dashboard → Open Dashboard**.
2. Use the aligned Actor cards for a quick spoilage summary.
3. Select **Manage food** on an Actor card to open that Actor's focused inventory manager.
4. Search the inventory, select multiple Items, and choose **Track selected**, or track a single Item directly.
5. Choose **Create spoilable** to create a custom Item that enters tracking immediately.

### Actor discovery scope

Global Module Settings provide:

- coarse Actor scope: player-owned Actors, character Actors, or all Actors;
- Actor-folder regex matched against the full folder path;
- **Choose Actors and Folders** hierarchical picker;
- recursive/non-recursive matching for selected folders.

Discovery filters decide which Actors are offered for scanning and management. Already tracked Items continue to age if their Actor later moves outside the configured discovery scope.

### Item workflow

Open an embedded Item sheet and choose **Spoilage** from the sheet header controls to configure tracking, shelf life, storage rate, note, or freshness reset.

### Development

Run:

```text
npm run verify
```

This performs runtime syntax checks, the Node regression suite, and the static Foundry v13 release audit.

See `docs/` for architecture, API, compatibility, manual qualification, QA, and user guidance.
