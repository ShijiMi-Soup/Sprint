# Sprint Reference

This reference describes the workspace, data model, generated files, views, and
maintenance operations provided by the Sprint Obsidian plugin.

For installation, see the [installation guide](INSTALLATION.md).

## General terms

| Term | Meaning |
| --- | --- |
| Sprint workspace | The configured vault folder managed by Sprint. Its default path is `Sprint/`. |
| Sprint | A fixed planning period. Sprint notes store the dates and lifecycle status for each period. |
| Current sprint | The sprint whose date range contains today. |
| Next sprint | The sprint immediately after the current sprint. |
| Last sprint | The sprint immediately before the current sprint. |
| Task | A Markdown note in the workspace `Tasks/` folder. Its properties determine its project, sprint, state, estimate, due date, and visibility. |
| Project | A Markdown note in the workspace `Projects/` folder. Tasks link to projects through the `project` property. |
| Backlog | Tasks with no sprint assigned. Sprint preserves them until they are planned. |
| Estimate | A numeric size or effort estimate, usually expressed as story points. |
| Rollover | The configured action for incomplete tasks when their assigned sprint ends. |
| Base | An Obsidian Bases `.base` file that defines properties, filters, formulas, and views over Markdown notes. |
| Base view | A table, Kanban board, overview, or chart configuration inside a Base file. |
| Archived task | A task kept in the vault and Tasks table but omitted from Sprint Kanban boards. |
| Hidden project | A project placed in the board's **Hidden** section. It is not deleted. |

## What Sprint adds

### Folders and files

With the default workspace path, Sprint creates this structure:

```text
Vault root/
|-- .agents/skills/sprint/SKILL.md
|-- .claude/skills/sprint/SKILL.md
`-- Sprint/
    |-- Projects/
    |-- Sprints/
    |-- Tasks/
    |-- Projects.base
    |-- Sprints.base
    |-- Tasks.base
    |-- Sprint Summary.md
    |-- AGENTS.md
    `-- CLAUDE.md
```

| Path | Purpose |
| --- | --- |
| `Sprint/Projects/` | Project notes. These are user data. |
| `Sprint/Sprints/` | Generated sprint notes and their review or retrospective links. |
| `Sprint/Tasks/` | Task notes. These are user data. |
| `Sprint/Projects.base` | Project table and project-state formula. |
| `Sprint/Sprints.base` | Sprint overview, active/all sprint tables, and Velocity view. |
| `Sprint/Tasks.base` | Task table and the Sprint board, Current sprint, and Next sprint Kanban views. |
| `Sprint/Sprint Summary.md` | Summary page embedding the current sprint board, Velocity chart, and Projects table. |
| `Sprint/AGENTS.md` | Workspace-specific instructions for compatible coding agents. |
| `Sprint/CLAUDE.md` | Workspace-specific instructions for Claude Code. |
| `.agents/skills/sprint/SKILL.md` | Vault-root Sprint skill for agents that support the Agent Skills convention. |
| `.claude/skills/sprint/SKILL.md` | Vault-root Sprint skill for Claude Code. |

Normal synchronization creates missing support files and applies additive
migrations. Existing task and project notes are not replaced. Existing
workspaces also do not receive tutorial projects or tasks after a reinstall.
Unknown Base properties, custom views, unrelated skills, and unmanaged files are
preserved.

### Views

#### Tasks Base

| View | Purpose |
| --- | --- |
| Sprint board | All non-archived tasks grouped first by project and then by Not started, In progress, and Done. |
| Sprint planner | Default Tasks view. Non-archived tasks shown in project swimlanes with Backlog and generated sprint columns for reassignment. |
| Tasks | Editable table of all task notes, including archived tasks. |
| Current sprint | Non-archived tasks assigned to the current sprint, grouped by active projects. |
| Next sprint | Non-archived tasks assigned to the next sprint, grouped by active projects. |

The full Sprint board can show projects in any project state. Current and Next
sprint views show projects that are in progress. Each project section can be
collapsed or moved to the board's **Hidden** section. Dragging a task card between
state columns updates the task properties.

