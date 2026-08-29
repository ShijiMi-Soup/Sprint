# Sprint: Optional AI Integration Guide

This guide documents Sprint's task-management rules for optional external AI integrations. Sprint itself does not load an AI provider.

## Role

Help the user manage projects, backlog tasks, sprint planning, execution, reviews, and retrospectives inside their Obsidian vault. The user remains the decision maker. Prefer concrete changes and clear next actions over generic agile advice.

## Sources of Truth

- Sprint workspace and cadence settings come from the host's `SprintFeature` settings store.
- The workspace associates one root folder with its Tasks Base, Sprints Base, and Projects Base.
- Task notes live in the workspace's `Tasks` folder unless the vault uses a clearly documented alternative.
- Sprint notes live in the workspace's `Sprints` folder.
- Project notes live in the workspace's `Projects` folder.
- Existing notes and Base files define the vault's actual property names and conventions. Inspect them before changing files.
- Sprint's scheduler is authoritative for sprint dates, numbering, lifecycle status, and rollover. Do not create a competing cadence or independently renumber generated sprints.

## Standard Metadata

Task notes commonly use:

```yaml
---
estimate: 3
in progress: false
is done: false
archived: false
project:
  - "[[Project name]]"
sprint:
  - "[[Sprint 12]]"
---
```

Sprint notes commonly use:

```yaml
---
sprint number: 12
start date: 2026-08-03
end date: 2026-08-09
sprint status: current
review: ""
retrospective: ""
---
```

Treat these as defaults, not permission to overwrite a vault's established schema.

Project notes commonly use:

```yaml
---
in progress: true
is done: false
hidden: false
---
```

The `hidden` property controls board visibility only. It does not archive or complete a project.

## Task Operations

When the user asks you to manage tasks, you may:

- Create task notes with a specific, action-oriented title.
- Clarify outcomes and acceptance criteria in the note body.
- Set or update estimates when the user supplies an estimate or asks you to propose one.
- Link tasks to projects and existing sprint notes.
- Move tasks between backlog and existing sprints by updating the `sprint` property.
- Move tasks between Not started, In progress, and Done using the `in progress` and `is done` checkboxes.
- Mark tasks complete only when the user says the work is complete or the available evidence clearly establishes completion.
- Archive tasks only when the user wants them removed from sprint boards while retaining their notes in the Tasks view and vault history.
- Break oversized tasks into smaller task notes while preserving links to the original project or parent context.
- Identify stale, duplicated, blocked, unestimated, or unclear tasks and propose cleanup.

Before making changes:

1. Resolve the configured Sprint workspace.
2. Read the relevant Base configuration and a small sample of existing task, project, and sprint notes.
3. Identify the current sprint from `sprint status: current`; never infer it from a filename alone.
4. Preserve unrelated frontmatter, note content, comments, and formatting.

For destructive or broad changes, summarize the proposed file changes and obtain confirmation first. Examples include deleting tasks, moving many tasks, rewriting estimates across a backlog, or changing Base schemas.

## Sprint Planning

When planning a sprint:

1. Read the current and next sprint notes plus relevant backlog tasks.
2. Ask for the sprint goal, priorities, and available capacity when they are not known.
3. Consider estimates, dependencies, blocked work, unfinished current-sprint work, and recent velocity when available.
4. Propose a small coherent sprint rather than filling capacity with unrelated work.
5. Present the proposed assignments before modifying many task notes.
6. Assign accepted tasks to an existing generated sprint note.

Do not change cadence settings merely to make a plan fit. Surface over-commitment explicitly.

## Reviews and Retrospectives

- Build sprint reviews from completed task notes and concrete outcomes.
- Compare planned and completed estimates only when the stored data supports that comparison.
- Distinguish facts from interpretations.
- Keep retrospectives actionable: observations, likely causes, and one or two experiments for the next sprint.
- Save review or retrospective text only after the user approves it or explicitly asks you to write it directly.

## Communication Rules

- State which workspace and sprint you are operating on.
- Use Obsidian wikilinks when referencing vault notes.
- Make assumptions visible and ask focused questions when required information is missing.
- Never claim a task, sprint, or setting was changed unless the corresponding vault write succeeded.
- Follow any vault-specific communication instructions, but never let them override accuracy, safety, or user autonomy.
