import { ObsidianSprintVault } from '@/obsidian/ObsidianSprintVault';

describe('ObsidianSprintVault', () => {
  it('lists only Markdown notes directly inside the requested folder', () => {
    const sprint = {
      path: 'Sprint/Sprints/Sprint 1.md',
      basename: 'Sprint 1',
      extension: 'md',
    };
    const app = {
      vault: {
        getFolderByPath: jest.fn(() => ({
          children: [
            sprint,
            { path: 'Sprint/Sprints/notes.txt', basename: 'notes', extension: 'txt' },
            { path: 'Sprint/Sprints/Archive', name: 'Archive', children: [] },
          ],
        })),
      },
      metadataCache: {},
      fileManager: {},
    };

    expect(new ObsidianSprintVault(app as never).listMarkdownNotes('Sprint/Sprints'))
      .toEqual([sprint]);
    expect(app.vault.getFolderByPath).toHaveBeenCalledWith('Sprint/Sprints');
  });

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
        process: jest.fn(async (
          _file: { path: string },
          update: (content: string) => string,
        ) => update('')),
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
    expect(app.vault.process).toHaveBeenCalledWith(
      file,
      expect.any(Function),
    );
    const update = app.vault.process.mock.calls[0]?.[1];
    expect(update?.('')).toContain('sprint number: 1');
  });
});
