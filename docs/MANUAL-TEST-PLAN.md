# rations-and-rot-1.0.2

## Manual Foundry v13 Qualification

A live Foundry client is required for these final interactive checks.

1. Replace the prior module directory with the v1.0.2 install ZIP and restart Foundry v13.
2. Confirm existing v1.0.1 tracked Item flags/statuses and discovery settings remain intact.
3. Open the dashboard and resize it through wide, narrow, tall, and short dimensions.
4. At every width, confirm Search, Refresh, and Scan inventories remain fully visible and clickable; no right-side clipping is acceptable.
5. Confirm the narrow dashboard moves the action controls beneath Search as complete aligned controls rather than clipping or partially wrapping button text.
6. Confirm Actor cards stay exactly aligned, card action footers remain in a consistent position, and inventories do not expand cards.
7. Use Actors with zero, single-digit, and large Fresh/Warning/Spoiled counts; confirm all three state tiles remain fully inside the body and never approach/overlap Manage food.
8. Confirm long Actor names, long folder paths, and large inventory counts truncate cleanly without changing card geometry.
9. Open **Manage food** for Actors with very small and very large inventories; confirm one focused manager opens per Actor and the table scrolls normally.
10. Search inventory Items and confirm visible selection/count updates without moving the bulk action footer.
11. Multi-select several untracked Items and choose **Track selected**; confirm only selected untracked Items enter tracking.
12. Track a single arbitrary non-food Item manually and confirm it ages normally.
13. Create a custom spoilable; confirm it appears immediately and is tracked.
14. Under D&D 5e, create a custom consumable spoilable and confirm its subtype is Food.
15. Open the Actor/folder picker with a large folder tree; confirm search, scrolling, hierarchy, selection, save, and restored state.
16. Select one Actor explicitly and confirm dashboard discovery is restricted accordingly.
17. Select an Actor folder with recursion disabled; confirm descendant-folder Actors are excluded.
18. Enable recursion; confirm descendant-folder Actors are included.
19. Configure an Actor-folder regex and confirm matching uses the complete folder path.
20. Enter an invalid regex and confirm the dashboard remains usable and does not produce repeated console spam.
21. Track food, then move its Actor outside the configured discovery scope and advance world time beyond spoilage; confirm the existing Item still transitions.
22. Confirm a player sees/manages only permitted owned Actors/Items according to existing player settings.
23. Advance world time in small increments and then across a boundary; confirm no duplicate state writes/notifications from multiple clients.
24. Review browser console for unexpected errors, deprecated API warnings originating from `rations-and-rot`, listener duplication, or repeated warnings.
