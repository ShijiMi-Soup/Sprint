import { ObsidianSprintVault } from '@/obsidian/ObsidianSprintVault';

describe('ObsidianSprintVault', () => {
  it('treats an already-existing folder error as successful folder creation', async () => {
    const app = {
      vault: {
        getAbstractFileByPath: jest.fn(() => null),
        createFolder: jest.fn(async () => {
          throw new Error('Folder already exists.');
        }),
      },
      metadataCache: {},
      fileManager: {},
    };

    await expect(new ObsidianSprintVault(app as never).ensureFolder('Agile PM/Sprints'))
      .resolves.toBeUndefined();
  });

  it('repairs a note when creation races with an existing file', async () => {
    const file = { path: 'Agile PM/Sprints/Sprint 1.md' };
    const app = {
      vault: {
        getFileByPath: jest.fn()
          .mockReturnValueOnce(null)
          .mockReturnValueOnce(file),
        create: jest.fn(async () => {
          throw new Error('File already exists.');
        }),
        modify: jest.fn(),
      },
      metadataCache: {},
      fileManager: {},
    };

    const result = await new ObsidianSprintVault(app as never).upsertNote(
      'Agile PM/Sprints/Sprint 1.md',
      { 'sprint number': 1 },
      'Body',
    );

    expect(result).toEqual({
      note: { path: 'Agile PM/Sprints/Sprint 1.md', basename: 'Sprint 1' },
      created: false,
    });
    expect(app.vault.modify).toHaveBeenCalledWith(
      file,
      expect.stringContaining('sprint number: 1'),
    );
  });
});