The **Sprint planner** is the default Tasks Base view. Each project is a horizontal
swimlane containing Backlog and generated sprint columns ordered by start date. The
planner shows task and estimate totals for its groups. Drag a task horizontally to
change its `sprint` assignment, or vertically into another project swimlane to change
its `project` assignment. A diagonal move can update both properties in one action;
task state remains unchanged. Each card also provides Sprint and Project selectors for
keyboard and mobile reassignment.
Completed tasks are visible by default, while archived tasks remain excluded.
Use the view's **Show completed tasks** option to hide completed work.

Use **Order project groups by** in the view settings to sort project swimlanes by
name or numeric project Priority. **Project group direction** controls ascending or
descending order; projects without a Priority and **No project** remain at the end.

#### Sprints Base

| View | Purpose |
| --- | --- |
| Sprint overview | Cards for the last, current, and next sprint with dates, task/point progress, review, and retrospective status. |
| Active sprints | Table of the last, current, and next sprint. |
| Velocity | Bar chart of completed estimate points for every generated sprint, including zero-point sprints. |
| All sprints | Complete sprint history table. |

#### Projects Base

The **Projects** table shows project state, progress checkboxes, board visibility,
priority, and due date.

#### Sprint Summary

`Sprint Summary.md` embeds the Current sprint Kanban view, Velocity view, and
Projects table. Run **Sprint: Open summary** from the command palette to open it.

### Sprint features

- Generate current and future sprint notes on a configurable 1-8 week cadence. New
  workspaces keep the next two sprints available by default so the second future
  sprint can hold provisional work without committing it to the immediate next sprint.
- Catch up after Obsidian has been closed for one or more sprint cycles.
- Mark generated sprint notes as `last`, `current`, `next`, `past`, or `future`.
- Move unfinished work according to the selected rollover policy.
- Create tasks inline from a Kanban column with project, sprint, and state context.
- Edit task state by dragging cards between columns.
- Plan tasks in project swimlanes by dragging them across Backlog and generated sprint
  columns, or between projects. A drop updates the sprint and/or project represented by
  its destination without changing task state.
- Select and order the task properties shown on Kanban cards.
- Collapse projects, hide projects, and open the underlying project note.
- Archive tasks without deleting their notes.
- Track completed points with the built-in Velocity chart.
- Open settings from the ribbon and the summary from the command palette.

### AI instructions

Sprint does not call an AI model or send vault content over the network. It
creates local instruction files so independently installed AI tools can
understand the workspace schema.

- The vault-root `.agents` and `.claude` skill files contain the reusable Sprint
  workflow and property conventions.
- `Sprint/AGENTS.md` and `Sprint/CLAUDE.md` add workspace-specific paths.
- Creating managed instruction sections in vault-root `AGENTS.md` and
  `CLAUDE.md` is optional and disabled by default.
- Existing directories, unrelated skills, and unmanaged instruction content are
  preserved.
- The generated skill and its custom additions can be reviewed from **Settings
  -> Sprint -> AI skills**.

External AI tools have their own permissions and privacy behavior. Review those
tools separately before granting vault access.

## Task properties

Property keys remain stable even when their display labels are capitalized in a
Base.

| Property | Type | Meaning |
| --- | --- | --- |
| `project` | List of links | Project note associated with the task. |
| `sprint` | List of links | Sprint note assigned to the task. Empty means backlog. |
| `estimate` | Number | Story-point or effort estimate. |
| `due` | Date | Optional due date. Kanban cards display it as `yyyy/mm/dd`. |
| `in progress` | Checkbox | Marks work as started when `is done` is false. |
| `is done` | Checkbox | Marks the task Done. |
| `archived` | Checkbox | Hides the task from Kanban boards while retaining it elsewhere. |

Sprint derives the visible state from two checkboxes:

| State | `in progress` | `is done` |
| --- | --- | --- |
| Not started | `false` | `false` |
| In progress | `true` | `false` |
| Done | Either value | `true` |

## Project properties

| Property | Type | Meaning |
| --- | --- | --- |
| `in progress` | Checkbox | Project is active. Current and Next sprint boards show active projects. |
| `is done` | Checkbox | Project is complete. |
| `hidden` | Checkbox | Places the project in the full board's Hidden section. |
| `priority` | Number | Optional project priority. |
| `due` | Date | Optional project due date. |

