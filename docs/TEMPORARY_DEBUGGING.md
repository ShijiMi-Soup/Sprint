# Temporary Debugging Register

This file tracks diagnostic code that must be reviewed and removed after the related behavior is stable. Do not delete an entry merely because the immediate bug appears fixed; satisfy its removal criteria and remove the code and its tests together.

## Active temporary diagnostics

### Embedded custom Bases lifecycle logging

- Added: 2026-08-22
- Reason: Embedded Sprint board and Velocity custom views showed a toolbar but no rendered content.
- Code: `src/obsidian/SprintBasesView.ts`
- Console prefix: `[Sprint][temporary-bases-debug]`
- Captures: view name, query result count, group count, embedded state, vault task/sprint file counts, and Velocity point count.
- Removal criteria: Verify both custom views in standalone and embedded form with zero and non-zero data, on desktop and mobile-supported layouts. Confirm that the dedicated child-container fix remains sufficient after an Obsidian restart.
- Removal work: Delete the two `console.debug` calls and the `embedded` fields if they are no longer used.

### Sprint generation diagnostic command

- Added: 2026-08-20
- Reason: Sprint notes were not generated when optional Base, AI-instruction, or property-type writes failed first.
- Command: `Sprint: Diagnose sprint generation`
- Code: `src/SprintFeature.ts`, method `diagnoseSprintGeneration()` and command ID `diagnose-sprint-generation`.
- Test: command-registration assertion in `tests/obsidian/SprintFeature.test.ts`.
- Console prefix: `[Sprint] Sprint generation diagnostics`
- Removal criteria: Exercise initialization, reset, folder rename, missing sprint folder, existing empty sprint files, and OneDrive-hosted vault cases without unexplained failures. Decide before a stable release whether the command is useful permanent support tooling or should be removed.
- Removal work if temporary: Remove the command registration, method, command test assertion, and references from notices.

### Standalone Sprint Board Base compatibility migration

- Added: 2026-08-23
- Reason: A short-lived build generated `Bases/Sprint Board.base` and removed the Sprint board view from newly generated `Tasks.base` files.
- Code: `src/obsidian/SprintBaseGenerator.ts`, functions `standaloneSprintBoardContent()`, `removeObsoleteSprintBoardBase()`, and `migrateTasksBase()`.
- Behavior: Deletes the obsolete standalone Base only when it exactly matches Sprint's generated template. Restores the Tasks Base views, completed-task visibility, and Current sprint view only when the file exactly matches one of Sprint's earlier generated templates. Customized files are preserved.
- Removal criteria: Supported vaults have passed through a release containing this migration, or the migration is replaced by a versioned schema migration system.
- Removal work: Delete the compatibility content function and both migration methods/calls while retaining the normal Tasks Base template and dashboard `#Sprint board` embed.

## Permanent behavior introduced during debugging

These are not temporary and should not be removed with the diagnostics:

- Core sprint synchronization continues when optional support-file generation fails.
- Support-file failures remain warnings and do not block sprint-note creation.
- Base-generation errors include the failing file/phase context.
- Existing AI instruction files not owned by Sprint are skipped rather than overwritten.

## Review checkpoint

Review this register before the first stable release and whenever an entry's removal criteria are met. Run `npm run check` after removing instrumentation.
