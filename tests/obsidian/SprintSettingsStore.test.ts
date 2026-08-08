import type { Plugin } from 'obsidian';

import { PluginDataSprintSettingsStore } from '@/obsidian/SprintSettingsStore';

describe('PluginDataSprintSettingsStore', () => {
  it('preserves unrelated host plugin data when saving Sprint settings', async () => {
    const loadData = jest.fn().mockResolvedValue({ conversations: ['keep'] });
    const saveData = jest.fn().mockResolvedValue(undefined);
    const store = new PluginDataSprintSettingsStore({ loadData, saveData } as unknown as Plugin);
    const settings = await store.load();
    settings.enabled = true;

    await store.save(settings);

    expect(saveData).toHaveBeenCalledWith(expect.objectContaining({
      conversations: ['keep'],
      sprint: expect.objectContaining({ enabled: true }),
    }));
  });
});
