import type { App, Plugin } from 'obsidian';
import { Notice, PluginSettingTab, Setting } from 'obsidian';

import { getLocalDate, getWeekStart } from '../domain/SprintSchedule';
import type {
  IncompleteTaskPolicy,
  SprintProfile,
  SprintSettings,
} from '../domain/types';
import type { SprintFeatureApi } from '../SprintFeature';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
      .setDesc('Generate sprint notes and roll incomplete tasks on the configured cadence.')
      .addToggle((toggle) => toggle
        .setValue(this.feature.settings.enabled)
        .onChange(async (enabled) => {
          await this.mutateSettings((settings) => { settings.enabled = enabled; });
          if (enabled) await this.sync();
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
      .onChange((value) => mutate((target) => { target.rootFolder = value.trim(); })));

    new Setting(container).setName('Tasks base').addText((text) => text
      .setPlaceholder('Agile PM/Bases/Tasks.base')
      .setValue(profile.tasksBasePath)
      .onChange((value) => mutate((target) => { target.tasksBasePath = value.trim(); })));

    new Setting(container).setName('Sprints base').addText((text) => text
      .setPlaceholder('Agile PM/Bases/Sprints.base')
      .setValue(profile.sprintsBasePath)
      .onChange((value) => mutate((target) => { target.sprintsBasePath = value.trim(); })));

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
}
