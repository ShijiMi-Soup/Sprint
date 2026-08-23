import { normalizeSprintSettings } from '@/domain/SprintSettings';
import { SprintBaseGenerator } from '@/obsidian/SprintBaseGenerator';

describe('SprintBaseGenerator', () => {
  it('creates missing task, sprint, and project Bases without overwriting existing files', async () => {
    const existing = new Set<string>(['Agile PM/Bases/Tasks.base']);
    const written = new Map<string, string>();
    const folders = new Set<string>();
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '{}'),
          write: jest.fn(),
        },
        getAbstractFileByPath: jest.fn((path: string) => (
          existing.has(path) || folders.has(path) ? { path } : null
        )),
        getFileByPath: jest.fn((path: string) => (
          existing.has(path) ? { path } : null
        )),
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(async () => ''),
        modify: jest.fn(async (file: { path: string }, content: string) => {
          written.set(file.path, content);
        }),
        delete: jest.fn(async (file: { path: string }) => {
          existing.delete(file.path);
        }),
        createFolder: jest.fn(async (path: string) => {
          folders.add(path);
        }),
        create: jest.fn(async (path: string, content: string) => {
          existing.add(path);
          written.set(path, content);
          return { path };
        }),
      },
      metadataCache: {
        getFileCache: jest.fn(() => null),
      },
    };

    const result = await new SprintBaseGenerator(app as never).generate(
      normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' }),
    );

    expect(result).toEqual({ created: 2, skipped: 1, profilesGenerated: 1 });
    expect(written.has('Agile PM/Bases/Sprints.base')).toBe(true);
    expect(written.has('Agile PM/Bases/Projects.base')).toBe(true);
    expect(written.has('AGENTS.md')).toBe(false);
    expect(written.has('CLAUDE.md')).toBe(false);
    expect(written.has('Agile PM/AGENTS.md')).toBe(true);
    expect(written.has('Agile PM/CLAUDE.md')).toBe(true);
    expect(written.has('Agile PM/.codex/skills/sprint/SKILL.md')).toBe(true);
    expect(written.has('Agile PM/.claude/skills/sprint/SKILL.md')).toBe(true);
    expect(written.has('Agile PM/Agile PM.md')).toBe(true);
    expect(written.has('Agile PM/Projects/Welcome to Agile PM.md')).toBe(true);
    expect(written.has('Agile PM/Projects/Sprint system setup.md')).toBe(true);
    expect(written.has('Agile PM/Tasks/Review the Agile PM dashboard.md')).toBe(true);
    expect(written.has('Agile PM/Tasks/Write a sprint review.md')).toBe(true);
    expect(written.get('Agile PM/Bases/Projects.base')).toContain('file.inFolder(\\"Agile PM/Projects\\")');
    expect(written.get('Agile PM/Bases/Sprints.base')).toContain('velocity: file.backlinks.filter');
    expect(written.get('Agile PM/Bases/Sprints.base')).not.toContain('type: chart-bar');
    expect(written.get('Agile PM/Bases/Sprints.base')).toContain('type: sprint-agent-velocity-chart');
    expect(written.get('Agile PM/Bases/Sprints.base')).toContain('name: "Velocity"');
    expect(written.get('Agile PM/Bases/Projects.base')).not.toContain('note.status');
    expect(written.get('Agile PM/Agile PM.md')).toContain('## Velocity');
    expect(written.get('Agile PM/Agile PM.md')).toContain('![[Agile PM/Bases/Tasks.base#Current sprint]]');
    expect(written.get('Agile PM/Agile PM.md')).not.toContain('- [ ]');
    expect(written.get('Agile PM/Agile PM.md')).toContain('![[Agile PM/Bases/Sprints.base#Velocity]]');
    expect(written.get('Agile PM/Agile PM.md')).not.toContain('```mermaid');
    expect(written.get('Agile PM/Agile PM.md')).not.toContain('sprint-managed-start');
    expect(written.get('Agile PM/Tasks/Plan work into the current sprint.md')).toContain('in progress: true');
    expect(written.get('Agile PM/Tasks/Plan work into the current sprint.md')).toContain('  - "[[Sprint 1]]"');
    expect(written.get("Agile PM/Tasks/Plan next week's sprint.md")).toContain('  - "[[Sprint 2]]"');
    expect(written.get('Agile PM/Tasks/Continue the Agile PM workflow.md')).toContain('  - "[[Sprint 2]]"');
    expect([...written.keys()].filter((path) => path.startsWith('Agile PM/Tasks/'))).toHaveLength(7);
    expect(written.get('Agile PM/Tasks/Plan work into the current sprint.md')).not.toContain('status:');
    expect(written.get('Agile PM/Projects/Welcome to Agile PM.md')).not.toContain('status:');
    expect(app.vault.create).not.toHaveBeenCalledWith(
      'Agile PM/Bases/Tasks.base',
      expect.any(String),
    );
    expect(app.vault.adapter.write).toHaveBeenCalledWith(
      '.obsidian/types.json',
      expect.stringContaining('"estimate": "number"'),
    );
    expect(app.vault.adapter.write).toHaveBeenCalledWith(
      '.obsidian/types.json',
      expect.stringContaining('"in progress": "checkbox"'),
    );
  });

  it('generates vault-root instructions only when opted in', async () => {
    const written = new Map<string, string>();
    const existing = new Set<string>();
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '{}'),
          write: jest.fn(),
        },
        getAbstractFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(async (file: { path: string }) => written.get(file.path) ?? ''),
        modify: jest.fn(async (file: { path: string }, content: string) => written.set(file.path, content)),
        delete: jest.fn(),
        createFolder: jest.fn(async (path: string) => { existing.add(path); }),
        create: jest.fn(async (path: string, content: string) => {
          existing.add(path);
          written.set(path, content);
          return { path };
        }),
      },
      metadataCache: { getFileCache: jest.fn(() => null) },
    };
    const settings = normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' });
    settings.generateVaultRootInstructions = true;

    await new SprintBaseGenerator(app as never).generate(settings);

    expect(written.get('AGENTS.md')).toContain('sprint-managed-start');
    expect(written.get('CLAUDE.md')).toContain('sprint-managed-start');
  });

  it('migrates a generated Tasks Base so completed cards remain visible', async () => {
    const existing = new Set<string>();
    const folders = new Set<string>();
    const written = new Map<string, string>();
    const modify = jest.fn(async (file: { path: string }, content: string) => {
      written.set(file.path, content);
    });
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '{}'),
          write: jest.fn(),
        },
        getAbstractFileByPath: jest.fn((path: string) => (
          existing.has(path) || folders.has(path) ? { path } : null
        )),
        getFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(async (file: { path: string }) => written.get(file.path) ?? ''),
        modify,
        delete: jest.fn(async (file: { path: string }) => {
          existing.delete(file.path);
          written.delete(file.path);
        }),
        createFolder: jest.fn(async (path: string) => {
          folders.add(path);
        }),
        create: jest.fn(async (path: string, content: string) => {
          existing.add(path);
          written.set(path, content);
          return { path };
        }),
      },
      metadataCache: { getFileCache: jest.fn(() => null) },
    };
    const generator = new SprintBaseGenerator(app as never);
    const settings = normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' });
    const path = 'Agile PM/Bases/Tasks.base';

    await generator.generate(settings);
    const generated = written.get(path);
    expect(generated).toBeDefined();
    written.set(path, generated!.replace('showCompleted: true', 'showCompleted: false'));
    modify.mockClear();

    await generator.generate(settings);

    expect(modify).toHaveBeenCalledWith(
      expect.objectContaining({ path }),
      expect.stringContaining('showCompleted: true'),
    );
    expect(written.get(path)).toContain('showCompleted: true');
  });

  it('assigns Sprint 1 to an edited sample task without replacing its properties', async () => {
    const taskPath = 'Agile PM/Tasks/Review the Agile PM dashboard.md';
    const taskFile = { path: taskPath };
    const existing = new Set<string>([taskPath]);
    const folders = new Set<string>();
    const properties: Record<string, unknown> = {
      estimate: 8,
      'in progress': true,
      'is done': false,
    };
    const modify = jest.fn();
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '{}'),
          write: jest.fn(),
        },
        getAbstractFileByPath: jest.fn((path: string) => (
          existing.has(path) || folders.has(path) ? { path } : null
        )),
        getFileByPath: jest.fn((path: string) => (path === taskPath ? taskFile : null)),
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(async () => '# User-edited task\n'),
        modify,
        delete: jest.fn(),
        createFolder: jest.fn(async (path: string) => {
          folders.add(path);
        }),
        create: jest.fn(async (path: string) => {
          existing.add(path);
          return { path };
        }),
      },
      metadataCache: {
        getFileCache: jest.fn((file: { path: string }) => (
          file.path === taskPath ? { frontmatter: properties } : null
        )),
      },
      fileManager: {
        processFrontMatter: jest.fn(async (
          _file: { path: string },
          mutation: (frontmatter: Record<string, unknown>) => void,
        ) => mutation(properties)),
      },
    };

    await new SprintBaseGenerator(app as never).generate(
      normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' }),
    );

    expect(properties).toEqual({
      estimate: 8,
      'in progress': true,
      'is done': false,
      sprint: ['[[Sprint 1]]'],
    });
    expect(modify).not.toHaveBeenCalledWith(taskFile, expect.any(String));
  });

  it('does not modify existing unmarked AI instruction files', async () => {
    const existing = new Set<string>(['Agile PM/AGENTS.md']);
    const modify = jest.fn();
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '{}'),
          write: jest.fn(),
        },
        getAbstractFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(async () => '# My existing instructions\n'),
        modify,
        delete: jest.fn(),
        createFolder: jest.fn(async (path: string) => { existing.add(path); }),
        create: jest.fn(async (path: string) => { existing.add(path); return { path }; }),
      },
      metadataCache: { getFileCache: jest.fn(() => null) },
    };

    await new SprintBaseGenerator(app as never).generate(
      normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' }),
    );

    expect(modify).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Agile PM/AGENTS.md' }),
      expect.any(String),
    );
  });

  it('deletes the selected profile root when resetting', async () => {
    const agilePm = { path: 'Agile PM' };
    const app = {
      vault: {
        getAbstractFileByPath: jest.fn((path: string) => (path === 'Agile PM' ? agilePm : null)),
        delete: jest.fn(),
      },
    };

    await new SprintBaseGenerator(app as never).resetProfileRoot(
      normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' }),
      'agile-pm',
    );

    expect(app.vault.delete).toHaveBeenCalledWith(agilePm, true);
  });

  it('continues when Obsidian reports a folder already exists during generation', async () => {
    const existing = new Set<string>();
    const written = new Map<string, string>();
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '{}'),
          write: jest.fn(),
        },
        getAbstractFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getFileByPath: jest.fn(() => null),
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(async () => ''),
        modify: jest.fn(),
        delete: jest.fn(),
        createFolder: jest.fn(async (path: string) => {
          existing.add(path);
          throw new Error('Folder already exists.');
        }),
        create: jest.fn(async (path: string, content: string) => {
          existing.add(path);
          written.set(path, content);
          return { path };
        }),
      },
      metadataCache: {
        getFileCache: jest.fn(() => null),
      },
    };

    await expect(new SprintBaseGenerator(app as never).generate(
      normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' }),
    )).resolves.toEqual({ created: 3, skipped: 0, profilesGenerated: 1 });
    expect(written.has('Agile PM/Bases/Sprints.base')).toBe(true);
    expect(written.get('Agile PM/Bases/Tasks.base')).toContain('task_state: if(note["is done"], "Done", if(note["in progress"], "In progress", "Not started"))');
    expect(written.get('Agile PM/Bases/Tasks.base')).toContain('layout: "kanban"');
    expect(written.get('Agile PM/Bases/Tasks.base')).toContain('showCompleted: true');
    expect(written.get('Agile PM/Bases/Tasks.base')).toContain('name: "Current sprint"');
    expect(written.get('Agile PM/Bases/Tasks.base')).toContain('is_current_sprint: note.sprint.filter');
    expect(written.get('Agile PM/Bases/Tasks.base')).toContain('- formula.is_current_sprint');
    expect(written.get('Agile PM/Bases/Tasks.base')).not.toContain('note.status');
  });

  it('skips base files that race into existence during generation', async () => {
    const existing = new Set<string>();
    const app = {
      vault: {
        configDir: '.obsidian',
        adapter: {
          exists: jest.fn(async () => false),
          read: jest.fn(async () => '{}'),
          write: jest.fn(),
        },
        getAbstractFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getFileByPath: jest.fn((path: string) => (existing.has(path) ? { path } : null)),
        getMarkdownFiles: jest.fn(() => []),
        read: jest.fn(async () => ''),
        modify: jest.fn(),
        delete: jest.fn(),
        createFolder: jest.fn(async (path: string) => {
          existing.add(path);
        }),
        create: jest.fn(async (path: string) => {
          existing.add(path);
          throw new Error('File already exists.');
        }),
      },
      metadataCache: {
        getFileCache: jest.fn(() => null),
      },
    };

    await expect(new SprintBaseGenerator(app as never).generate(
      normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' }),
    )).resolves.toEqual({ created: 0, skipped: 3, profilesGenerated: 1 });
  });
});
