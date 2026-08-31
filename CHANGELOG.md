# Changelog

## 0.1.1 - 2026-08-31

### Changed

- Adopted searchable Obsidian 1.13 settings definitions and updated the minimum supported Obsidian version to 1.13.0.
- Scoped sprint, task, and project discovery to their configured folders instead of enumerating every Markdown file in the vault.
- Renamed commands to avoid repeating the plugin name and changed the summary command ID to `open-summary`.
- Moved Community review rules into the local release checks with the official Obsidian ESLint and Stylelint configurations.

### Fixed

- Replaced direct textarea style assignments with a CSS class.
- Replaced permanent vault deletion calls with `FileManager.trashFile()` so Obsidian's deletion preference is respected.
- Removed deprecated settings button, slider, and refresh APIs.
- Removed `!important` declarations from task-card styling.
- Added safe typing around mutable frontmatter and task-card metadata.

## 0.1.0 - 2026-08-29

### Added

- Migrated provider-independent sprint scheduling from Sprint Agent.
- Added global defaults and profile-specific cadence overrides.
- Added automatic generation, catch-up, lifecycle updates, and task rollover.
- Added the native Sprint Bases view.
- Added standalone settings, commands, and hourly synchronization.
- Added `SprintFeature` as an embeddable integration boundary.
- Added namespaced plugin-data storage that preserves host data.
- Added domain, migration, rollover, multi-profile, Bases-option, storage, and architecture tests.
- Added an optional agent-integration guide without introducing an AI dependency.
- Added project-grouped current and next sprint Kanban views with drag-and-drop state changes and inline task creation.
- Added configurable inline task properties backed by native Base property selectors.
- Added richer sprint overview cards and a dependency-free Velocity chart.
- Added generated Sprint Summary dashboards, sample tasks and projects, and workspace-local AI instructions.
- Moved generated Base files directly under the Sprint workspace root.
- Added shared vault-root skills under `.agents/skills` and `.claude/skills` without replacing unmanaged files.
- Added centralized skill preview and vault-specific instruction editing in Sprint settings.
- Added an Open Sprint Summary command, collapsible project swimlanes, project hiding, and active-project filtering for scoped sprint boards.
- Added configurable task-card properties and archived tasks that remain available in the Tasks table.
- Added additive Base schema migrations that preserve existing custom configuration and user notes.
- Changed the default workspace folder to `Sprint`, renamed the dashboard to `Sprint Summary.md`, and added non-destructive profile-folder renaming.
- Scoped the v0.1 interface to one Sprint workspace while retaining an extensible internal profile model.
- Prevented deleted tutorial projects and tasks from being recreated after initial workspace setup.
- Replaced repeated startup support-file rewrites with versioned migrations and protected user-edited Sprint Summary notes.
