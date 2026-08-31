import type {
  App,
  ExtraButtonComponent,
  Plugin,
  SettingDefinition,
  SettingDefinitionItem,
} from 'obsidian';
import { Modal, Notice, PluginSettingTab, Setting } from 'obsidian';

import { getLocalDate, getWeekStart } from '../domain/SprintSchedule';
import type {
  IncompleteTaskPolicy,
  SprintProfile,
  SprintSettings,
} from '../domain/types';
import type { SprintFeatureApi } from '../SprintFeature';
import { sprintSkillContent } from './SprintBaseGenerator';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
      text: 'Sprint will create missing tasks, sprints, and projects base files, current and future sprint notes, a summary note, local AI instruction files, and vault-root skills for Codex and Claude Code.',
    });
    this.contentEl.createEl('p', {
      text: 'Existing base files are upgraded in place while custom views and properties are preserved.',
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
    this.titleEl.setText(`Reset ${this.profile.rootFolder || 'Sprint workspace'}?`);
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: `This permanently deletes ${this.profile.rootFolder || 'this Sprint workspace folder'} and regenerates the configured Sprint folder, Base files, summary, AI instruction files, and sprint notes.`,
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
          .setDestructive()
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

class SprintSkillEditorModal extends Modal {
  private customInstructions: string;
  private previewEl: HTMLTextAreaElement | null = null;

  constructor(
    app: App,
    private readonly settings: SprintSettings,
    private readonly onSave: (instructions: string) => void,
  ) {
    super(app);
    this.customInstructions = settings.skillCustomInstructions['sprint-vault'] ?? '';
  }

  override onOpen(): void {
    this.titleEl.setText('Sprint vault skill');
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: 'Sprint installs this skill at .agents/skills and .claude/skills in the vault root. The generated core stays current; additions entered here are appended to both copies.',
    });

    new Setting(this.contentEl)
      .setName('Generated skill preview')
      .addTextArea((textarea) => {
        this.previewEl = textarea.inputEl;
        textarea.inputEl.readOnly = true;
        textarea.inputEl.rows = 14;
        textarea.inputEl.addClass('sprint-skill-textarea');
        this.updatePreview();
      });

    new Setting(this.contentEl)
      .setName('Vault-specific instructions')
      .setDesc('Optional instructions appended to the generated sprint workflow.')
      .addTextArea((textarea) => {
        textarea.setValue(this.customInstructions);
        textarea.inputEl.rows = 8;
        textarea.inputEl.addClass('sprint-skill-textarea');
        textarea.onChange((value) => {
          this.customInstructions = value;
          this.updatePreview();
        });
      });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('Cancel')
        .onClick(() => { this.close(); }))
      .addButton((button) => button
        .setButtonText('Save skill')
        .setCta()
        .onClick(() => {
          this.onSave(this.customInstructions.trim());
          this.close();
        }));
  }

  override onClose(): void {
    this.contentEl.empty();
  }

  private updatePreview(): void {
    if (!this.previewEl) return;
    this.previewEl.value = sprintSkillContent(
      this.settings,
      this.settings.profiles,
      this.customInstructions,
    );
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

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const profile = this.feature.settings.profiles[0];
    return [
      this.renderDefinition(
        'Automatic sprints',
        ['enable', 'cadence', 'rollover'],
        (setting) => { this.configureAutomaticSprints(setting); },
      ),
      {
        type: 'group',
        heading: 'Global defaults',
        items: this.defaultDefinitions(),
      },
      {
        type: 'group',
        heading: 'Workspace',
        extraButtons: profile ? [
          (button: ExtraButtonComponent): void => {
            button.setIcon('rotate-ccw')
              .setTooltip('Reset sprint workspace')
              .onClick(() => {
              new ResetSprintProfileModal(
                this.app,
                profile,
                () => { void this.resetProfile(profile.id); },
              ).open();
              });
          },
        ] : undefined,
        items: profile ? this.profileDefinitions(profile) : [],
      },
      {
        type: 'group',
        heading: 'Maintenance',
        items: this.maintenanceDefinitions(),
      },
      {
        type: 'group',
        heading: 'AI skills',
        items: this.aiDefinitions(),
      },
    ];
  }

  private renderDefinition(
    name: string,
    aliases: string[],
    render: (setting: Setting) => void,
    desc?: string,
  ): SettingDefinition {
    return {
      name,
      aliases,
      desc,
      render: (setting): void => { render(setting); },
    };
  }

  private configureAutomaticSprints(setting: Setting): void {
    setting
      .setDesc('Generate missing base files and sprint notes, then roll incomplete tasks on the configured cadence.')
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
          this.refreshSettings();
        }));
  }

  private defaultDefinitions(): SettingDefinition[] {
    const defaults = this.feature.settings.defaults;
    return [
      this.renderDefinition('Sprint duration', ['duration', 'weeks'], (setting) => {
        setting.addSlider((slider) => slider
          .setLimits(1, 8, 1)
          .setValue(defaults.durationWeeks)
          .onChange((value) => this.mutateSettings((settings) => {
            settings.defaults.durationWeeks = value;
          })));
      }),
      this.renderDefinition('Start day', ['cadence', 'week'], (setting) => {
        setting.addDropdown((dropdown) => {
          for (const [index, day] of DAYS.entries()) dropdown.addOption(String(index), day);
          dropdown.setValue(String(defaults.startDay)).onChange((value) => (
            this.mutateSettings((settings) => {
              settings.defaults.startDay = Number(value);
            })
          ));
        });
      }),
      this.renderDefinition('Incomplete tasks', ['rollover', 'unfinished'], (setting) => {
        setting.addDropdown((dropdown) => dropdown
          .addOption('next', 'Move to current sprint')
          .addOption('backlog', 'Move to backlog')
          .addOption('keep', 'Keep in original sprint')
          .setValue(defaults.incompleteTaskPolicy)
          .onChange((value) => this.mutateSettings((settings) => {
            settings.defaults.incompleteTaskPolicy = value as IncompleteTaskPolicy;
          })));
      }),
      this.renderDefinition('Future sprints', ['future', 'count'], (setting) => {
        setting.addSlider((slider) => slider
          .setLimits(1, 8, 1)
          .setValue(defaults.futureSprintCount)
          .onChange((value) => this.mutateSettings((settings) => {
            settings.defaults.futureSprintCount = value;
          })));
      }),
      this.renderDefinition(
        'Sprint naming',
        ['name', 'number'],
        (setting) => {
          setting.addText((text) => text
            .setPlaceholder('Sprint {number}')
            .setValue(defaults.namingFormat)
            .onChange((value) => this.mutateSettings((settings) => {
              settings.defaults.namingFormat = value.trim() || 'Sprint {number}';
            })));
        },
        'Use {number} where the sequential sprint number should appear.',
      ),
    ];
  }

  private profileDefinitions(profile: SprintProfile): SettingDefinition[] {
    const mutate = (mutation: (profile: SprintProfile) => void): Promise<void> => (
      this.mutateSettings((settings) => {
        const target = settings.profiles.find(({ id }) => id === profile.id);
        if (target) mutation(target);
      })
    );

    let folderDraft = profile.rootFolder;
    const startDay = profile.overrides.startDay ?? this.feature.settings.defaults.startDay;
    return [
      this.renderDefinition(
        'Workspace name',
        ['profile', 'label'],
        (setting) => {
          setting.addText((text) => text
            .setValue(profile.name)
            .onChange((value) => mutate((target) => { target.name = value.trim(); })));
        },
        'A display label for this sprint workspace. Changing it does not rename vault files.',
      ),
      this.renderDefinition(
        'Sprint folder',
        ['workspace', 'folder', 'rename'],
        (setting) => {
          setting
            .addText((text) => text
              .setPlaceholder('Sprint')
              .setValue(profile.rootFolder)
              .onChange((value) => { folderDraft = value; }))
            .addButton((button) => button
              .setButtonText('Rename')
              .onClick(() => { void this.renameProfileRoot(profile.id, folderDraft); }));
        },
        'The vault folder containing this workspace. Rename moves the existing folder and updates its configured base paths.',
      ),
      this.renderDefinition('Tasks base', ['tasks', 'base'], (setting) => {
        setting.addText((text) => text
          .setPlaceholder('Sprint/Tasks.base')
          .setValue(profile.tasksBasePath)
          .onChange((value) => mutate((target) => { target.tasksBasePath = value.trim(); })));
      }),
      this.renderDefinition('Sprints base', ['sprints', 'base'], (setting) => {
        setting.addText((text) => text
          .setPlaceholder('Sprint/Sprints.base')
          .setValue(profile.sprintsBasePath)
          .onChange((value) => mutate((target) => { target.sprintsBasePath = value.trim(); })));
      }),
      this.renderDefinition('Projects base', ['projects', 'base'], (setting) => {
        setting.addText((text) => text
          .setPlaceholder('Sprint/Projects.base')
          .setValue(profile.projectsBasePath)
          .onChange((value) => mutate((target) => { target.projectsBasePath = value.trim(); })));
      }),
      this.renderDefinition('Cadence anchor', ['anchor', 'date'], (setting) => {
        setting.addText((text) => text
          .setPlaceholder(getWeekStart(getLocalDate(), startDay))
          .setValue(profile.anchorDate)
          .onChange((value) => {
            const trimmed = value.trim();
            if (trimmed && !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return Promise.resolve();
            return mutate((target) => { target.anchorDate = trimmed; });
          }));
      }),
      this.renderDefinition('Duration override', ['duration', 'weeks'], (setting) => {
        setting.addDropdown((dropdown) => {
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
      }),
      this.renderDefinition('Start day override', ['start day', 'cadence'], (setting) => {
        setting.addDropdown((dropdown) => {
          dropdown.addOption('default', 'Use global default');
          for (const [index, day] of DAYS.entries()) dropdown.addOption(String(index), day);
          dropdown.setValue(profile.overrides.startDay?.toString() ?? 'default')
            .onChange((value) => mutate((target) => {
              if (value === 'default') delete target.overrides.startDay;
              else target.overrides.startDay = Number(value);
            }));
        });
      }),
      this.renderDefinition('Rollover override', ['incomplete', 'unfinished'], (setting) => {
        setting.addDropdown((dropdown) => dropdown
          .addOption('default', 'Use global default')
          .addOption('next', 'Move to current sprint')
          .addOption('backlog', 'Move to backlog')
          .addOption('keep', 'Keep in original sprint')
          .setValue(profile.overrides.incompleteTaskPolicy ?? 'default')
          .onChange((value) => mutate((target) => {
            if (value === 'default') delete target.overrides.incompleteTaskPolicy;
            else target.overrides.incompleteTaskPolicy = value as IncompleteTaskPolicy;
          })));
      }),
      this.renderDefinition('Future sprint override', ['future', 'count'], (setting) => {
        setting.addDropdown((dropdown) => {
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
      }),
      this.renderDefinition('Naming override', ['name', 'number'], (setting) => {
        setting.addText((text) => text
          .setPlaceholder(this.feature.settings.defaults.namingFormat)
          .setValue(profile.overrides.namingFormat ?? '')
          .onChange((value) => mutate((target) => {
            const trimmed = value.trim();
            if (trimmed) target.overrides.namingFormat = trimmed;
            else delete target.overrides.namingFormat;
          })));
      }),
    ];
  }

  private maintenanceDefinitions(): SettingDefinition[] {
    return [
      this.renderDefinition(
        'Synchronize now',
        ['sync', 'sprints'],
        (setting) => {
          setting.addButton((button) => button
            .setButtonText('Sync sprints')
            .setCta()
            .onClick(() => { void this.sync(); }));
        },
        'Create missing sprint notes, update lifecycle statuses, and apply rollover rules.',
      ),
      this.renderDefinition(
        'Generate bases',
        ['base', 'dashboard', 'instructions'],
        (setting) => {
          setting.addButton((button) => button
            .setButtonText('Generate bases')
            .onClick(() => { void this.generateBases(); }));
        },
        'Create missing base files, dashboard notes, local AI instructions, and shared vault-root skills.',
      ),
    ];
  }

  private aiDefinitions(): SettingDefinition[] {
    return [
      this.renderDefinition(
        'Sprint vault',
        ['Codex', 'Claude Code', 'skill'],
        (setting) => {
          setting.addButton((button) => button
            .setButtonText('View and edit')
            .onClick(() => {
              new SprintSkillEditorModal(
                this.app,
                structuredClone(this.feature.settings),
                (instructions) => { void this.saveSkillInstructions('sprint-vault', instructions); },
              ).open();
            }));
        },
        'Installed in the vault-root .agents and .claude skill folders. Existing folders and unmanaged skills are preserved.',
      ),
      this.renderDefinition(
        'Vault-root AI instructions',
        ['AGENTS.md', 'CLAUDE.md', 'instructions'],
        (setting) => {
          setting.addToggle((toggle) => toggle
            .setValue(this.feature.settings.generateVaultRootInstructions)
            .onChange(async (enabled) => {
              await this.mutateSettings((settings) => {
                settings.generateVaultRootInstructions = enabled;
              });
              await this.generateBases();
            }));
        },
        'Also generate Sprint-managed AGENTS.md and CLAUDE.md files at the Obsidian vault root. Existing instruction files are never overwritten.',
      ),
    ];
  }

  private mutateSettings(mutation: (settings: SprintSettings) => void): Promise<void> {
    return this.feature.updateSettings(mutation);
  }

  private async saveSkillInstructions(skill: string, instructions: string): Promise<void> {
    await this.mutateSettings((settings) => {
      if (instructions) settings.skillCustomInstructions[skill] = instructions;
      else delete settings.skillCustomInstructions[skill];
    });
    await this.generateBases();
    this.refreshSettings();
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
    this.refreshSettings();
  }

  private async resetProfile(profileId: string): Promise<void> {
    if (!this.feature.settings.enabled) {
      new Notice('Enable automatic sprints before resetting the sprint workspace.');
      return;
    }
    try {
      const result = await this.feature.resetProfile(profileId);
      new Notice(`Sprint workspace reset: ${result.created} sprints created.`);
      this.refreshSettings();
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint workspace reset failed: ${error.message}` : 'Sprint workspace reset failed.');
    }
  }

  private async renameProfileRoot(profileId: string, rootFolder: string): Promise<void> {
    try {
      await this.feature.renameProfileRoot(profileId, rootFolder);
      await this.feature.generateBases();
      new Notice(`Sprint folder renamed to ${rootFolder.trim()}.`);
      this.refreshSettings();
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint folder rename failed: ${error.message}` : 'Sprint folder rename failed.');
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

  private refreshSettings(): void {
    this.update();
  }
}
