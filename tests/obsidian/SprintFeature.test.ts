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
        vault: {},
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
    expect((host as unknown as { addCommand: jest.Mock }).addCommand)
      .toHaveBeenCalledWith(expect.objectContaining({ id: 'sync-sprints' }));
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    expect(feature.settings.enabled).toBe(true);
  });
});
