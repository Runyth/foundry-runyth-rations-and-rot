# Runyth Rations & Rot

Runyth Rations & Rot tracks food freshness and spoilage in Actor inventories using
Foundry world time, with stable Actor cards, scoped inventory discovery, bulk
enrollment, and per-item controls. A small system-agnostic Foundry VTT module
targeting **Foundry VTT v13**.

## Supported environment

- Foundry Virtual Tabletop 13 (verified against 13.351)
- System-agnostic: food freshness discovery works without a game system; full
  consumable auto-detection activates for the D&D 5e system when that system is
  active

## Features

- Tracks freshness and spoilage of perishable food Items inside Actor inventories.
- Follows Foundry world time; a configurable age rate converts elapsed world seconds
  into food age.
- Stable Actor cards keep each tracked inventory visible and actionable between
  runs.
- Scoped inventory discovery: choose the tracked Actors and Item folders in one
  hierarchical, searchable, multi-select picker, or enroll in bulk with one embed.
- Per-item controls add or retarget spoilable Items and adjust their behaviour.
- Four states per Item: fresh, warning, spoiled; state changes reflect the
  configured thresholds.
- Dashboard application with a content-sized responsive geometry and uniform Actor
  cards that isolate metrics from action zones.
- Runtime entrypoint registers hooks, settings, a public API, and Item header
  controls through the public ApplicationV2 header-control contract.
- English localization under the `RATIONS_AND_ROT.*` namespace and scoped CSS under
  the `rnr-` class scope.

## Installation

1. Extract the `runyth-rations-and-rot` directory into:

   ```text
   <Foundry user-data>/Data/modules/
   ```

2. Restart Foundry VTT if necessary.
3. Enable **Runyth Rations & Rot** in **Manage Modules** for the world.

## Configuration

1. Open the dashboard through the module settings.
2. Choose the tracked Actors and their folder scopes.
3. Assign spoilage thresholds and world-time age rate.
4. Use bulk enrollment to track the matched Items in one step.

The game-system auto-detection only reads system-agnostic Item concepts; the module
binds no game system and declares no module relationships.

## Development validation

With Node.js 24 (22.13 or later works):

```text
npm test
npm run check
```

These checks validate actor scope resolution, dashboard layout geometry, runtime
smoke behaviour, service management, spoilage logic, manifest identity and URL
surfaces, source notices, licence and publication hygiene, and deterministic
byte-identical release packaging.
They do not replace testing in a live Foundry world.

## Releases

The GitHub repository is
[`Runyth/foundry-runyth-rations-and-rot`](https://github.com/Runyth/foundry-runyth-rations-and-rot).
Every release attaches:

```text
runyth-rations-and-rot-v<version>-mod.zip
runyth-rations-and-rot-v<version>-src.zip
runyth-rations-and-rot-v<version>-doc.zip
module.json
runyth-rations-and-rot-v<version>-SHA256SUMS.txt
```

The `module.json` manifest download URL points at the matching release's installable
archive, and the marked Latest release is always the highest published version.

## Licence

Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
