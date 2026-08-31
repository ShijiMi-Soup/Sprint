import { Notice, type Plugin } from 'obsidian';

import { SprintManager, type SprintSyncResult } from './domain/SprintManager';
import { CURRENT_SUPPORT_SCHEMA_VERSION } from './domain/SprintSettings';
import type { SprintSettings } from './domain/types';
import { SprintBaseGenerator, type SprintBaseGenerationResult } from './obsidian/SprintBaseGenerator';
import {
  createSprintBasesViewRegistration,
  createSprintVelocityViewRegistration,
  SPRINT_BASES_VIEW_TYPE,
  SPRINT_VELOCITY_VIEW_TYPE,
} from './obsidian/SprintBasesView';
import { ObsidianSprintVault } from './obsidian/ObsidianSprintVault';
import { SprintOnboardingModal } from './obsidian/SprintOnboardingModal';
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
  renameProfileRoot(profileId: string, rootFolder: string): Promise<void>;
  openOnboarding(): void;
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
      id: 'sync',
      name: 'Sync',
      callback: () => { void this.syncWithNotice(); },
    });
    this.plugin.addCommand({
      id: 'generate-bases',
      name: 'Generate bases',
      callback: () => { void this.generateBasesWithNotice(); },
    });
    this.plugin.addCommand({
      id: 'open-summary',
      name: 'Open summary',
      callback: () => { void this.openAgilePm(); },
    });
    this.scheduleOnboarding();
    this.scheduleSync();
  }

  async sync(): Promise<SprintSyncResult> {
    const warnings: string[] = [];
    if (this.needsSupportMigration()) {
      await this.runOptionalSyncPhase('Support-file migration', () => this.generateBases(), warnings);
    }

    // Sprint notes are the core operation. Optional Bases, AI instructions, or
    // property metadata must never prevent these notes from being synchronized.
    const result = await this.manager.sync();

    this.lastSyncWarnings = warnings;
    return result;
  }

  async generateBases(): Promise<SprintBaseGenerationResult> {
    const result = await this.baseGenerator.generate(this.currentSettings);
    if (
      this.currentSettings.supportSchemaVersion < CURRENT_SUPPORT_SCHEMA_VERSION
      || this.currentSettings.profiles.some(({ samplesInitialized }) => samplesInitialized !== true)
    ) {
      await this.updateSettings((settings) => {
        settings.supportSchemaVersion = CURRENT_SUPPORT_SCHEMA_VERSION;
        for (const profile of settings.profiles) profile.samplesInitialized = true;
      });
    }
    return result;
  }

  private needsSupportMigration(): boolean {
    return this.currentSettings.supportSchemaVersion < CURRENT_SUPPORT_SCHEMA_VERSION
      || this.currentSettings.profiles.some(({ samplesInitialized }) => samplesInitialized !== true);
  }

  async resetProfile(profileId: string): Promise<SprintSyncResult> {
    await this.baseGenerator.resetProfileRoot(this.currentSettings, profileId);
    await this.updateSettings((settings) => {
      const profile = settings.profiles.find((candidate) => candidate.id === profileId);
      if (profile) profile.samplesInitialized = false;
    });
    return this.sync();
  }

  renameProfileRoot(profileId: string, rootFolder: string): Promise<void> {
    const run = async (): Promise<void> => {
      const nextRoot = rootFolder.trim().replace(/^\/+|\/+$/g, '');
      if (!nextRoot) throw new Error('Enter a Sprint folder path.');
      const next = structuredClone(this.currentSettings);
      const profile = next.profiles.find(({ id }) => id === profileId);
      if (!profile) throw new Error('Sprint workspace not found.');
      const previousRoot = profile.rootFolder.trim().replace(/^\/+|\/+$/g, '');
      if (previousRoot === nextRoot) return;

      const rewritePath = (path: string): string => {
        if (!path) return '';
        if (!previousRoot) return path;
        if (path === previousRoot) return nextRoot;
        return path.startsWith(`${previousRoot}/`)
          ? `${nextRoot}${path.slice(previousRoot.length)}`
          : path;
      };
      const existing = previousRoot
        ? this.plugin.app.vault.getAbstractFileByPath(previousRoot)
        : null;
      if (previousRoot && !existing) {
        throw new Error(`Sprint folder not found: ${previousRoot}`);
      }
      if (this.plugin.app.vault.getAbstractFileByPath(nextRoot)) {
        throw new Error(`A file or folder already exists at: ${nextRoot}`);
      }

      const previousTitle = previousRoot.split('/').at(-1) ?? '';
      const legacyDashboardPath = previousRoot && previousTitle
        ? `${previousRoot}/${previousTitle}.md`
        : '';
      const summaryPath = previousRoot ? `${previousRoot}/Sprint Summary.md` : '';
      const legacyDashboard = legacyDashboardPath
        ? this.plugin.app.vault.getFileByPath(legacyDashboardPath)
        : null;
      let dashboardRenamed = false;
      if (legacyDashboard && !this.plugin.app.vault.getAbstractFileByPath(summaryPath)) {
        await this.plugin.app.fileManager.renameFile(legacyDashboard, summaryPath);
        dashboardRenamed = true;
      }
      try {
        if (existing) await this.plugin.app.fileManager.renameFile(existing, nextRoot);
      } catch (error) {
        const summary = this.plugin.app.vault.getFileByPath(summaryPath);
        if (dashboardRenamed && summary) {
          await this.plugin.app.fileManager.renameFile(summary, legacyDashboardPath);
        }
        throw error;
      }
      profile.rootFolder = nextRoot;
      profile.tasksBasePath = rewritePath(profile.tasksBasePath) || `${nextRoot}/Tasks.base`;
      profile.sprintsBasePath = rewritePath(profile.sprintsBasePath) || `${nextRoot}/Sprints.base`;
      profile.projectsBasePath = rewritePath(profile.projectsBasePath) || `${nextRoot}/Projects.base`;
      try {
        await this.store.save(next);
        this.currentSettings = next;
      } catch (error) {
        const moved = this.plugin.app.vault.getAbstractFileByPath(nextRoot);
        if (moved && previousRoot) await this.plugin.app.fileManager.renameFile(moved, previousRoot);
        const summary = this.plugin.app.vault.getFileByPath(summaryPath);
        if (dashboardRenamed && summary) {
          await this.plugin.app.fileManager.renameFile(summary, legacyDashboardPath);
        }
        throw error;
      }
    };
    this.mutationTail = this.mutationTail.then(run, run);
    return this.mutationTail;
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

  openOnboarding(): void {
    const profile = this.currentSettings.profiles[0];
    if (!profile) return;
    const rootFolder = profile.rootFolder.trim().replace(/^\/+|\/+$/g, '') || 'Sprint';
    const existingWorkspace = Boolean(
      this.plugin.app.vault.getAbstractFileByPath(rootFolder),
    );
    new SprintOnboardingModal(
      this.plugin.app,
      {
        rootFolder,
        durationWeeks: profile.overrides.durationWeeks
          ?? this.currentSettings.defaults.durationWeeks,
        futureSprintCount: profile.overrides.futureSprintCount
          ?? this.currentSettings.defaults.futureSprintCount,
        existingWorkspace,
      },
      {
        onSetup: (): Promise<void> => this.completeOnboarding(true),
        onDismiss: (): Promise<void> => this.completeOnboarding(false),
      },
    ).open();
  }

  private async completeOnboarding(enableAutomaticSprints: boolean): Promise<void> {
    await this.updateSettings((settings) => {
      settings.onboardingComplete = true;
      if (enableAutomaticSprints) settings.enabled = true;
    });
    if (!enableAutomaticSprints) return;
    try {
      const result = await this.sync();
      new Notice(`Sprint workspace ready: ${result.created} sprints created.`);
    } catch (error) {
      new Notice(error instanceof Error
        ? `Sprint setup failed: ${error.message}`
        : 'Sprint setup failed.');
    }
  }

  private scheduleOnboarding(): void {
    this.plugin.app.workspace.onLayoutReady(() => {
      if (!this.currentSettings.onboardingComplete) this.openOnboarding();
    });
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
        ? ` ${this.lastSyncWarnings.length} support-file warning(s); sprint notes were still synchronized.`
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

  private async openAgilePm(): Promise<void> {
    const profile = this.currentSettings.profiles[0];
    if (!profile?.rootFolder) {
      new Notice('No sprint folder is configured.');
      return;
    }
    const root = profile.rootFolder.replace(/^\/+|\/+$/g, '');
    const path = `${root}/Sprint Summary.md`;
    if (!this.plugin.app.vault.getFileByPath(path)) {
      new Notice(`Sprint Summary page not found: ${path}`);
      return;
    }
    await this.plugin.app.workspace.openLinkText(path, '', false);
  }

  private openSettings(): void {
    const app = this.plugin.app as typeof this.plugin.app & {
      setting?: { open(): void; openTabById(id: string): void };
    };
    app.setting?.open();
    app.setting?.openTabById(this.plugin.manifest.id);
  }
}