## Sprint properties

| Property | Meaning |
| --- | --- |
| `sprint number` | Sequential number calculated from the configured cadence anchor. |
| `start date` | First date in the sprint. |
| `end date` | Last date in the sprint. |
| `sprint status` | Lifecycle value such as `last`, `current`, `next`, `past`, or `future`. |
| `review` | Optional sprint-review note or link. |
| `retrospective` | Optional retrospective note or link. |

## Change visible Kanban properties

Kanban card fields use the native Obsidian Bases **Properties** selector.

1. Open `Sprint/Tasks.base`, or open a Sprint Summary section and select the
   embedded view.
2. Select **Properties** in the Base toolbar.
3. Check a property to show it on every card in that view, or uncheck it to hide
   it.
4. Reorder selected properties in the selector to change their order on cards.

The Task title is always rendered as the card title and is not duplicated as a
property badge. Estimate and Due are visible by default. The full Sprint board
also shows Sprint by default; Current and Next sprint views omit it because the
scope is already known. Each Base view stores its own selection.

The inline **New task** form uses the same visible editable note properties, in
the same order. It supports text, number, checkbox, date, date-time, list, tag,
and link values. Formula, file, title, project, state, and archive properties
are excluded because Sprint or Obsidian controls them.

Project and state are supplied by the lane where the form was opened. A task
created in **Current sprint** is assigned to the current sprint, and one created
in **Next sprint** is assigned to the next sprint. The full **Sprint board**
does not assign a sprint automatically; when Sprint is visible in that view's
Properties selection, the form provides a sprint selector and defaults to
**No sprint**.

Run **Open planner** from the command palette to open the configured
`Tasks.base#Sprint planner` view directly. The command does not depend on which
view the user has chosen as the Tasks Base default.

## Rename the Sprint workspace

### Supported method

Use **Settings -> Sprint -> Workspace -> Sprint folder**, enter the new path,
then select **Rename**. Sprint moves the existing folder and updates the Tasks,
Sprints, and Projects Base paths in its saved settings.

### Manual rename and missing workspaces

When a workspace or one of its ancestor folders is renamed while Obsidian and
Sprint are running, Sprint follows the vault rename event and updates the saved
workspace and Base paths without scanning the vault.

If the configured workspace is missing when Sprint starts, automatic
synchronization pauses instead of recreating the old path. Sprint asks once per
Obsidian launch how to recover it. You can:

- enter the moved folder's vault-relative path and select **Locate workspace**;
- select **Create new workspace**, then complete the separate confirmation to
  create support files and sprint notes without tutorial tasks; or
- select **Not now** and leave the vault unchanged until the next launch.

Running Sync, Generate bases, Open summary, or Reset opens the recovery prompt
again. Do not reset the workspace to repair a rename; reset deletes the
configured workspace.

## Reset the Sprint workspace

Reset is destructive. It sends the entire configured Sprint workspace folder to
Obsidian's trash, then recreates the default folders, Base files, summary, AI
instructions, sprint notes, and tutorial content.

1. Confirm that the configured Sprint folder is the folder you intend to delete.
2. Back up or move any task, project, sprint, or custom note you need to retain.
3. Turn on **Automatic sprints**. Reset is unavailable while it is disabled.
4. Open **Settings -> Sprint**.
5. In the **Workspace** heading, select the reset icon.
6. Type `Yes, delete.` exactly.
7. Select **Reset folder**.

Reset does not mean "repair missing support files." For a non-destructive repair,
run **Sprint: Generate bases** and then **Sprint: Sync**.

## Commands

| Command | Effect |
| --- | --- |
| Sprint: Open summary | Opens the configured `Sprint Summary.md`. |
| Sprint: Open planner | Opens the configured Tasks Base's Sprint Planner view directly. |
| Sprint: Sync | Creates missing sprint notes, updates lifecycle statuses, and applies rollover. |
| Sprint: Generate bases | Creates missing support files and applies managed Base schema migrations. |
