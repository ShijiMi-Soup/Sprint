# Development Log

## 2026-08-23 - Agile PM workspace and custom Bases views

Related commits:

- `cde1ede` - Add Agile PM workspace generation and custom Bases views.
- `51bbe86` - Add Sprint board drag and drop.
- `5590f0f` - Keep completed tasks visible on the Sprint board.

### Added

- Automatic Agile PM workspace initialization when Automatic sprints is enabled.
- Generated Tasks, Sprints, and Projects Bases with sample tutorial data and property types.
- Five Sprint 1 tutorial tasks and two Sprint 2 continuation tasks, with existing sample-task edits preserved during migration.
- An `Agile PM.md` dashboard showing the current sprint, current tasks, Sprint board, Velocity, and projects.
- A three-column Sprint board for Not started, In progress, and Done tasks.
- Drag-and-drop task state changes between all three Sprint board columns.
- A Current sprint Kanban view backed by the linked sprint note's lifecycle status.
- A native Velocity chart view without requiring a third-party Obsidian chart plugin.
- Estimate badges inside task cards with warning colors: 1-2 points green, 3-4 yellow, 5-6 orange, and 7 or more red.
- Profile-local `AGENTS.md`, `CLAUDE.md`, and skill files for external AI tools.
- An opt-in setting for creating AI instruction files at the vault root. Existing unmanaged instruction files are preserved.
- Settings actions for generating missing support files, synchronizing sprints, diagnosing generation, and resetting an Agile PM workspace.
- A destructive reset confirmation that requires the exact text `Yes, delete.`.

### Fixed

- Sprint synchronization now creates missing sprint notes when their parent folder already exists.
- Optional Base, dashboard, or instruction-file failures no longer prevent sprint-note creation.
- Existing empty sprint files can be repaired instead of causing `File already exists` failures.
- Reset and folder-name changes now recreate the complete workspace consistently.
- Embedded custom Bases views render in their own child container instead of showing only the toolbar.
- Dashboard Base embeds can select named views with `#Sprint board` and `#Velocity`.
- The Tasks Base remains the default table while its Sprint board view is used by the dashboard.
- Task estimate labels now have spacing, remain inside their task cards, and use subdued translucent colors.
- Completed tasks remain visible in the Sprint board so they can be dragged back to another state.
- The dashboard's duplicate Markdown task checklist was removed in favor of the interactive Current sprint view.

### Design decisions

- Task state is derived from two booleans: `in progress` and `done`. This keeps editing simple while supporting three visible states.
- Generated support files use conservative ownership rules. Sprint updates files it owns and avoids overwriting customized or pre-existing agent instructions.
- The short-lived standalone `Sprint Board.base` design was removed. A compatibility migration only removes the generated version and preserves customized files.
- Estimate color thresholds are currently fixed defaults. User-configurable thresholds and colors are deferred to a future settings feature.

### Verification

- `npm run check` passed after implementation.
- 9 test suites and 28 tests passed.
- Type checking, linting, standalone plugin build, and embeddable package build passed.
- The plugin was installed and exercised in the OneDrive-hosted Research at TTLab vault.

### Temporary follow-up work

Temporary instrumentation and compatibility code are tracked in `docs/TEMPORARY_DEBUGGING.md`. Before the first stable release, review:

- Embedded custom Bases lifecycle console logging.
- The Sprint generation diagnostic command.
- The standalone Sprint Board Base compatibility migration.
