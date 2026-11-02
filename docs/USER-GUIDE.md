# rations-and-rot-1.0.2

## User Guide

### Purpose

Rations & Rot tracks effective food age inside Actor inventories and marks tracked Items as **Fresh**, **Near spoilage**, or **Spoiled**. It never automatically deletes the Item, changes its quantity, or renames it.

### Main dashboard

The dashboard is intentionally a summary surface. Each Actor is represented by one aligned card containing:

- Actor portrait/name and folder path;
- Fresh / Near spoilage / Spoiled counts;
- tracked food count and inventory Item count;
- a fixed **Manage food** action;
- a fixed Actor-sheet action.

Inventory size does not expand the card. Resize the dashboard freely; cards stay on the same grid and detailed inventories remain outside the card layout.

### Managing one Actor's inventory

Choose **Manage food** on an Actor card. The focused inventory manager lists that Actor's complete embedded inventory.

You can:

- search by Item name/type;
- select multiple untracked Items;
- select all currently visible untracked Items;
- choose **Track selected** for one batched enrollment;
- track one Item directly;
- configure/reset/untrack already tracked Items;
- open the normal Item sheet;
- run automatic detection for only this Actor;
- create a new custom spoilable Item.

### Creating a custom spoilable

From the Actor inventory manager choose **Create spoilable** and provide:

- Item name;
- Item type supported by the active game system;
- shelf life in days;
- storage preset/rate;
- optional note.

The Item is created directly in the Actor inventory and enters spoilage tracking immediately.

### Actor discovery settings

Use Foundry's global Module Settings for Rations & Rot.

#### Coarse Actor scope

Choose player-owned Actors, character Actors, or all world Actors.

#### Actor folder regex

Optionally enter a regular expression matched against the Actor's complete folder path. Blank disables this filter.

Examples:

- `^Player Characters(?:/|$)` — Actors under that top-level path.
- `Food Test$` — Actors directly in a folder path ending with `Food Test`.

An invalid regex is treated as a disabled regex filter rather than excluding Actors unexpectedly.

#### Choose Actors and Folders

Open the scalable picker to search a hierarchical view of Actor folders and Actors. Select any combination of:

- individual Actors;
- Actor folders.

The recursion setting determines whether selecting a folder also includes Actors in descendant folders.

When the picker contains no selections, it places no additional restriction on discovery.

#### Discovery versus existing tracking

These settings control which Actors are candidates for browsing and automatic discovery. They do not pause food already being tracked. If a tracked Actor is moved outside the selected folder tomorrow, its existing tracked food still ages normally.

### Automatic tracking

For D&D 5e, optional automatic detection recognizes embedded `consumable` Items with the Food subtype. Optional Item-name regex matching provides a generic fallback for other systems/homebrew data. The dashboard scan honors Actor discovery scope.

### Shelf life and storage rate

Shelf life is configured in days. Storage rate controls effective spoilage speed relative to Foundry world time.

| Preset | Rate | Effect |
|---|---:|---|
| Hot / exposed | ×2 | Double-speed spoilage. |
| Normal | ×1 | One-to-one. |
| Cool storage | ×0.5 | Half speed. |
| Cold storage | ×0.25 | Quarter speed. |
| Preserved | ×0.1 | One tenth speed. |
| Suspended | ×0 | Spoilage clock is paused. |

Changing storage first settles age accumulated under the previous rate, then applies the new rate going forward.

### Clock corrections

Moving Foundry world time backward does not make tracked food fresher. Use **Reset freshness** to deliberately represent a new/fresh batch.

### Player permissions

Players can optionally open the dashboard and see Actors they own. A separate world setting controls whether they may manage tracked Items on owned Actors. GM-only scope configuration remains unavailable to players.

### Stack-level freshness

One embedded Item document is one freshness cohort. If ten rations bought on different days need different freshness clocks, represent those batches as separate Item documents.
