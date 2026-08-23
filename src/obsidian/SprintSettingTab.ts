import type { App, Plugin } from 'obsidian';
import { Modal, Notice, PluginSettingTab, Setting } from 'obsidian';

import { getLocalDate, getWeekStart } from '../domain/SprintSchedule';
import type {
  IncompleteTaskPolicy,
  SprintProfile,
  SprintSettings,
} from '../domain/types';
import type { SprintFeatureApi } from '../SprintFeature';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function defaultBasePath(rootFolder: string, filename: string): string {
  return rootFolder ? `${rootFolder}/Bases/${filename}` : '';
}

function shouldMoveDefaultBasePath(path: string, previousRoot: string, filename: string): boolean {
  return !path || path === defaultBasePath(previousRoot, filename) || path.endsWith(`/Bases/${filename}`);
}

class EnableAutomaticSprintsModal extends Modal {
  constructor(
    app: App,
    private readonly onConfirm: () => void,
    private readonly onCancel: () => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText('Turn on automatic sprints?');
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: 'Sprint will create missing Tasks, Sprints, and Projects Base files, current and future sprint notes, an Agile PM dashboard note, and local AI instruction files for tools such as Codex and Claude Code.',
    });
    this.contentEl.createEl('p', {
      text: 'Existing Base files are not overwritten.',
    });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('Cancel')
        .onClick(() => {
          this.onCancel();
          this.close();
        }))
      .addButton((button) => button
        .setButtonText('Turn on')
        .setCta()
        .onClick(() => {
          this.onConfirm();
          this.close();
        }));
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

class ResetSprintProfileModal extends Modal {
  private confirmation = '';

  constructor(
    app: App,
    private readonly profile: SprintProfile,
    private readonly onConfirm: () => void,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText(`Reset ${this.profile.rootFolder || this.profile.name}?`);
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: `This permanently deletes ${this.profile.rootFolder || 'this sprint profile folder'} and regenerates the default Sprint folder, Base files, dashboard, AI instruction files, and sprint notes.`,
    });
    this.contentEl.createEl('p', {
      text: 'To continue, type exactly: Yes, delete.',
    });

    let confirmButton: { setDisabled(disabled: boolean): unknown } | null = null;
    new Setting(this.contentEl)
      .setName('Confirmation')
      .addText((text) => text
        .setPlaceholder('Yes, delete.')
        .onChange((value) => {
          this.confirmation = value;
          confirmButton?.setDisabled(this.confirmation !== 'Yes, delete.');
        }));

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('Cancel')
        .onClick(() => { this.close(); }))
      .addButton((button) => {
        confirmButton = button;
        button
          .setButtonText('Reset folder')
          .setWarning()
          .setDisabled(true)
          .onClick(() => {
            if (this.confirmation !== 'Yes, delete.') return;
            this.onConfirm();
            this.close();
          });
      });
  }

  override onClose(): void {
    this.contentEl.empty();
  }
}

