# Changelog

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
