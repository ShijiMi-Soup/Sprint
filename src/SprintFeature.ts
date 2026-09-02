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
import {
  CreateSprintWorkspaceModal,
  MissingSprintWorkspaceError,
  SprintWorkspaceRecoveryModal,
} from './obsidian/SprintWorkspaceRecoveryModal';

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
  private workspaceRecoveryPrompted = false;
  private readonly profilesBeingRenamed = new Set<string>();

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
    this.plugin.addRibbonIcon('check-check', 'Open sprint settings', () => {
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
    this.plugin.addCommand({
      id: 'open-planner',
      name: 'Open planner',
      callback: () => { void this.openSprintPlanner(); },
    });
    this.registerLiveWorkspaceRenameSafety();
    this.scheduleOnboarding();
    this.scheduleSync();
  }

  async sync(): Promise<SprintSyncResult> {
    if (!this.ensureWorkspaceAvailable(true)) throw new MissingSprintWorkspaceError();
    return this.syncAvailableWorkspace();
  }

  private async syncAvailableWorkspace(): Promise<SprintSyncResult> {
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
    if (!this.ensureWorkspaceAvailable(true)) throw new MissingSprintWorkspaceError();
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
    if (!this.ensureWorkspaceAvailable(true)) throw new MissingSprintWorkspaceError();
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
      this.profilesBeingRenamed.add(profileId);
      try {
        if (legacyDashboard && !this.plugin.app.vault.getAbstractFileByPath(summaryPath)) {
          await this.plugin.app.fileManager.renameFile(legacyDashboard, summaryPath);
          dashboardRenamed = true;
        }
        if (existing) await this.plugin.app.fileManager.renameFile(existing, nextRoot);
        profile.rootFolder = nextRoot;
        profile.tasksBasePath = rewritePath(profile.tasksBasePath) || `${nextRoot}/Tasks.base`;
        profile.sprintsBasePath = rewritePath(profile.sprintsBasePath) || `${nextRoot}/Sprints.base`;
        profile.projectsBasePath = rewritePath(profile.projectsBasePath) || `${nextRoot}/Projects.base`;
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
      } finally {
        this.profilesBeingRenamed.delete(profileId);
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
      if (!this.ensureWorkspaceAvailable(false)) return;
      void this.syncAvailableWorkspace().catch((error: unknown) => {
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
      if (error instanceof MissingSprintWorkspaceError) return;
      new Notice(error instanceof Error ? `Sprint sync failed: ${error.message}` : 'Sprint sync failed.');
    }
  }

  private async generateBasesWithNotice(): Promise<void> {
    try {
      const result = await this.generateBases();
      new Notice(`Sprint Bases generated: ${result.created} created, ${result.skipped} already existed.`);
    } catch (error) {
      if (error instanceof MissingSprintWorkspaceError) return;
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
    if (!this.ensureWorkspaceAvailable(true)) return;
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

  private async openSprintPlanner(): Promise<void> {
    if (!this.ensureWorkspaceAvailable(true)) return;
    const profile = this.currentSettings.profiles[0];
    const path = profile?.tasksBasePath?.trim();
    if (!path) {
      new Notice('No tasks base is configured.');
      return;
    }
    if (!this.plugin.app.vault.getFileByPath(path)) {
      new Notice(`Tasks Base not found: ${path}`);
      return;
    }
    await this.plugin.app.workspace.openLinkText(`${path}#Sprint planner`, '', false);
  }

  private openSettings(): void {
    const app = this.plugin.app as typeof this.plugin.app & {
      setting?: { open(): void; openTabById(id: string): void };
    };
    app.setting?.open();
    app.setting?.openTabById(this.plugin.manifest.id);
  }

  private ensureWorkspaceAvailable(interactive: boolean): boolean {
    const profile = this.getMissingWorkspaceProfile();
    if (!profile) return true;
    if (interactive || !this.workspaceRecoveryPrompted) {
      this.workspaceRecoveryPrompted = true;
      this.openWorkspaceRecovery(profile.id, profile.rootFolder);
    }
    return false;
  }

  private getMissingWorkspaceProfile(): SprintSettings['profiles'][number] | null {
    if (!this.currentSettings.onboardingComplete) return null;
    const profile = this.currentSettings.profiles.find((candidate) => (
      candidate.enabled && candidate.samplesInitialized === true
    ));
    if (!profile) return null;
    const root = normalizeWorkspacePath(profile.rootFolder);
    if (!root) return null;
    return this.plugin.app.vault.getFolderByPath(root) ? null : profile;
  }

  private openWorkspaceRecovery(profileId: string, rootFolder: string): void {
    new SprintWorkspaceRecoveryModal(
      this.plugin.app,
      { rootFolder },
      {
        locateWorkspace: async (folderPath): Promise<void> => {
          await this.locateWorkspace(profileId, folderPath);
        },
        createReplacementWorkspace: async (): Promise<void> => {
          this.openCreateReplacementWorkspace(profileId);
        },
      },
    ).open();
  }

  private openCreateReplacementWorkspace(profileId: string): void {
    const profile = this.currentSettings.profiles.find((candidate) => candidate.id === profileId);
    if (!profile) return;
    new CreateSprintWorkspaceModal(
      this.plugin.app,
      profile.rootFolder,
      () => this.createReplacementWorkspace(profileId),
    ).open();
  }

  private async locateWorkspace(profileId: string, folderPath: string): Promise<void> {
    const root = normalizeWorkspacePath(folderPath);
    if (!root) throw new Error('Enter the workspace folder path.');
    if (!this.plugin.app.vault.getFolderByPath(root)) {
      throw new Error(`Sprint folder not found: ${root}`);
    }
    await this.updateWorkspaceRoot(profileId, root);
    await this.generateBasesAfterRecovery();
  }

  private async createReplacementWorkspace(profileId: string): Promise<void> {
    const profile = this.currentSettings.profiles.find((candidate) => candidate.id === profileId);
    if (!profile) throw new Error('Sprint workspace not found.');
    const root = normalizeWorkspacePath(profile.rootFolder);
    if (!root) throw new Error('Set a Sprint workspace folder before creating a replacement.');
    if (this.plugin.app.vault.getAbstractFileByPath(root)) {
      throw new Error(`A file or folder already exists at: ${root}`);
    }
    await this.updateSettings((settings) => {
      settings.enabled = true;
      const target = settings.profiles.find((candidate) => candidate.id === profileId);
      if (target) target.samplesInitialized = true;
    });
    await this.generateBasesAfterRecovery();
  }

  private async generateBasesAfterRecovery(): Promise<void> {
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
    const syncResult = await this.manager.sync();
    new Notice(`Sprint workspace ready: ${syncResult.created} sprints created. ${result.created} support files created.`);
  }

  private registerLiveWorkspaceRenameSafety(): void {
    this.plugin.registerEvent(this.plugin.app.vault.on('rename', (file, oldPath) => {
      void this.handleWorkspaceRename(file.path, oldPath).catch((error: unknown) => {
        new Notice(error instanceof Error
          ? `Sprint workspace path update failed: ${error.message}`
          : 'Sprint workspace path update failed.');
      });
    }));
  }

  private async handleWorkspaceRename(nextPath: string, oldPath: string): Promise<void> {
    const profile = this.currentSettings.profiles.find((candidate) => (
      candidate.enabled
      && !this.profilesBeingRenamed.has(candidate.id)
      && isPathOrAncestor(oldPath, normalizeWorkspacePath(candidate.rootFolder))
    ));
    if (!profile) return;
    const currentRoot = normalizeWorkspacePath(profile.rootFolder);
    const nextRoot = currentRoot === oldPath
      ? nextPath
      : `${nextPath}${currentRoot.slice(oldPath.length)}`;
    if (!normalizeWorkspacePath(nextRoot)) return;
    await this.updateWorkspaceRoot(profile.id, nextRoot, currentRoot);
  }

  private updateWorkspaceRoot(
    profileId: string,
    nextRoot: string,
    expectedRoot?: string,
  ): Promise<void> {
    return this.updateSettings((settings) => {
      const profile = settings.profiles.find((candidate) => candidate.id === profileId);
      if (!profile) return;
      const previousRoot = normalizeWorkspacePath(profile.rootFolder);
      if (expectedRoot && previousRoot !== expectedRoot) return;
      profile.rootFolder = nextRoot;
      profile.tasksBasePath = rewriteWorkspacePath(profile.tasksBasePath, previousRoot, nextRoot)
        || `${nextRoot}/Tasks.base`;
      profile.sprintsBasePath = rewriteWorkspacePath(profile.sprintsBasePath, previousRoot, nextRoot)
        || `${nextRoot}/Sprints.base`;
      profile.projectsBasePath = rewriteWorkspacePath(profile.projectsBasePath, previousRoot, nextRoot)
        || `${nextRoot}/Projects.base`;
    });
  }
}

function normalizeWorkspacePath(path: string): string {
  const normalized = path.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized || normalized.split('/').some((segment) => segment === '.' || segment === '..')) {
    return '';
  }
  return normalized;
}

function isPathOrAncestor(ancestor: string, path: string): boolean {
  return path === ancestor || path.startsWith(`${ancestor}/`);
}

function rewriteWorkspacePath(path: string, previousRoot: string, nextRoot: string): string {
  if (!path || !previousRoot) return path;
  if (path === previousRoot) return nextRoot;
  return path.startsWith(`${previousRoot}/`)
    ? `${nextRoot}${path.slice(previousRoot.length)}`
    : path;
}
