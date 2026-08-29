import { normalizeSprintSettings } from '@/domain/SprintSettings';
import {
  getSprintSummaryWriteAction,
  migrateBaseFolderContent,
  migrateProjectsBaseContent,
  migrateTasksBaseContent,
  SprintBaseGenerator,
} from '@/obsidian/SprintBaseGenerator';
import { parse } from 'yaml';

describe('SprintBaseGenerator', () => {
  it('creates missing summaries and preserves edited summaries', () => {
    expect(getSprintSummaryWriteAction(null, 'generated')).toBe('create');
    expect(getSprintSummaryWriteAction('generated', 'generated')).toBe('unchanged');
    expect(getSprintSummaryWriteAction('My dashboard', 'generated')).toBe('preserve');
  });

  it('creates missing task, sprint, and project Bases without overwriting existing files', async () => {
    const oldCodexSkill = 'Agile PM/.codex/skills/sprint/SKILL.md';
    const oldDashboard = 'Agile PM/Agile PM.md';
    const generatedDashboard = [
      '## Current Tasks',
      '',
      '![[Agile PM/Tasks.base#Current sprint]]',
      '',
      '---',
      '',
      '## Velocity',
      '',
      '![[Agile PM/Sprints.base#Velocity]]',
      '',
      '---',
      '',
      '## Projects',
      '',
      '![[Agile PM/Projects.base#Projects]]',
      '',
    ].join('\n');
    const existing = new Set<string>(['Agile PM/Tasks.base', oldCodexSkill, oldDashboard]);
    const written = new Map<string, string>([
      [oldCodexSkill, '<!-- sprint-generated-file -->\nname: sprint-vault'],
      [oldDashboard, generatedDashboard],
    ]);
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
        read: jest.fn(async (file: { path: string }) => written.get(file.path) ?? ''),
        modify: jest.fn(async (file: { path: string }, content: string) => {
          written.set(file.path, content);
        }),
        process: jest.fn(async (
          file: { path: string },
          update: (content: string) => string,
        ) => {
          const next = update(written.get(file.path) ?? '');
          written.set(file.path, next);
          return next;
        }),
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
      metadataCache: {
        getFileCache: jest.fn(() => null),
      },
      fileManager: {
        renameFile: jest.fn(async (file: { path: string }, path: string) => {
          const content = written.get(file.path);
          existing.delete(file.path);
          written.delete(file.path);
          file.path = path;
          existing.add(path);
          if (content !== undefined) written.set(path, content);
        }),
      },
    };

    const result = await new SprintBaseGenerator(app as never).generate(
      normalizeSprintSettings({ enabled: true, rootFolder: 'Agile PM' }),
    );

    expect(result).toEqual({ created: 2, skipped: 1, profilesGenerated: 1 });
    expect(written.has('Agile PM/Sprints.base')).toBe(true);
    expect(written.has('Agile PM/Projects.base')).toBe(true);
    expect(written.has('AGENTS.md')).toBe(false);
    expect(written.has('CLAUDE.md')).toBe(false);
    expect(written.has('Agile PM/AGENTS.md')).toBe(true);
    expect(written.has('Agile PM/CLAUDE.md')).toBe(true);
    expect(written.has('.agents/skills/sprint/SKILL.md')).toBe(true);
    expect(written.has('.claude/skills/sprint/SKILL.md')).toBe(true);
    expect(written.has('Agile PM/.agents/skills/sprint/SKILL.md')).toBe(false);
    expect(written.has('Agile PM/.claude/skills/sprint/SKILL.md')).toBe(false);
    expect(app.vault.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: oldCodexSkill }),
      true,
    );
    expect(written.has('Agile PM/Sprint Summary.md')).toBe(true);
    expect(written.has(oldDashboard)).toBe(false);
    expect(written.has('Agile PM/Projects/Welcome to Agile PM.md')).toBe(true);
    expect(written.has('Agile PM/Projects/Sprint system setup.md')).toBe(true);
    expect(written.has('Agile PM/Tasks/Review the Agile PM dashboard.md')).toBe(true);
    expect(written.has('Agile PM/Tasks/Write a sprint review.md')).toBe(true);
    expect(written.get('Agile PM/Projects.base')).toContain('file.inFolder(\\"Agile PM/Projects\\")');
    expect(written.get('Agile PM/Sprints.base')).toContain('velocity: file.backlinks.filter');
    expect(written.get('Agile PM/Sprints.base')).not.toContain('type: chart-bar');
    expect(written.get('Agile PM/Sprints.base')).toContain('type: sprint-agent-velocity-chart');
    expect(written.get('Agile PM/Sprints.base')).toContain('name: "Velocity"');
    expect(written.get('Agile PM/Sprints.base')).toContain('itemType: "sprint"');
    expect(written.get('Agile PM/Projects.base')).not.toContain('note.status');
    expect(written.get('Agile PM/Projects.base')).not.toContain('note.owner');
    expect(written.get('Agile PM/Sprint Summary.md')).toContain('## Velocity');
    expect(written.get('Agile PM/Sprint Summary.md')).not.toMatch(/^# Sprint Summary/m);
    expect(written.get('Agile PM/Sprint Summary.md')).toContain('---\n\n## Velocity');
    expect(written.get('Agile PM/Sprint Summary.md')).toContain('---\n\n## Projects');
    expect(written.get('Agile PM/Sprint Summary.md')).toContain('![[Agile PM/Tasks.base#Current sprint]]');
    expect(written.get('Agile PM/Sprint Summary.md')).not.toContain('#Next sprint');
    expect(written.get('Agile PM/Sprint Summary.md')).not.toContain('## Current Sprint');
    expect(written.get('Agile PM/Sprint Summary.md')).not.toContain('- [ ]');
    expect(written.get('Agile PM/Sprint Summary.md')).toContain('![[Agile PM/Sprints.base#Velocity]]');
    expect(written.get('Agile PM/Sprint Summary.md')).not.toContain('```mermaid');
    expect(written.get('Agile PM/Sprint Summary.md')).not.toContain('sprint-managed-start');
    expect(written.get('Agile PM/Tasks/Plan work into the current sprint.md')).toContain('in progress: true');
    expect(written.get('Agile PM/Tasks/Plan work into the current sprint.md')).toContain('archived: false');
    expect(written.get('Agile PM/Tasks/Plan work into the current sprint.md')).toContain('  - "[[Sprint 1]]"');
    expect(written.get("Agile PM/Tasks/Plan next week's sprint.md")).toContain('  - "[[Sprint 2]]"');
    expect(written.get('Agile PM/Tasks/Continue the Agile PM workflow.md')).toContain('  - "[[Sprint 2]]"');
    expect([...written.keys()].filter((path) => path.startsWith('Agile PM/Tasks/'))).toHaveLength(7);
    expect(written.get('Agile PM/Tasks/Plan work into the current sprint.md')).not.toContain('status:');
    expect(written.get('Agile PM/Projects/Welcome to Agile PM.md')).not.toContain('status:');
    expect(written.get('Agile PM/Projects/Welcome to Agile PM.md')).not.toContain('owner:');
    expect(written.get('Agile PM/Projects/Sprint system setup.md')).not.toContain('owner:');
    expect(app.vault.create).not.toHaveBeenCalledWith(
      'Agile PM/Tasks.base',
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
    expect(app.vault.adapter.write).toHaveBeenCalledWith(
      '.obsidian/types.json',
      expect.not.stringContaining('"owner"'),
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
    settings.skillCustomInstructions['sprint-vault'] = 'Use Fibonacci estimates only.';

    await new SprintBaseGenerator(app as never).generate(settings);

    expect(written.get('AGENTS.md')).toContain('sprint-managed-start');
    expect(written.get('CLAUDE.md')).toContain('sprint-managed-start');
    expect(written.get('.agents/skills/sprint/SKILL.md')).toContain('Use Fibonacci estimates only.');
    expect(written.get('.claude/skills/sprint/SKILL.md')).toContain('Use Fibonacci estimates only.');
    const tasksBase = written.get('Agile PM/Tasks.base') ?? '';
    expect(tasksBase.indexOf('name: "Sprint board"')).toBeLessThan(tasksBase.indexOf('name: "Tasks"'));
    expect(tasksBase).toContain('newTaskProperty1: note.estimate');
    expect(tasksBase).toContain('cardProperty1: note.estimate');
    expect(tasksBase).toContain('cardProperty2: note.sprint');
    expect(tasksBase).toContain('note.archived != true');
    expect(tasksBase).toContain('name: "Current sprint"');
    expect(tasksBase).toContain('sprintScope: "current"');
    expect(tasksBase).toContain('name: "Next sprint"');
    expect(tasksBase).toContain('sprintScope: "next"');
    expect(written.get('Agile PM/AGENTS.md')).toContain(
      '`Tasks.base`, `Sprints.base`, and `Projects.base` live directly in each profile root',
    );
    expect(written.get('Agile PM/AGENTS.md')).toContain(
      'Not started means both state booleans are false',
    );
    expect(written.get('Agile PM/AGENTS.md')).toContain('boolean `archived`');
  });

  it('adds board metadata without replacing custom Base configuration', () => {
    const tasks = [
      'properties:',
      '  file.name:',
      '    displayName: Task',
      '  note.custom:',
      '    displayName: Custom',
      'views:',
      '  - type: sprint-agent-sprint-board',
      '    name: Sprint board',
      '    sprintProfile: agile-pm',
      '    layout: kanban',
      '    customSetting: keep-me',
      '  - type: table',
      '    name: Tasks',
      '    order:',
      '      - file.name',
      '  - type: table',
      '    name: My custom view',
      '    order:',
      '      - note.custom',
      '',
    ].join('\n');
    const projects = [
      'properties:',
      '  file.name:',
      '    displayName: Project',
      'views:',
      '  - type: table',
      '    name: Projects',
      '    order:',
      '      - file.name',
      '',
    ].join('\n');

    const migratedTasks = migrateTasksBaseContent(tasks, 'agile-pm');
    const migratedProjects = migrateProjectsBaseContent(projects);
    type ParsedBase = {
      properties: Record<string, { displayName: string }>;
      views: Array<Record<string, unknown> & {
        filters?: { and: string[] };
        order?: string[];
      }>;
    };
    const parsedTasks = parse(migratedTasks) as ParsedBase;
    const parsedProjects = parse(migratedProjects) as ParsedBase;

    expect(parsedTasks.properties['note.custom']?.displayName).toBe('Custom');
    expect(parsedTasks.properties['note.archived']?.displayName).toBe('Archived');
    expect(parsedTasks.views[0]).toEqual(expect.objectContaining({
      customSetting: 'keep-me',
      cardProperty1: 'note.estimate',
      cardProperty2: 'note.sprint',
    }));
    expect(parsedTasks.views[0]?.filters?.and).toContain('note.archived != true');
    expect(parsedTasks.views[1]?.order).toContain('note.archived');
    expect(parsedTasks.views[2]?.order).toEqual(['note.custom']);
    expect(migrateTasksBaseContent(migratedTasks, 'agile-pm')).toBe(migratedTasks);
    expect(parsedProjects.properties['note.hidden']?.displayName).toBe('Hidden');
    expect(parsedProjects.views[0]?.order).toContain('note.hidden');

    const moved = migrateBaseFolderContent([
      'filters:',
      '  and:',
      '    - file.inFolder("Agile PM/Tasks")',
      '    - file.ext == "md"',
      'views: []',
      '',
    ].join('\n'), 'Sprint/Tasks');
    expect(moved).toContain('file.inFolder("Sprint/Tasks")');
    expect(moved).toContain('file.ext == "md"');
  });

  it('migrates the generated project Base owner default', async () => {
    const existing = new Set<string>();
    const folders = new Set<string>();
    const written = new Map<string, string>();
    const process = jest.fn(async (
      file: { path: string },
      update: (content: string) => string,
    ) => {
      const next = update(written.get(file.path) ?? '');
      written.set(file.path, next);
      return next;
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
        process,
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
    const projectsPath = 'Agile PM/Projects.base';

    await generator.generate(settings);
    const generatedProjects = written.get(projectsPath);
    expect(generatedProjects).toBeDefined();
    written.set(
      projectsPath,
      generatedProjects!
        .replace(
          '  note.priority:',
          '  note.owner:\n    displayName: "Owner"\n  note.priority:',
        )
        .replace('      - note.priority', '      - note.owner\n      - note.priority'),
    );
    process.mockClear();

    await generator.generate(settings);

    expect(process).toHaveBeenCalledWith(
      expect.objectContaining({ path: projectsPath }),
      expect.any(Function),
    );
    expect(written.get(projectsPath)).not.toContain('note.owner');
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
    const process = jest.fn(async (
      _file: { path: string },
      update: (content: string) => string,
    ) => update('# User-edited task\n'));
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
        process,
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
    expect(process).not.toHaveBeenCalledWith(taskFile, expect.any(Function));
  });

  it('does not modify existing unmarked AI instruction or skill files', async () => {
    const existingSkill = '.agents/skills/sprint/SKILL.md';
    const existing = new Set<string>(['Agile PM/AGENTS.md', existingSkill]);
    const modify = jest.fn();
    const process = jest.fn(async (
      _file: { path: string },
      update: (content: string) => string,
    ) => update('# My existing instructions\n'));
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
        process,
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
    expect(process).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: 'Agile PM/AGENTS.md' }),
      expect.any(Function),
    );
    expect(process).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: existingSkill }),
      expect.any(Function),
    );
    expect(app.vault.delete).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: existingSkill }),
      true,
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
        process: jest.fn(async (
          file: { path: string },
          update: (content: string) => string,
        ) => {
          const next = update(written.get(file.path) ?? '');
          written.set(file.path, next);
          return next;
        }),
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
    expect(written.has('Agile PM/Sprints.base')).toBe(true);
    expect(written.get('Agile PM/Tasks.base')).toContain('task_state: if(note["is done"], "Done", if(note["in progress"], "In progress", "Not started"))');
    expect(written.get('Agile PM/Tasks.base')).toContain('layout: "kanban"');
    expect(written.get('Agile PM/Tasks.base')).toContain('showCompleted: true');
    expect(written.get('Agile PM/Tasks.base')).toContain('name: "Current sprint"');
    expect(written.get('Agile PM/Tasks.base')).toContain('name: "Next sprint"');
    expect(written.get('Agile PM/Tasks.base')).toContain('is_current_sprint: note.sprint.filter');
    expect(written.get('Agile PM/Tasks.base')).toContain('is_next_sprint: note.sprint.filter');
    expect(written.get('Agile PM/Tasks.base')).toContain('- formula.is_current_sprint');
    expect(written.get('Agile PM/Tasks.base')).toContain('- formula.is_next_sprint');
    expect(written.get('Agile PM/Tasks.base')).not.toContain('note.status');
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
        process: jest.fn(async (
          _file: { path: string },
          update: (content: string) => string,
        ) => update('')),
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
