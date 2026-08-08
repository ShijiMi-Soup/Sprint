import { Notice, type Plugin } from 'obsidian';

import { SprintManager, type SprintSyncResult } from './domain/SprintManager';
import type { SprintSettings } from './domain/types';
import { createSprintBasesViewRegistration, SPRINT_BASES_VIEW_TYPE } from './obsidian/SprintBasesView';
import { ObsidianSprintVault } from './obsidian/ObsidianSprintVault';
import { SprintSettingTab } from './obsidian/SprintSettingTab';
import {
  PluginDataSprintSettingsStore,
  type SprintSettingsStore,
} from './obsidian/SprintSettingsStore';

export interface SprintFeatureApi {
  readonly settings: Readonly<SprintSettings>;
  sync(): Promise<SprintSyncResult>;
  updateSettings(mutation: (settings: SprintSettings) => void): Promise<void>;
}

export class SprintFeature implements SprintFeatureApi {
  private currentSettings!: SprintSettings;
  private manager!: SprintManager;
  private mutationTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly plugin: Plugin,
    private readonly store: SprintSettingsStore = new PluginDataSprintSettingsStore(plugin),
  ) {}

  get settings(): Readonly<SprintSettings> {
    return this.currentSettings;
  }

  async load(): Promise<void> {
    this.currentSettings = await this.store.load();
    this.manager = new SprintManager(
      new ObsidianSprintVault(this.plugin.app),
      () => this.currentSettings,
    );

    this.plugin.registerBasesView(
      SPRINT_BASES_VIEW_TYPE,
      createSprintBasesViewRegistration(() => this.currentSettings),
    );
    this.plugin.addSettingTab(new SprintSettingTab(this.plugin.app, this.plugin, this));
    this.plugin.addRibbonIcon('calendar-range', 'Open sprint settings', () => {
      this.openSettings();
    });
    this.plugin.addCommand({
      id: 'sync-sprints',
      name: 'Sync sprints',
      callback: () => { void this.syncWithNotice(); },
    });
    this.scheduleSync();
  }

  sync(): Promise<SprintSyncResult> {
    return this.manager.sync();
  }

  updateSettings(mutation: (settings: SprintSettings) => void): Promise<void> {
    const run = async (): Promise<void> => {
      const next = structuredClone(this.currentSettings);
      mutation(next);
      await this.store.save(next);
      this.currentSettings = next;
    };
    this.mutationTail = this.mutationTail.then(run, run);
    return this.mutationTail;
  }

  private scheduleSync(): void {
    const sync = (): void => {
      if (!this.currentSettings.enabled) return;
      void this.manager.sync().catch((error: unknown) => {
        new Notice(error instanceof Error
          ? `Automatic sprint sync failed: ${error.message}`
          : 'Automatic sprint sync failed.');
      });
    };
    this.plugin.app.workspace.onLayoutReady(sync);
    this.plugin.registerInterval(window.setInterval(sync, 60 * 60 * 1000));
  }

  private async syncWithNotice(): Promise<void> {
    if (!this.currentSettings.enabled) {
      new Notice('Automatic sprint management is disabled in Sprint settings.');
      return;
    }
    try {
      const result = await this.manager.sync();
      new Notice(`Sprints synchronized: ${result.created} created, ${result.movedTasks} tasks moved.`);
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint sync failed: ${error.message}` : 'Sprint sync failed.');
    }
  }

  private openSettings(): void {
    const app = this.plugin.app as typeof this.plugin.app & {
      setting?: { open(): void; openTabById(id: string): void };
    };
    app.setting?.open();
    app.setting?.openTabById(this.plugin.manifest.id);
  }
}