export class SprintSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private readonly feature: SprintFeatureApi,
  ) {
    super(app, plugin);
  }

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h1', { text: 'Sprint' });

    new Setting(containerEl)
      .setName('Automatic sprints')
      .setDesc('Generate missing Base files and sprint notes, then roll incomplete tasks on the configured cadence.')
      .addToggle((toggle) => toggle
        .setValue(this.feature.settings.enabled)
        .onChange(async (enabled) => {
          if (enabled && !this.feature.settings.enabled) {
            toggle.setValue(false);
            new EnableAutomaticSprintsModal(
              this.app,
              () => { void this.enableAutomaticSprints(); },
              () => { toggle.setValue(false); },
            ).open();
            return;
          }
          await this.mutateSettings((settings) => { settings.enabled = enabled; });
          this.display();
        }));

    this.renderDefaults(containerEl);
    this.renderProfiles(containerEl);

    new Setting(containerEl)
      .setName('Synchronize now')
      .setDesc('Create missing sprint notes, update lifecycle statuses, and apply rollover rules.')
      .addButton((button) => button
        .setButtonText('Sync sprints')
        .setCta()
        .onClick(() => { void this.sync(); }));

    new Setting(containerEl)
      .setName('Generate Bases')
      .setDesc('Create missing Base files, dashboard notes, and local AI instruction files for enabled profiles.')
      .addButton((button) => button
        .setButtonText('Generate Bases')
        .onClick(() => { void this.generateBases(); }));

    new Setting(containerEl)
      .setName('Vault-root AI instructions')
      .setDesc('Also generate Sprint-managed AGENTS.md and CLAUDE.md files at the Obsidian vault root. Existing instruction files are never overwritten.')
      .addToggle((toggle) => toggle
        .setValue(this.feature.settings.generateVaultRootInstructions)
        .onChange(async (enabled) => {
          await this.mutateSettings((settings) => {
            settings.generateVaultRootInstructions = enabled;
          });
          await this.generateBases();
        }));
  }

  private renderDefaults(container: HTMLElement): void {
    const defaults = this.feature.settings.defaults;
    new Setting(container).setName('Global defaults').setHeading();

    new Setting(container).setName('Sprint duration').addSlider((slider) => slider
      .setLimits(1, 8, 1)
      .setDynamicTooltip()
      .setValue(defaults.durationWeeks)
      .onChange((value) => this.mutateSettings((settings) => {
        settings.defaults.durationWeeks = value;
      })));

    new Setting(container).setName('Start day').addDropdown((dropdown) => {
      for (const [index, day] of DAYS.entries()) dropdown.addOption(String(index), day);
      dropdown.setValue(String(defaults.startDay)).onChange((value) => this.mutateSettings((settings) => {
        settings.defaults.startDay = Number(value);
      }));
    });

    new Setting(container).setName('Incomplete tasks').addDropdown((dropdown) => dropdown
      .addOption('next', 'Move to current sprint')
      .addOption('backlog', 'Move to backlog')
      .addOption('keep', 'Keep in original sprint')
      .setValue(defaults.incompleteTaskPolicy)
      .onChange((value) => this.mutateSettings((settings) => {
        settings.defaults.incompleteTaskPolicy = value as IncompleteTaskPolicy;
      })));

    new Setting(container).setName('Future sprints').addSlider((slider) => slider
      .setLimits(1, 8, 1)
      .setDynamicTooltip()
      .setValue(defaults.futureSprintCount)
      .onChange((value) => this.mutateSettings((settings) => {
        settings.defaults.futureSprintCount = value;
      })));

    new Setting(container)
      .setName('Sprint naming')
      .setDesc('Use {number} where the sequential sprint number should appear.')
      .addText((text) => text
        .setPlaceholder('Sprint {number}')
        .setValue(defaults.namingFormat)
        .onChange((value) => this.mutateSettings((settings) => {
          settings.defaults.namingFormat = value.trim() || 'Sprint {number}';
        })));
  }

  private renderProfiles(container: HTMLElement): void {
    new Setting(container)
      .setName('Sprint profiles')
      .setDesc('A profile owns the cadence shared by its Tasks and Sprints Bases.')
      .setHeading()
      .addButton((button) => button.setButtonText('Add profile').onClick(async () => {
        await this.mutateSettings((settings) => {
          settings.profiles.push({
            id: `sprint-${Date.now()}`,
            name: 'New sprint profile',
            enabled: true,
            rootFolder: '',
            tasksBasePath: '',
            sprintsBasePath: '',
            projectsBasePath: '',
            anchorDate: '',
            overrides: {},
          });
        });
        this.display();
      }));

    for (const profile of this.feature.settings.profiles) {
      this.renderProfile(container, profile);
    }
  }

  private renderProfile(container: HTMLElement, profile: SprintProfile): void {
    const mutate = (mutation: (profile: SprintProfile) => void): Promise<void> => (
      this.mutateSettings((settings) => {
        const target = settings.profiles.find(({ id }) => id === profile.id);
        if (target) mutation(target);
      })
    );

    new Setting(container)
      .setName(profile.name || 'Sprint profile')
      .setHeading()
      .addToggle((toggle) => toggle.setValue(profile.enabled).onChange((enabled) => (
        mutate((target) => { target.enabled = enabled; })
      )))
      .addExtraButton((button) => button
        .setIcon('rotate-ccw')
        .setTooltip('Reset sprint profile folder')
        .onClick(() => {
          new ResetSprintProfileModal(
            this.app,
            profile,
            () => { void this.resetProfile(profile.id); },
          ).open();
        }))
      .addExtraButton((button) => button
        .setIcon('trash-2')
        .setTooltip('Remove sprint profile')
        .onClick(async () => {
          await this.mutateSettings((settings) => {
            settings.profiles = settings.profiles.filter(({ id }) => id !== profile.id);
          });
          this.display();
        }));

    new Setting(container).setName('Profile name').addText((text) => text
      .setValue(profile.name)
      .onChange((value) => mutate((target) => { target.name = value.trim(); })));

    new Setting(container).setName('Project folder').addText((text) => text
      .setPlaceholder('Agile project')
      .setValue(profile.rootFolder)
      .onChange((value) => mutate((target) => {
        const previousRoot = target.rootFolder;
        const nextRoot = value.trim();
        if (shouldMoveDefaultBasePath(target.tasksBasePath, previousRoot, 'Tasks.base')) {
          target.tasksBasePath = defaultBasePath(nextRoot, 'Tasks.base');
        }
        if (shouldMoveDefaultBasePath(target.sprintsBasePath, previousRoot, 'Sprints.base')) {
          target.sprintsBasePath = defaultBasePath(nextRoot, 'Sprints.base');
        }
        if (shouldMoveDefaultBasePath(target.projectsBasePath, previousRoot, 'Projects.base')) {
          target.projectsBasePath = defaultBasePath(nextRoot, 'Projects.base');
        }
        target.rootFolder = nextRoot;
      })));

    new Setting(container).setName('Tasks base').addText((text) => text
      .setPlaceholder('Agile PM/Bases/Tasks.base')
      .setValue(profile.tasksBasePath)
      .onChange((value) => mutate((target) => { target.tasksBasePath = value.trim(); })));

    new Setting(container).setName('Sprints base').addText((text) => text
      .setPlaceholder('Agile PM/Bases/Sprints.base')
      .setValue(profile.sprintsBasePath)
      .onChange((value) => mutate((target) => { target.sprintsBasePath = value.trim(); })));

    new Setting(container).setName('Projects base').addText((text) => text
      .setPlaceholder('Agile PM/Bases/Projects.base')
      .setValue(profile.projectsBasePath)
      .onChange((value) => mutate((target) => { target.projectsBasePath = value.trim(); })));

    const startDay = profile.overrides.startDay ?? this.feature.settings.defaults.startDay;
    new Setting(container).setName('Cadence anchor').addText((text) => text
      .setPlaceholder(getWeekStart(getLocalDate(), startDay))
      .setValue(profile.anchorDate)
      .onChange((value) => {
        const trimmed = value.trim();
        if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return Promise.resolve();
        return mutate((target) => { target.anchorDate = trimmed; });
      }));

    new Setting(container).setName('Duration override').addDropdown((dropdown) => {
      dropdown.addOption('default', 'Use global default');
      for (let weeks = 1; weeks <= 8; weeks += 1) {
        dropdown.addOption(String(weeks), `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`);
      }
      dropdown.setValue(profile.overrides.durationWeeks?.toString() ?? 'default')
        .onChange((value) => mutate((target) => {
          if (value === 'default') delete target.overrides.durationWeeks;
          else target.overrides.durationWeeks = Number(value);
        }));
    });

    new Setting(container).setName('Start day override').addDropdown((dropdown) => {
      dropdown.addOption('default', 'Use global default');
      for (const [index, day] of DAYS.entries()) dropdown.addOption(String(index), day);
      dropdown.setValue(profile.overrides.startDay?.toString() ?? 'default')
        .onChange((value) => mutate((target) => {
          if (value === 'default') delete target.overrides.startDay;
          else target.overrides.startDay = Number(value);
        }));
    });

    new Setting(container).setName('Rollover override').addDropdown((dropdown) => dropdown
      .addOption('default', 'Use global default')
      .addOption('next', 'Move to current sprint')
      .addOption('backlog', 'Move to backlog')
      .addOption('keep', 'Keep in original sprint')
      .setValue(profile.overrides.incompleteTaskPolicy ?? 'default')
      .onChange((value) => mutate((target) => {
        if (value === 'default') delete target.overrides.incompleteTaskPolicy;
        else target.overrides.incompleteTaskPolicy = value as IncompleteTaskPolicy;
      })));

    new Setting(container).setName('Future sprint override').addDropdown((dropdown) => {
      dropdown.addOption('default', 'Use global default');
      for (let count = 1; count <= 8; count += 1) {
        dropdown.addOption(String(count), String(count));
      }
      dropdown.setValue(profile.overrides.futureSprintCount?.toString() ?? 'default')
        .onChange((value) => mutate((target) => {
          if (value === 'default') delete target.overrides.futureSprintCount;
          else target.overrides.futureSprintCount = Number(value);
        }));
    });

    new Setting(container).setName('Naming override').addText((text) => text
      .setPlaceholder(this.feature.settings.defaults.namingFormat)
      .setValue(profile.overrides.namingFormat ?? '')
      .onChange((value) => mutate((target) => {
        const trimmed = value.trim();
        if (trimmed) target.overrides.namingFormat = trimmed;
        else delete target.overrides.namingFormat;
      })));
  }

  private mutateSettings(mutation: (settings: SprintSettings) => void): Promise<void> {
    return this.feature.updateSettings(mutation);
  }

  private async sync(): Promise<void> {
    if (!this.feature.settings.enabled) {
      new Notice('Enable automatic sprints before synchronizing.');
      return;
    }
    try {
      const result = await this.feature.sync();
      new Notice(`Sprints synchronized: ${result.created} created, ${result.movedTasks} tasks moved.`);
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint sync failed: ${error.message}` : 'Sprint sync failed.');
    }
  }

  private async enableAutomaticSprints(): Promise<void> {
    await this.mutateSettings((settings) => { settings.enabled = true; });
    await this.sync();
    this.display();
  }

  private async resetProfile(profileId: string): Promise<void> {
    if (!this.feature.settings.enabled) {
      new Notice('Enable automatic sprints before resetting a profile folder.');
      return;
    }
    try {
      const result = await this.feature.resetProfile(profileId);
      new Notice(`Sprint profile reset: ${result.created} sprints created.`);
      this.display();
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint profile reset failed: ${error.message}` : 'Sprint profile reset failed.');
    }
  }

  private async generateBases(): Promise<void> {
    try {
      const result = await this.feature.generateBases();
      new Notice(`Sprint Bases generated: ${result.created} created, ${result.skipped} already existed.`);
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint Base generation failed: ${error.message}` : 'Sprint Base generation failed.');
    }
  }
}
