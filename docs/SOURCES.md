# rations-and-rot-1.0.2

## Technical Sources

Research was rechecked for the v1.0.2 patch on 2026-08-09.

### Foundry VTT v13

- Foundry v13 release list (latest v13 stable shown as 13.351): https://foundryvtt.com/releases/
- Foundry v13.351 stable release notes: https://foundryvtt.com/releases/13.351
- Foundry v13 API index: https://foundryvtt.com/api/v13/
- ApplicationV2 API: https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html
- Actor API: https://foundryvtt.com/api/v13/classes/foundry.documents.Actor.html
- Actors collection API: https://foundryvtt.com/api/v13/classes/foundry.documents.collections.Actors.html
- Folder API, including ancestry/subfolder facilities: https://foundryvtt.com/api/v13/classes/foundry.documents.Folder.html
- Document API and document type metadata: https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html
- Game settings knowledge-base article: https://foundryvtt.com/article/settings/

### D&D 5e

- Foundry D&D 5e package page: https://foundryvtt.com/packages/dnd5e
- Foundry D&D 5e source repository: https://github.com/foundryvtt/dnd5e

### Internal design references

The card/dashboard and configurable Actor-folder approach was aligned with the established patterns used in the user's other Foundry module families, particularly Hunter's Bestiary and related modules. Rations & Rot keeps its implementation self-contained rather than adding dependencies on those modules.
