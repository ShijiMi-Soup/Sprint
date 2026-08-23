import { Notice, type Plugin } from 'obsidian';

import { SprintManager, type SprintSyncResult } from './domain/SprintManager';
import type { SprintSettings } from './domain/types';
import { SprintBaseGenerator, type SprintBaseGenerationResult } from './obsidian/SprintBaseGenerator';
import {
  createSprintBasesViewRegistration,
  createSprintVelocityViewRegistration,
  SPRINT_BASES_VIEW_TYPE,
  SPRINT_VELOCITY_VIEW_TYPE,
} from './obsidian/SprintBasesView';
import { ObsidianSprintVault } from './obsidian/ObsidianSprintVault';
import { SprintSettingTab } from './obsidian/SprintSettingTab';
import {
  PluginDataSprintSettingsStore,
  type SprintSettingsStore,
} from './obsidian/SprintSettingsStore';

export interface SprintFeatureApi {
  readonly settings: Readonly<SprintSettings>;
  sync(): Promise<SprintSyncResult>;
  generateBases(): Promise<SprintBaseGenerationResult>;
  resetProfile(profileId: string): Promise<SprintSyncResult>;
  updateSettings(mutation: (settings: SprintSettings) => void): Promise<void>;
}

export class SprintFeature implements SprintFeatureApi {
  private currentSettings!: SprintSettings;
  private manager!: SprintManager;
  private baseGenerator!: SprintBaseGenerator;
  private mutationTail: Promise<void> = Promise.resolve();
  private lastSyncWarnings: string[] = [];

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
    this.baseGenerator = new SprintBaseGenerator(this.plugin.app);

    this.plugin.registerBasesView(
      SPRINT_BASES_VIEW_TYPE,
      createSprintBasesViewRegistration(() => this.currentSettings),
    );
    this.plugin.registerBasesView(
      SPRINT_VELOCITY_VIEW_TYPE,
      createSprintVelocityViewRegistration(() => this.currentSettings),
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
    this.plugin.addCommand({
      id: 'generate-sprint-bases',
      name: 'Generate sprint Bases',
      callback: () => { void this.generateBasesWithNotice(); },
    });
    this.plugin.addCommand({
      id: 'diagnose-sprint-generation',
      name: 'Diagnose sprint generation',
      callback: () => { void this.diagnoseSprintGeneration(); },
    });
    this.scheduleSync();
  }

  async sync(): Promise<SprintSyncResult> {
    const warnings: string[] = [];
    await this.runOptionalSyncPhase('Initial support-file generation', () => this.generateBases(), warnings);

    // Sprint notes are the core operation. Optional Bases, AI instructions, or
    // property metadata must never prevent these notes from being synchronized.
    const result = await this.manager.sync();

    await this.runOptionalSyncPhase('Dashboard refresh', () => this.generateBases(), warnings);
    this.lastSyncWarnings = warnings;
    return result;
  }

  generateBases(): Promise<SprintBaseGenerationResult> {
    return this.baseGenerator.generate(this.currentSettings);
  }

  resetProfile(profileId: string): Promise<SprintSyncResult> {
    return this.baseGenerator.resetProfileRoot(this.currentSettings, profileId)
      .then(() => this.sync());
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
      void this.sync().catch((error: unknown) => {
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
      const result = await this.sync();
      const warning = this.lastSyncWarnings.length > 0
        ? ` ${this.lastSyncWarnings.length} support-file warning(s); run Diagnose sprint generation for details.`
        : '';
      new Notice(`Sprints synchronized: ${result.created} created, ${result.movedTasks} tasks moved.${warning}`);
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint sync failed: ${error.message}` : 'Sprint sync failed.');
    }
  }

  private async generateBasesWithNotice(): Promise<void> {
    try {
      const result = await this.generateBases();
      new Notice(`Sprint Bases generated: ${result.created} created, ${result.skipped} already existed.`);
    } catch (error) {
      new Notice(error instanceof Error ? `Sprint Base generation failed: ${error.message}` : 'Sprint Base generation failed.');
    }
  }

  private async diagnoseSprintGeneration(): Promise<void> {
    const enabledProfiles = this.currentSettings.profiles.filter((profile) => profile.enabled);
    console.group('[Sprint] Sprint generation diagnostics');
    console.info('[Sprint] Settings', {
      enabled: this.currentSettings.enabled,
      profileCount: enabledProfiles.length,
      profiles: enabledProfiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        rootFolder: profile.rootFolder,
        tasksBasePath: profile.tasksBasePath,
        sprintsBasePath: profile.sprintsBasePath,
        projectsBasePath: profile.projectsBasePath,
      })),
    });

    if (!this.currentSettings.enabled) {
      console.error('[Sprint] Automatic sprints are disabled.');
      console.groupEnd();
      new Notice('Sprint diagnostics failed: Automatic sprints are disabled.');
      return;
    }
    if (enabledProfiles.length === 0) {
      console.error('[Sprint] No enabled sprint profiles were found.');
      console.groupEnd();
      new Notice('Sprint diagnostics failed: No enabled sprint profiles were found.');
      return;
    }

    new Notice('Sprint diagnostics started. Detailed output is in the developer console.');
    try {
      console.info('[Sprint] Starting synchronization.');
      const result = await this.sync();
      const fileChecks = enabledProfiles.map((profile) => {
        const root = profile.rootFolder.trim().replace(/^\/+|\/+$/g, '');
        const folder = `${root}/Sprints`;
        const sprintFiles = this.plugin.app.vault.getMarkdownFiles()
          .filter((file) => file.path.startsWith(`${folder}/`))
          .map((file) => file.path);
        return { profile: profile.name || profile.id, folder, sprintFiles };
      });
      console.info('[Sprint] Synchronization result', result);
      console.info('[Sprint] Sprint file checks', fileChecks);
      if (this.lastSyncWarnings.length > 0) {
        console.warn('[Sprint] Non-blocking support-file warnings', this.lastSyncWarnings);
      }
      console.groupEnd();

      const fileCount = fileChecks.reduce((sum, check) => sum + check.sprintFiles.length, 0);
      const warning = this.lastSyncWarnings.length > 0
        ? ` ${this.lastSyncWarnings.length} support-file warning(s) logged.`
        : '';
      new Notice(`Sprint diagnostics complete: ${fileCount} sprint file(s) found, ${result.created} created.${warning}`);
    } catch (error) {
      console.error('[Sprint] Core sprint synchronization failed', error);
      console.groupEnd();
      new Notice(error instanceof Error
        ? `Sprint diagnostics failed during sprint synchronization: ${error.message}`
        : 'Sprint diagnostics failed during sprint synchronization.');
    }
  }

  private async runOptionalSyncPhase(
    phase: string,
    operation: () => Promise<unknown>,
    warnings: string[],
  ): Promise<void> {
    try {
      await operation();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const warning = `${phase}: ${detail}`;
      warnings.push(warning);
      console.warn(`[Sprint] ${warning}`, error);
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
