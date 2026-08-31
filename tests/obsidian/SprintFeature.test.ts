import type { Plugin } from 'obsidian';

import {
  CURRENT_SUPPORT_SCHEMA_VERSION,
  normalizeSprintSettings,
} from '@/domain/SprintSettings';
import { SprintFeature } from '@/SprintFeature';
import { SprintOnboardingModal } from '@/obsidian/SprintOnboardingModal';
import type { SprintSettingsStore } from '@/obsidian/SprintSettingsStore';

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
        },
        workspace: { onLayoutReady: jest.fn(), openLinkText: jest.fn() },
      },
      manifest: { id: 'host' },
      addCommand: jest.fn(),
      addRibbonIcon: jest.fn(),
      addSettingTab: jest.fn(),
      registerBasesView: jest.fn(),
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
    expect((host as unknown as { addRibbonIcon: jest.Mock }).addRibbonIcon)
      .toHaveBeenCalledWith('footprints', 'Open sprint settings', expect.any(Function));
    const commands = (host as unknown as { addCommand: jest.Mock }).addCommand.mock.calls
      .map(([command]: [{ id: string; callback: () => Promise<void> }]) => command);
    await commands.find(({ id }) => id === 'open-summary')?.callback();
    expect((host.app.workspace as unknown as { openLinkText: jest.Mock }).openLinkText)
      .toHaveBeenCalledWith('Sprint/Sprint Summary.md', '', false);
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
        },
        workspace: { onLayoutReady: jest.fn() },
      },
      manifest: { id: 'host' },
      addCommand: jest.fn(),
      addRibbonIcon: jest.fn(),
      addSettingTab: jest.fn(),
      registerBasesView: jest.fn(),
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
});
