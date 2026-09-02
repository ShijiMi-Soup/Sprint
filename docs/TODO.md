# TODO

## Installation safety

- [x] Prevent plugin installation or reinstallation from adding tutorial projects and
  tasks when the configured Sprint folder already exists. The current
  `samplesInitialized` setting prevents samples from being recreated during normal
  startup, but plugin settings may be absent after a reinstall while the user's Sprint
  workspace remains in the vault. Treat an existing workspace as user data and default
  to preserving it without adding samples. Add regression coverage for reinstalling
  with an existing populated Sprint folder and an existing empty Sprint folder. Sample
  creation should remain available only for a genuinely new workspace or an explicit
  destructive reset confirmed by the user.

## Workspace relocation

- [x] Detect or safely recover from a Sprint workspace folder renamed outside the
  Sprint settings UI. While Obsidian is running, prefer the vault rename event to
  update the configured workspace and Base paths without scanning every vault file.
  For renames performed while Obsidian is closed or the plugin is disabled, provide an
  explicit **Locate moved workspace** recovery action. Do not rely on a hidden marker
  file unless Obsidian's supported Vault API can read and move it consistently on
  desktop and mobile. Prevent automatic synchronization from silently recreating the
  old workspace path when a configured root is missing.

## Progress reminders

- [ ] Design an optional Duolingo-style reminder system that helps users maintain their
  sprint routine without requiring an AI provider. Start with cross-platform in-app
  reminders when Obsidian opens or resumes, covering missed daily check-ins, sprint
  planning, reviews, and retrospectives. Investigate optional desktop operating-system
  notifications while Obsidian is running. Do not promise scheduled mobile background
  notifications unless Obsidian exposes a supported native API; community plugins run
  inside the mobile app and cannot currently rely on executing after the app is
  suspended or terminated. Consider calendar/reminder export as a mobile fallback.
  Require explicit opt-in and provide cadence, time, quiet-hours, snooze, and disable
  controls. Keep reminder state local, avoid manipulative streak penalties, and test
  desktop, iOS, and Android behavior independently before release.

## Agile ceremonies

- [ ] Implement the solo-first ceremony companion proposed in
  [AGILE_CEREMONIES_RESEARCH.md](AGILE_CEREMONIES_RESEARCH.md): sprint planning, brief
  daily check-ins, sprint reviews, mini-retrospectives, and explicit sprint closing.
  Support both self-guided and optional AI-assisted flows without introducing an AI
  provider dependency. Reuse the existing sprint review and retrospective metadata
  where practical, keep the user as the decision maker, and add ceremony commands,
  persistence, completion indicators, and migration coverage incrementally.

## Task planning and board configuration

- [x] Add a `due` date property to newly created task notes and the generated Tasks Base
  schema. Show Due by default in the inline task editor opened from a Kanban lane's
  **New task** button. Preserve existing task notes that do not have a due date, and use
  Obsidian's native date-property editor rather than a plain text field.
- [ ] Add a Sprint planner view for quickly assigning and moving tasks among the backlog
  and existing sprint notes. Support drag-and-drop reassignment without changing task
  state, show useful capacity or estimate totals, preserve project relationships, and
  confirm behavior for unassigned, archived, and completed tasks before implementation.
- [ ] Optionally derive a task's Sprint assignment from its Due date. Match the due date
  to the sprint whose date range contains it, create the required sprint note when that
  range has not been generated yet, and define how manual Sprint assignments, cleared
  due dates, disabled automatic sprints, and out-of-cadence dates should behave before
  enabling automation.
- [x] Integrate the native Base **Properties** selector with the custom Kanban views so
  users can choose which task properties appear on cards. Changes should apply to Sprint
  board, Current sprint, and Next sprint views as appropriate, preserve property order,
  avoid duplicating the task title, and continue to use sensible defaults for newly
  generated Bases.
- [ ] Let users order project sections in Sprint Kanban views by a selected project
  property, such as Priority. Define ascending/descending order, missing values,
  deterministic tie-breaking, hidden projects, and per-view versus shared settings.

## Localization

- [ ] Add Japanese language support for settings, commands, notices, modals, custom Base
  views, generated workspace notes, tutorial content, and AI skill instructions. Follow
  Obsidian's active locale where available, retain English as the fallback, and keep
  property keys and persisted schema values stable across languages so changing locale
  does not break existing vault data.
