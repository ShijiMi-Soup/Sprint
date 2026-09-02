import type { Plugin } from 'obsidian';

import {
  CURRENT_SUPPORT_SCHEMA_VERSION,
  normalizeSprintSettings,
} from '@/domain/SprintSettings';
import { SprintFeature } from '@/SprintFeature';
import { SprintOnboardingModal } from '@/obsidian/SprintOnboardingModal';
import type { SprintSettingsStore } from '@/obsidian/SprintSettingsStore';
import { SprintWorkspaceRecoveryModal } from '@/obsidian/SprintWorkspaceRecoveryModal';

describe('SprintFeature', () => {
  it('opens onboarding after layout only for a new installation', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { setInterval: jest.fn(() => 1) },
    });
    const open = jest.spyOn(SprintOnboardingModal.prototype, 'open').mockImplementation();
    const host = {
      app: {
        fileManager: {},
        metadataCache: {},
        vault: {
          getAbstractFileByPath: jest.fn(() => null),
          getFileByPath: jest.fn(),
          getFolderByPath: jest.fn(() => null),
          on: jest.fn(),
        },
        workspace: {
          onLayoutReady: jest.fn((callback: () => void) => { callback(); }),
        },
      },
      manifest: { id: 'host' },
      addCommand: jest.fn(),
      addRibbonIcon: jest.fn(),
      addSettingTab: jest.fn(),
      registerBasesView: jest.fn(),
      registerEvent: jest.fn(),
      registerInterval: jest.fn(),
    } as unknown as Plugin;
    const newInstallStore: SprintSettingsStore = {
      load: jest.fn().mockResolvedValue(normalizeSprintSettings(undefined)),
      save: jest.fn().mockResolvedValue(undefined),
    };

    await new SprintFeature(host, newInstallStore).load();

    expect(open).toHaveBeenCalledTimes(1);
    open.mockClear();

    const existingInstallStore: SprintSettingsStore = {
      load: jest.fn().mockResolvedValue(normalizeSprintSettings({ rootFolder: 'Sprint' })),
      save: jest.fn().mockResolvedValue(undefined),
    };
    await new SprintFeature(host, existingInstallStore).load();

    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('registers with a host plugin and persists ordered settings updates', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { setInterval: jest.fn(() => 1) },
    });
    const saved = jest.fn().mockResolvedValue(undefined);
    const store: SprintSettingsStore = {
      load: jest.fn().mockResolvedValue(normalizeSprintSettings(undefined)),
      save: saved,
    };
    const host = {
      app: {
        fileManager: {},
        metadataCache: {},
        vault: {
          create: jest.fn(),
          createFolder: jest.fn(),
          getAbstractFileByPath: jest.fn(),
          getFileByPath: jest.fn((path: string) => ({ path })),
          getFolderByPath: jest.fn(() => null),
          on: jest.fn(),
        },
        workspace: { onLayoutReady: jest.fn(), openLinkText: jest.fn() },
      },
      manifest: { id: 'host' },
      addCommand: jest.fn(),
      addRibbonIcon: jest.fn(),
      addSettingTab: jest.fn(),
      registerBasesView: jest.fn(),
      registerEvent: jest.fn(),
      registerInterval: jest.fn(),
    } as unknown as Plugin;
    const feature = new SprintFeature(host, store);

    await feature.load();
    await feature.updateSettings((settings) => { settings.enabled = true; });

    expect((host as unknown as { registerBasesView: jest.Mock }).registerBasesView)
      .toHaveBeenCalledWith('sprint-agent-sprint-board', expect.any(Object));
    expect((host as unknown as { registerBasesView: jest.Mock }).registerBasesView)
      .toHaveBeenCalledWith('sprint-agent-velocity-chart', expect.any(Object));
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'sync' }));
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'generate-bases' }));
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'open-summary' }));
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'open-planner' }));
    expect((host as unknown as { addRibbonIcon: jest.Mock }).addRibbonIcon)
      .toHaveBeenCalledWith('check-check', 'Open sprint settings', expect.any(Function));
    const commands = (host as unknown as { addCommand: jest.Mock }).addCommand.mock.calls
      .map(([command]: [{ id: string; callback: () => Promise<void> }]) => command);
    await commands.find(({ id }) => id === 'open-summary')?.callback();
    expect((host.app.workspace as unknown as { openLinkText: jest.Mock }).openLinkText)
      .toHaveBeenCalledWith('Sprint/Sprint Summary.md', '', false);
    await commands.find(({ id }) => id === 'open-planner')?.callback();
    expect((host.app.workspace as unknown as { openLinkText: jest.Mock }).openLinkText)
      .toHaveBeenCalledWith('Sprint/Tasks.base#Sprint planner', '', false);
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(feature.settings.enabled).toBe(true);
  });

  it('renames an existing profile folder and rewrites Base paths', async () => {
    const folder = { path: 'Agile PM' };
    const dashboard = { path: 'Agile PM/Agile PM.md' };
    const files = new Map<string, { path: string }>([
      [folder.path, folder],
      [dashboard.path, dashboard],
    ]);
    const renameFile = jest.fn(async (file: { path: string }, path: string) => {
      files.delete(file.path);
      file.path = path;
      files.set(path, file);
    });
    const saved = jest.fn().mockResolvedValue(undefined);
    const settings = normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' });
    const store: SprintSettingsStore = {
      load: jest.fn().mockResolvedValue(settings),
      save: saved,
    };
    const host = {
      app: {
        fileManager: { renameFile },
        metadataCache: {},
        vault: {
          getAbstractFileByPath: jest.fn((path: string) => files.get(path) ?? null),
          getFileByPath: jest.fn((path: string) => files.get(path) ?? null),
          getFolderByPath: jest.fn((path: string) => (path === folder.path ? folder : null)),
          on: jest.fn(),
        },
        workspace: { onLayoutReady: jest.fn() },
      },
      manifest: { id: 'host' },
      addCommand: jest.fn(),
      addRibbonIcon: jest.fn(),
      addSettingTab: jest.fn(),
      registerBasesView: jest.fn(),
      registerEvent: jest.fn(),
      registerInterval: jest.fn(),
    } as unknown as Plugin;
    const feature = new SprintFeature(host, store);
    await feature.load();

    await feature.renameProfileRoot('agile-pm', 'Sprint');

    expect(renameFile).toHaveBeenNthCalledWith(1, dashboard, 'Agile PM/Sprint Summary.md');
    expect(renameFile).toHaveBeenNthCalledWith(2, folder, 'Sprint');
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({
      profiles: [expect.objectContaining({
        rootFolder: 'Sprint',
        tasksBasePath: 'Sprint/Tasks.base',
        sprintsBasePath: 'Sprint/Sprints.base',
        projectsBasePath: 'Sprint/Projects.base',
      })],
    }));
  });

  it('continues core sprint synchronization when support-file generation fails', async () => {
    const feature = Object.create(SprintFeature.prototype) as SprintFeature;
    const managerSync = jest.fn().mockResolvedValue({
      created: 2,
      movedTasks: 0,
      updatedSprints: 0,
      profilesSynced: 1,
    });
    const generate = jest.fn().mockRejectedValue(new Error('types.json is not writable'));
    Object.assign(feature as unknown as Record<string, unknown>, {
      manager: { sync: managerSync },
      baseGenerator: { generate },
      currentSettings: normalizeSprintSettings({ enabled: true }),
      lastSyncWarnings: [],
    });

    const result = await feature.sync();

    expect(result.created).toBe(2);
    expect(managerSync).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('skips support-file generation after the current schema is installed', async () => {
    const currentSettings = normalizeSprintSettings(undefined);
    currentSettings.enabled = true;
    currentSettings.supportSchemaVersion = CURRENT_SUPPORT_SCHEMA_VERSION;
    currentSettings.profiles[0]!.samplesInitialized = true;
    const feature = Object.create(SprintFeature.prototype) as SprintFeature;
    const managerSync = jest.fn().mockResolvedValue({
      created: 0,
      movedTasks: 0,
      updatedSprints: 0,
      profilesSynced: 1,
    });
    const generate = jest.fn();
    Object.assign(feature as unknown as Record<string, unknown>, {
      manager: { sync: managerSync },
      baseGenerator: { generate },
      currentSettings,
      lastSyncWarnings: [],
    });

    await feature.sync();

    expect(managerSync).toHaveBeenCalledTimes(1);
    expect(generate).not.toHaveBeenCalled();
  });

  it('pauses startup synchronization and opens recovery once for an initialized missing workspace', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { setInterval: jest.fn(() => 1) },
    });
    const open = jest.spyOn(SprintWorkspaceRecoveryModal.prototype, 'open').mockImplementation();
    const settings = normalizeSprintSettings({ enabled: true, rootFolder: 'Sprint' });
    settings.onboardingComplete = true;
    settings.supportSchemaVersion = CURRENT_SUPPORT_SCHEMA_VERSION;
    settings.profiles[0]!.samplesInitialized = true;
    const layoutCallbacks: Array<() => void> = [];
    const host = {
      app: {
        fileManager: {},
        metadataCache: {},
        vault: {
          getAbstractFileByPath: jest.fn(() => null),
          getFileByPath: jest.fn(() => null),
          getFolderByPath: jest.fn(() => null),
          on: jest.fn(),
        },
        workspace: {
          onLayoutReady: jest.fn((callback: () => void) => { layoutCallbacks.push(callback); }),
        },
      },
      manifest: { id: 'host' },
      addCommand: jest.fn(),
      addRibbonIcon: jest.fn(),
      addSettingTab: jest.fn(),
      registerBasesView: jest.fn(),
      registerEvent: jest.fn(),
      registerInterval: jest.fn(),
    } as unknown as Plugin;
    const feature = new SprintFeature(host, {
      load: jest.fn().mockResolvedValue(settings),
      save: jest.fn().mockResolvedValue(undefined),
    });

    await feature.load();
    for (const callback of layoutCallbacks) callback();
    for (const callback of layoutCallbacks) callback();

    expect(open).toHaveBeenCalledTimes(1);
    await expect(feature.sync()).rejects.toThrow('needs recovery');
    expect(open).toHaveBeenCalledTimes(2);
    open.mockRestore();
  });

  it('does not treat a first install as a missing workspace', async () => {
    const feature = Object.create(SprintFeature.prototype) as SprintFeature;
    const managerSync = jest.fn().mockResolvedValue({
      created: 1,
      movedTasks: 0,
      updatedSprints: 0,
      profilesSynced: 1,
    });
    const settings = normalizeSprintSettings(undefined);
    settings.supportSchemaVersion = CURRENT_SUPPORT_SCHEMA_VERSION;
    settings.profiles[0]!.samplesInitialized = true;
    Object.assign(feature as unknown as Record<string, unknown>, {
      currentSettings: settings,
      manager: { sync: managerSync },
      baseGenerator: { generate: jest.fn() },
      mutationTail: Promise.resolve(),
      lastSyncWarnings: [],
      workspaceRecoveryPrompted: false,
      plugin: {
        app: { vault: { getFolderByPath: jest.fn(() => null) } },
      },
    });

    await feature.sync();

    expect(managerSync).toHaveBeenCalledTimes(1);
  });

  it('locates a moved workspace without enumerating the vault and synchronizes it', async () => {
    const saved = jest.fn().mockResolvedValue(undefined);
    const settings = normalizeSprintSettings({ enabled: true, rootFolder: 'Sprint' });
    settings.onboardingComplete = true;
    settings.profiles[0]!.samplesInitialized = true;
    const generate = jest.fn().mockResolvedValue({ created: 2, skipped: 0, profilesGenerated: 1 });
    const managerSync = jest.fn().mockResolvedValue({
      created: 1,
      movedTasks: 0,
      updatedSprints: 0,
      profilesSynced: 1,
    });
    const getFiles = jest.fn();
    const feature = Object.create(SprintFeature.prototype) as SprintFeature;
    Object.assign(feature as unknown as Record<string, unknown>, {
      currentSettings: settings,
      manager: { sync: managerSync },
      baseGenerator: { generate },
      mutationTail: Promise.resolve(),
      lastSyncWarnings: [],
      plugin: {
        app: {
          vault: {
            getFolderByPath: jest.fn((path: string) => (path === 'Archived/Sprint' ? { path } : null)),
            getAbstractFileByPath: jest.fn(),
            getFiles,
          },
        },
      },
      store: { save: saved },
    });

    await (feature as unknown as {
      locateWorkspace(profileId: string, path: string): Promise<void>;
    }).locateWorkspace('agile-pm', 'Archived/Sprint');

    expect(feature.settings.profiles[0]).toEqual(expect.objectContaining({
      rootFolder: 'Archived/Sprint',
      tasksBasePath: 'Archived/Sprint/Tasks.base',
      sprintsBasePath: 'Archived/Sprint/Sprints.base',
      projectsBasePath: 'Archived/Sprint/Projects.base',
    }));
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      profiles: [expect.objectContaining({ samplesInitialized: true })],
    }));
    expect(managerSync).toHaveBeenCalledTimes(1);
    expect(getFiles).not.toHaveBeenCalled();
  });

  it('creates a missing replacement workspace without tutorial samples', async () => {
    const saved = jest.fn().mockResolvedValue(undefined);
    const settings = normalizeSprintSettings({ enabled: true, rootFolder: 'Sprint' });
    settings.onboardingComplete = true;
    settings.profiles[0]!.samplesInitialized = true;
    const generate = jest.fn().mockResolvedValue({ created: 4, skipped: 0, profilesGenerated: 1 });
    const managerSync = jest.fn().mockResolvedValue({
      created: 2,
      movedTasks: 0,
      updatedSprints: 0,
      profilesSynced: 1,
    });
    const feature = Object.create(SprintFeature.prototype) as SprintFeature;
    Object.assign(feature as unknown as Record<string, unknown>, {
      currentSettings: settings,
      manager: { sync: managerSync },
      baseGenerator: { generate },
      mutationTail: Promise.resolve(),
      plugin: {
        app: { vault: { getAbstractFileByPath: jest.fn(() => null) } },
      },
      store: { save: saved },
    });

    await (feature as unknown as {
      createReplacementWorkspace(profileId: string): Promise<void>;
    }).createReplacementWorkspace('agile-pm');

    expect(feature.settings.enabled).toBe(true);
    expect(feature.settings.profiles[0]?.samplesInitialized).toBe(true);
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      profiles: [expect.objectContaining({ samplesInitialized: true })],
    }));
    expect(managerSync).toHaveBeenCalledTimes(1);
  });

  it('updates configured workspace paths after a live root or ancestor rename', async () => {
    const saved = jest.fn().mockResolvedValue(undefined);
    const settings = normalizeSprintSettings({ enabled: true, rootFolder: 'Planning/Sprint' });
    const feature = Object.create(SprintFeature.prototype) as SprintFeature;
    Object.assign(feature as unknown as Record<string, unknown>, {
      currentSettings: settings,
      mutationTail: Promise.resolve(),
      profilesBeingRenamed: new Set<string>(),
      store: { save: saved },
    });

    await (feature as unknown as {
      handleWorkspaceRename(nextPath: string, oldPath: string): Promise<void>;
    }).handleWorkspaceRename('Archive/Planning', 'Planning');
    expect(feature.settings.profiles[0]).toEqual(expect.objectContaining({
      rootFolder: 'Archive/Planning/Sprint',
      tasksBasePath: 'Archive/Planning/Sprint/Tasks.base',
    }));

    await (feature as unknown as {
      handleWorkspaceRename(nextPath: string, oldPath: string): Promise<void>;
    }).handleWorkspaceRename('Archive/Current Sprint', 'Archive/Planning/Sprint');
    expect(feature.settings.profiles[0]).toEqual(expect.objectContaining({
      rootFolder: 'Archive/Current Sprint',
      projectsBasePath: 'Archive/Current Sprint/Projects.base',
    }));
    expect(saved).toHaveBeenCalledTimes(2);
  });
});
