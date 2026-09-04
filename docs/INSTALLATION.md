# Installation Guide

[English](INSTALLATION.md) | [日本語](INSTALLATION_ja.md)

This guide covers installing Sprint 0.2.1 from Obsidian Community plugins and creating or reconnecting a Sprint workspace.

## Requirements

- Obsidian 1.13.0 or later
- The Obsidian **Bases** core plugin enabled
- Community plugins enabled for the vault

## New Installation

1. Open the vault where you want to use Sprint. Select the settings icon in the lower-left corner.

   ![A new Obsidian vault with the settings icon in the lower-left corner](images/installation/01-open-obsidian.png)

2. Open **Community plugins**, select **Browse**, and search for **Sprint**. Choose the plugin published by **shijimi-soup**, then select **Install**.

   ![Sprint selected in the Obsidian Community plugins browser with the Install button visible](images/installation/02-install-from-community-plugins.png)

3. After installation finishes, select **Enable**.

   ![The installed Sprint plugin with the Enable button visible](images/installation/03-enable-plugin.png)

4. Sprint opens the welcome prompt. Select **Set up Sprint**.

   ![Sprint first-run welcome prompt with Not now and Set up Sprint actions](images/installation/13-new-workspace-welcome.png)

5. Review the folder, cadence, and future-sprint count. Select **Create workspace** to enable automatic synchronization and create the files.

   ![Sprint workspace confirmation with the default folder and cadence](images/installation/14-new-workspace-confirmation.png)

   Select **Not now** if you do not want Sprint to create files. You can reopen this prompt later from **Settings -> Sprint -> Setup guide**.

## Check The Workspace

After setup, the default `Sprint` folder contains the task, sprint, and project folders; three Bases files; local AI instructions; and `Sprint Summary.md`.

![The files and folders generated in a new Sprint workspace](images/installation/15-generated-workspace-files.png)

Open `Sprint/Sprint Summary.md`, or run **Open Sprint Summary** from the command palette. The first section shows current-sprint tasks grouped by project and state.

![Sprint Summary showing the current-sprint project boards](images/installation/16-generated-summary-current-tasks.png)

Scroll down to see completed story points in the Velocity chart and manage projects in the Projects table.

![Sprint Summary showing the Velocity chart](images/installation/17-generated-summary-velocity.png)

![Sprint Summary showing the Projects table](images/installation/18-generated-summary-projects.png)

## Existing Sprint Workspace

If the configured `Sprint` folder already exists but the plugin has no saved settings, the welcome prompt offers **Use workspace** instead of creating a new one.

![Sprint welcome prompt after detecting an existing workspace](images/installation/19-existing-workspace-welcome.png)

Review the detected folder and select **Use workspace**. Sprint creates only missing support files and sprint notes. Existing content is preserved, and tutorial projects and tasks are not recreated.

![Confirmation for connecting to an existing Sprint workspace](images/installation/20-existing-workspace-confirmation.png)

Reinstalling or updating Sprint does not reset sprint numbering or overwrite the existing workspace. The separate **Reset workspace** setting is destructive and requires explicit confirmation.

## Files Created

The default workspace structure is:

```text
Vault root/
├── .agents/skills/sprint/SKILL.md
├── .claude/skills/sprint/SKILL.md
└── Sprint/
    ├── Tasks.base
    ├── Sprints.base
    ├── Projects.base
    ├── Projects/
    ├── Tasks/
    ├── Sprints/
    ├── AGENTS.md
    ├── CLAUDE.md
    └── Sprint Summary.md
```

## Manual Installation

If Sprint is unavailable in the Community plugins browser:

1. Open the [latest Sprint release](https://github.com/ShijiMi-Soup/Sprint/releases/latest).
2. Download `main.js`, `manifest.json`, and `styles.css` from **Assets**. Do not use the source-code archives.
3. Create `<vault>/.obsidian/plugins/sprint/` and place all three files directly inside it.
4. Restart Obsidian, or run **Reload app without saving** from the command palette.
5. Open **Settings -> Community plugins** and enable Sprint.
6. Follow the welcome prompt to create or reconnect the workspace.

## Troubleshooting

- **The welcome prompt does not appear:** Open **Settings -> Sprint -> Setup guide**.
- **No workspace files appear:** Open **Settings -> Sprint** and make sure **Automatic sprints** is enabled.
- **The board does not render:** Open **Settings -> Core plugins** and enable **Bases**.
- **Sprint does not appear after manual installation:** Confirm that `main.js`, `manifest.json`, and `styles.css` are directly inside `.obsidian/plugins/sprint/`, then reload Obsidian.
