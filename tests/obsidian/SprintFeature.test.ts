import type { Plugin } from 'obsidian';

import { normalizeSprintSettings } from '@/domain/SprintSettings';
import { SprintFeature } from '@/SprintFeature';
import type { SprintSettingsStore } from '@/obsidian/SprintSettingsStore';

describe('SprintFeature', () => {
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
    await feature.updateSettings((settings) => { settings.enabled = true; });

    expect((host as unknown as { registerBasesView: jest.Mock }).registerBasesView)
      .toHaveBeenCalledWith('sprint-agent-sprint-board', expect.any(Object));
    expect((host as unknown as { registerBasesView: jest.Mock }).registerBasesView)
      .toHaveBeenCalledWith('sprint-agent-velocity-chart', expect.any(Object));
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'sync-sprints' }));
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'generate-sprint-bases' }));
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'diagnose-sprint-generation' }));
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(feature.settings.enabled).toBe(true);
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
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
