# Development Log

## 2026-08-31 - Community checker remediation

- Fixed all blocking findings reported for the initial Community release.
- Replaced direct element styles with CSS classes and added official Obsidian CSS linting.
- Replaced permanent file deletion with Obsidian's trash API.
- Added searchable settings definitions and removed deprecated settings APIs, raising the minimum supported Obsidian version to 1.13.0 for `0.1.1` while preserving `0.1.0` compatibility metadata.
- Removed whole-vault Markdown enumeration in favor of direct configured-folder traversal.
- Simplified command names and removed the plugin ID from the summary command ID.
- Added the official Obsidian ESLint configuration to the release check and covered folder-scoped discovery with a regression test.

## 2026-08-28 - Versioned startup maintenance

- Added a persisted support-schema version so Bases, summaries, AI instructions, skills, and property types migrate once per relevant plugin upgrade.
- Startup and hourly synchronization now skip support generation after the current schema is installed.
- Removed the duplicate support generation pass that previously ran after every sprint synchronization.
- Sprint lifecycle synchronization remains active at startup and hourly for sprint creation, status updates, and rollover.
- Existing user-edited Sprint Summary notes are no longer overwritten by support generation.

## 2026-08-28 - One-time tutorial samples

- Added persisted tutorial initialization state to the Sprint workspace.
- Sample projects and tasks are now created only during first-time workspace initialization or an explicit destructive reset.
- Deleting tutorial notes during normal use no longer causes them to reappear at startup or during hourly synchronization.
- Existing workspaces migrate as already initialized, preventing deleted samples from being restored after upgrade.

## 2026-08-28 - Single-workspace release scope

- Limited the v0.1 settings experience to one Sprint workspace.
- Removed profile add, remove, and per-profile enable controls; the global Automatic sprints toggle controls the workspace.
- Renamed user-facing Profile name to Workspace name and kept the profile-shaped internal model for future expansion.
- Existing unpublished multi-profile settings retain only their first workspace during normalization, making summary commands and task creation unambiguous.

## 2026-08-28 - Sprint workspace naming and folder moves

- Changed the new-install default profile folder from `Agile PM` to `Sprint`.
- Renamed the generated dashboard to `Sprint Summary.md` and added migration for the previous folder-named dashboard.
- Renamed the dashboard command to `Open Sprint Summary`.
- Clarified that Profile name is a display label while Sprint folder is the actual vault path.
- Added an explicit Sprint folder rename action that moves existing vault data, updates configured Base paths, and refreshes Base folder filters without recreating the workspace.

## 2026-08-28 - Project visibility and board metadata

- Added a dashboard command that opens the summary for the first enabled profile.
- Added collapsible project sections to Sprint board, Current sprint, and Next sprint views.
- Added project visibility controls using a persisted `hidden` project property and a collapsed Hidden section.
- Current and Next sprint views now show only projects whose state is In progress; the full Sprint board still shows projects in every state.
- Added up to three configurable task-card properties. Estimate remains the first default, and the full Sprint board also shows Sprint by default.
- Added an `archived` task property. Archived tasks remain in the Tasks table but are excluded from all sprint boards.
- Simplified the generated dashboard to Current Tasks, Velocity, and Projects.
- Added additive Base migrations that preserve existing notes, custom views, custom properties, and unknown view settings.
- Updated generated AI instructions for task archiving and project visibility.

## 2026-08-28 - Kanban task creation and workspace refinement

- Added inline New task composers to every project and state lane in the custom Kanban views.
- New tasks inherit their project, sprint scope, and state from the lane where they are created.
- Added three native Base property selectors for choosing fields shown in the task composer; Estimate is the default.
- Made Sprint board the first and therefore default view in generated Tasks Bases.
- Added richer Sprint overview cards with dates, task and point completion, reviews, and retrospectives.
- Moved generated Tasks, Sprints, and Projects Base files directly under each Agile PM profile folder.
- Updated generated AGENTS, CLAUDE, and skill instructions for current task state, file layout, sprint assignment, and link conventions.
- Installed one shared Sprint skill in the vault-root `.agents/skills` and `.claude/skills` folders so agents launched from the vault root can discover it.
- Added a centralized AI skills settings section with a generated preview and editable vault-specific instructions shared by Codex and Claude Code.
- Safely removes obsolete profile-local and `.codex` Sprint-owned skill files while preserving unmanaged skills and existing AI configuration folders.
- Added compatibility normalization from the unpublished `Bases/` layout while keeping reset output clean.

## 2026-08-27 - 0.1.0 release cleanup

- Removed temporary custom Bases lifecycle logging and the Sprint generation diagnostic command.
- Removed the unpublished standalone Sprint Board Base compatibility migration and its legacy template variants.
- Removed duplicate headings from Sprint settings and generated dashboard notes.
- Changed command IDs to `sync` and `generate-bases` before public hotkeys can depend on them.
- Moved generated and managed file updates to `Vault.process()` while preserving unmanaged AI instruction and skill files without writing to them.

## 2026-08-24 - Velocity visual refinement

- Retained bars as the primary Velocity encoding because sprint output is a discrete per-sprint measurement.
- Removed the gray track and border behind each Velocity bar while preserving labels and zero-point sprints.
- Moved Velocity values into the center of each bar, with zero values retained at the baseline.
- Removed the default Owner field from generated project notes, Bases, and property-type metadata.

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
- A Next sprint Kanban view for previewing and updating the upcoming sprint's tasks.
- Project swimlanes across all Kanban task views, with unassigned tasks grouped under No project.
- Zero-velocity sprints in the Velocity chart and dashboard separators before Velocity and Projects.
- A native Velocity chart view without requiring a third-party Obsidian chart plugin.
- Estimate badges inside task cards with warning colors: 1-2 points green, 3-4 yellow, 5-6 orange, and 7 or more red.
- Profile-local `AGENTS.md`, `CLAUDE.md`, and skill files for external AI tools.
- An opt-in setting for creating AI instruction files at the vault root. Existing unmanaged instruction files are preserved.
- Settings actions for generating missing support files, synchronizing sprints, and resetting an Agile PM workspace.
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
- The short-lived standalone `Sprint Board.base` design and its unpublished compatibility migration were removed before `0.1.0`.
- Estimate color thresholds are currently fixed defaults. User-configurable thresholds and colors are deferred to a future settings feature.

### Verification

- `npm run check` passed after implementation.
- 9 test suites and 28 tests passed.
- Type checking, linting, standalone plugin build, and embeddable package build passed.
- The plugin was installed and exercised in the OneDrive-hosted Research at TTLab vault.

### Temporary follow-up work

The temporary instrumentation and standalone Sprint Board compatibility code were removed during the `0.1.0` release cleanup. No temporary diagnostics remain in the release tree.
