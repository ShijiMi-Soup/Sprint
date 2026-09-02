# Changelog

## Unreleased

### Changed

- Made Sprint Planner the default Tasks Base view and grouped each sprint column's
  tasks by project.
- New workspaces now generate two future sprints by default, providing a provisional
  next-next sprint while keeping the horizon configurable.
- Display Kanban Due values as date-only `YYYY/MM/DD` labels without a time component.
- Build the inline New task form from each Kanban view's visible editable note
  properties and preserve their Properties-selector order.
- Leave tasks created from the full Sprint board unassigned by default, while
  Current and Next sprint views assign their corresponding sprint automatically.

### Added

- Added an **Open planner** command that targets the configured Tasks Base's
  Sprint Planner view without depending on its default view.
- Added a Sprint Planner view with Backlog and chronological sprint columns,
  task/point totals, drag-and-drop assignment, and an accessible per-card Sprint
  selector. Reassignment changes only the task's `sprint` property.
- Added an Open project link beside each project name in Kanban views.
- Added sprint-relative due dates to all generated tutorial tasks.
- Show Due on default Kanban cards and use a calendar icon instead of a text label.
- Added safe recovery for missing or manually moved Sprint workspaces, including
  live rename tracking, locate and confirmed replacement actions, and paused
  automatic synchronization while the configured folder is missing.
- Added an English/Japanese VitePress documentation site with local search and a
  GitHub Pages deployment workflow.

### Documentation

- Added a reference for Sprint terminology, generated files, views, data properties,
  Kanban configuration, workspace renaming, reset behavior, and commands.
- Added a documentation maintenance policy and pull request checklist for keeping
  user-facing docs synchronized with code changes.
- Documented a proposed VitePress and GitHub Pages publication workflow.
- Added reusable project-scoped Codex agents for implementation, data safety, read-only
  QA review, and documentation/release preparation, plus delegation guidance.

## 0.1.3 - 2026-08-31

### Added

- Added a two-step first-run setup prompt that can enable automatic sprints and create the workspace when the plugin is first enabled.
- Detects existing Sprint workspaces during onboarding and connects without recreating tutorial projects or tasks.
- Added a settings action for reopening the setup guide after it is dismissed.
- Added native Due date metadata to generated tasks and a date input to the inline New task form.
- Connected Kanban card fields to the native Bases Properties selector, including property ordering and migration of previous card-field settings.

### Changed

- Changed the left ribbon shortcut from a calendar to a double-check icon.

### Documentation

- Added illustrated installation and first-time setup guides in English and Japanese.
- Added concise Community plugin setup instructions and links to the complete guides in both READMEs.
- Documented workspace creation, reinstall safety, manual installation, and common troubleshooting steps.

## 0.1.2 - 2026-08-31

### Fixed

- Restored all controls in the Obsidian 1.13 settings tab by replacing unsupported
  parent-group DOM injection with native declarative setting groups and rows.
- Prevented plugin reinstalls from adding tutorial projects and tasks when the configured
  Sprint workspace folder already exists, including existing empty workspaces.
- Preserved first-install tutorial generation for genuinely new workspaces and explicit
  destructive resets.
- Added regression coverage for reinstalling over empty and populated Sprint folders.

### Documentation

- Documented a proposed solo-first Agile ceremony flow covering sprint planning, daily
  check-ins, showcase-style reviews, mini-retrospectives, and sprint closing.
- Defined provider-independent boundaries for future AI-assisted ceremony facilitation;
  agents may prepare and propose changes, while the user remains the decision maker.
- Recorded a future opt-in progress-reminder feature, including cross-platform in-app
  reminders and the current limitations of scheduled mobile background notifications.

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
