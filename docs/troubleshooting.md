# Troubleshooting

## The welcome prompt does not appear

Open **Settings -> Sprint -> Setup guide**. If Sprint has already connected to
a workspace, use the settings page to review the configured folder and
automatic synchronization.

## No files appear

Confirm that **Automatic sprints** is enabled and that the Obsidian **Bases**
core plugin is enabled. Then run **Sprint: Generate bases** followed by
**Sprint: Sync**.

## A workspace folder was renamed

Sprint's supported rename action updates its saved paths safely. Sprint also
follows workspace and ancestor-folder renames made in Obsidian while the plugin
is running.

If the workspace was moved while Sprint was not running, automatic
synchronization pauses and a recovery prompt appears. Enter the new
vault-relative folder path and select **Locate workspace**. If the original
workspace was deleted intentionally, select **Create new workspace** and
complete the separate confirmation. **Not now** leaves the vault unchanged and
suppresses automatic prompts until Obsidian is restarted.

Do not reset the workspace to repair a rename. Reset deletes the configured
folder.

## The board is empty

Check the task's `archived`, `sprint`, `project`, `in progress`, and `is done`
properties. The Current sprint and Next sprint views are scoped to their sprint
and only show active projects. Archived tasks remain available in the Tasks
table but are hidden from Kanban boards.

## How do I repair support files?

Run **Sprint: Generate bases**. This is additive and preserves existing task,
project, sprint, custom property, and custom view content. Use **Reset folder**
only when you intentionally want to delete the configured workspace.

If the configured workspace itself is missing, Generate bases opens the
recovery prompt instead of recreating the old folder silently.
