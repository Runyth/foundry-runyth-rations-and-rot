# rations-and-rot-1.0.2

## Implementation Audit

### Dashboard and UX

- Main dashboard contains uniform Actor summary cards rather than variable-height inventories.
- Dashboard Search/Refresh/Scan controls use a bounded CSS grid; the former non-wrapping toolbar action row is no longer used.
- Module UI uses border-box sizing and explicit `min-width: 0` containment to keep padded controls inside Application content.
- Card rows use a fixed 18rem height with explicit 4.65rem identity, flexible metrics, and 3.55rem action zones.
- Fresh/Warning/Spoiled use one equal three-column status grid inside an overflow-contained metrics zone.
- Primary and secondary card actions remain in identical footer grid columns on every Actor card.
- Actor inventory details open in a dedicated resizable manager instead of expanding the dashboard card.
- Inventory management uses fixed table columns, scrollable content, search, one-click tracking, and a stable bulk-action footer.
- Actor scope picker is hierarchical, searchable, scrollable, and keyboard-compatible through native inputs/buttons.
- Dedicated window geometry is persisted client-side for dashboard, inventory manager, picker, and custom Item window.
- Dashboard-width container queries move the entire action group predictably below Search on narrow Application widths; controls never depend on desktop viewport width.

### Actor scope

- Coarse scope, folder-path regex, explicit Actor selection, explicit folder selection, and recursion are evaluated in one scope helper.
- Folder regex matches the complete root-to-leaf Actor folder path.
- Invalid folder regex does not exclude the world by accident.
- Empty explicit picker selection means no picker restriction.
- Selected folder recursion has regression coverage.
- Tracked Item reconciliation is intentionally independent from discovery scope so moving an Actor cannot freeze existing spoilage.

### Inventory enrollment

- Arbitrary embedded Items can be explicitly marked spoilable regardless of automatic detector support.
- Multi-select enrollment ignores Items already tracked and batches updates for remaining selected Items.
- Custom spoilables are created with tracking metadata immediately rather than relying on a later scan.
- D&D 5e custom consumables receive food subtype data in addition to generic tracking flags.
- No enrollment workflow changes quantities or names.

### Performance

- No `setInterval` polling or wall-clock freshness timer.
- `updateWorldTime` remains the automatic time trigger.
- Active-GM authority prevents duplicate automatic writes from connected clients.
- In-memory tracked Item indexing avoids world-wide Item rediscovery on ordinary clock changes.
- Earliest-transition scheduling skips reconciliation until a state boundary is reachable.
- Changed embedded Items are batched per Actor.
- Settings-triggered reconciliation and dashboard refreshes are debounced.
- Dashboard filtering works against rendered card metadata without querying world collections.

### Permissions and concurrency

- Automatic writes use the active GM only.
- Player management remains limited to owned Actors/Items and the existing world permission setting.
- Scope-picker configuration is GM-restricted.
- Custom creation and bulk enrollment pass through Actor management permission checks.

### Static compatibility audit

The release audit validates:

- package identity/version and Foundry v13 compatibility range;
- all manifest runtime/language paths;
- absence of selected legacy/deprecated helper patterns in runtime code;
- bounded dashboard control structure and removal of the legacy clipping toolbar row;
- border-box containment and dashboard-width container query;
- fixed Actor-card row geometry and isolated equal status grid;
- absence of full Item tables from the main dashboard;
- bulk tracking and custom creation actions in the inventory manager;
- hierarchical Actor/folder picker semantics.

### Known constraints

1. Freshness is per Item document, not per unit inside one quantity stack.
2. Spoilage consequences remain markers/notifications rather than destructive transformations.
3. Automatic system detection remains deliberately conservative; explicit dashboard enrollment is the universal fallback.
4. No live Foundry v13 client was available in the build environment; interactive qualification steps are documented separately.
