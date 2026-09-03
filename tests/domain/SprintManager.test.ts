import type { SprintProfile, SprintSettings } from '@/domain/types';
import {
  SprintManager,
  type SprintVault,
  type SprintVaultNote,
} from '@/domain/SprintManager';

class MemorySprintVault implements SprintVault {
  readonly notes = new Map<string, { frontmatter: Record<string, unknown>; body: string }>();

  listMarkdownNotes(folder: string): SprintVaultNote[] {
    const prefix = `${folder}/`;
    return Array.from(this.notes.keys())
      .filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
      .map((path) => ({ path, basename: path.split('/').at(-1)!.replace(/\.md$/, '') }));
  }

  getFrontmatter(note: SprintVaultNote): Record<string, unknown> {
    return { ...this.notes.get(note.path)?.frontmatter };
  }

  async ensureFolder(): Promise<void> {}

  async createNote(
    path: string,
    frontmatter: Record<string, unknown>,
    body: string,
  ): Promise<SprintVaultNote> {
    this.notes.set(path, { frontmatter: { ...frontmatter }, body });
    return { path, basename: path.split('/').at(-1)!.replace(/\.md$/, '') };
  }

  async upsertNote(
    path: string,
    frontmatter: Record<string, unknown>,
    body: string,
  ): Promise<{ note: SprintVaultNote; created: boolean }> {
    const created = !this.notes.has(path);
    this.notes.set(path, { frontmatter: { ...frontmatter }, body });
    return {
      note: { path, basename: path.split('/').at(-1)!.replace(/\.md$/, '') },
      created,
    };
  }

  async updateFrontmatter(
    note: SprintVaultNote,
    mutation: (frontmatter: Record<string, unknown>) => void,
  ): Promise<void> {
    const value = this.notes.get(note.path)!;
    mutation(value.frontmatter);
  }
}

function settings(overrides: Partial<SprintSettings> = {}): SprintSettings {
  return {
    enabled: true,
    onboardingComplete: true,
    supportSchemaVersion: 1,
    generateVaultRootInstructions: false,
    skillCustomInstructions: {},
    defaults: {
      durationWeeks: 1,
      startDay: 1,
      incompleteTaskPolicy: 'next',
      futureSprintCount: 1,
      namingFormat: 'Sprint {number}',
    },
    profiles: [profile()],
    ...overrides,
  };
}

function profile(overrides: Partial<SprintProfile> = {}): SprintProfile {
  return {
    id: 'agile-pm',
    name: 'Agile PM',
    enabled: true,
    rootFolder: 'Agile PM',
    tasksBasePath: 'Agile PM/Tasks.base',
    sprintsBasePath: 'Agile PM/Sprints.base',
    projectsBasePath: 'Agile PM/Projects.base',
    anchorDate: '2026-08-03',
    overrides: {},
    ...overrides,
  };
}

describe('SprintManager', () => {
  it('creates the current and next sprint with Notion-style lifecycle metadata', async () => {
    const vault = new MemorySprintVault();
    vault.notes.set('Agile PM/Sprints/Sprint 3.md', { frontmatter: {}, body: '' });
    const manager = new SprintManager(vault, () => settings(), () => '2026-08-07');

    const result = await manager.sync();

    expect(result.created).toBe(1);
    expect(vault.notes.get('Agile PM/Sprints/Sprint 3.md')?.frontmatter).toMatchObject({
      'sprint number': 3,
      'start date': '2026-08-03',
      'end date': '2026-08-09',
      'sprint status': 'current',
      review: '',
      retrospective: '',
    });
    expect(vault.notes.get('Agile PM/Sprints/Sprint 4.md')?.frontmatter).toMatchObject({
      'start date': '2026-08-10',
      'sprint status': 'next',
    });
  });

  it('is idempotent when synchronized more than once in the same cycle', async () => {
    const vault = new MemorySprintVault();
    const manager = new SprintManager(vault, () => settings(), () => '2026-08-07');

    await manager.sync();
    const second = await manager.sync();

    expect(second.created).toBe(0);
    expect(vault.listMarkdownNotes('Agile PM/Sprints')).toHaveLength(2);
  });

  it('generates one sprint after the latest sprint without changing the automatic horizon', async () => {
    const vault = new MemorySprintVault();
    const manager = new SprintManager(vault, () => settings(), () => '2026-08-07');

    const [first, second] = await Promise.all([
      manager.generateFutureSprint('agile-pm'),
      manager.generateFutureSprint('agile-pm'),
    ]);

    expect(first).toMatchObject({
      created: true,
      sprintNumber: 3,
      startDate: '2026-08-17',
      note: { path: 'Agile PM/Sprints/Sprint 3.md', basename: 'Sprint 3' },
    });
    expect(second).toMatchObject({
      sprintNumber: 4,
      startDate: '2026-08-24',
      note: { path: 'Agile PM/Sprints/Sprint 4.md', basename: 'Sprint 4' },
    });
    expect(vault.notes.get('Agile PM/Sprints/Sprint 4.md')?.frontmatter).toMatchObject({
      'sprint status': 'future',
      'end date': '2026-08-30',
    });
    expect(settings().defaults.futureSprintCount).toBe(1);
  });

  it('rejects explicit future generation when sprint names cannot stay unique', async () => {
    const vault = new MemorySprintVault();
    const customSettings = settings({
      profiles: [profile({ overrides: { namingFormat: 'Cycle' } })],
    });
    const manager = new SprintManager(vault, () => customSettings, () => '2026-08-07');

    await expect(manager.generateFutureSprint('agile-pm'))
      .rejects.toThrow('Sprint naming must include {number}');
  });

  it('repairs empty existing sprint files instead of failing creation', async () => {
    const vault = new MemorySprintVault();
    vault.notes.set('Agile PM/Sprints/Sprint 1.md', { frontmatter: {}, body: '' });
    const manager = new SprintManager(vault, () => settings(), () => '2026-08-07');

    const result = await manager.sync();

    expect(result.created).toBe(1);
    expect(vault.notes.get('Agile PM/Sprints/Sprint 1.md')?.frontmatter).toMatchObject({
      'sprint number': 1,
      'start date': '2026-08-03',
      'sprint status': 'current',
    });
    expect(vault.notes.get('Agile PM/Sprints/Sprint 2.md')?.frontmatter).toMatchObject({
      'sprint number': 2,
      'start date': '2026-08-10',
      'sprint status': 'next',
    });
  });

  it('catches up missed cycles and moves unfinished tasks into the new current sprint', async () => {
    const vault = new MemorySprintVault();
    vault.notes.set('Agile PM/Sprints/Sprint 1.md', {
      frontmatter: {
        'sprint number': 1,
        'start date': '2026-07-20',
        'end date': '2026-07-26',
        'sprint status': 'current',
      },
      body: '',
    });
    vault.notes.set('Agile PM/Sprints/Sprint 2.md', {
      frontmatter: {
        'sprint number': 2,
        'start date': '2026-07-27',
        'end date': '2026-08-02',
        'sprint status': 'next',
      },
      body: '',
    });
    vault.notes.set('Agile PM/Tasks/Carry me.md', {
      frontmatter: { sprint: ['[[Sprint 1]]'], estimate: 3, 'is done': false },
      body: '',
    });
    vault.notes.set('Agile PM/Tasks/Leave me.md', {
      frontmatter: { sprint: ['[[Sprint 1]]'], estimate: 2, 'is done': true },
      body: '',
    });
    vault.notes.set('Agile PM/Tasks/Planned next but missed.md', {
      frontmatter: { sprint: ['[[Sprint 2]]'], estimate: 1, 'is done': false },
      body: '',
    });
    const manager = new SprintManager(vault, () => settings(), () => '2026-08-07');

    const result = await manager.sync();

    expect(result.created).toBe(2);
    expect(result.movedTasks).toBe(2);
    expect(vault.notes.get('Agile PM/Tasks/Carry me.md')?.frontmatter.sprint)
      .toEqual(['[[Sprint 3]]']);
    expect(vault.notes.get('Agile PM/Tasks/Leave me.md')?.frontmatter.sprint)
      .toEqual(['[[Sprint 1]]']);
    expect(vault.notes.get('Agile PM/Tasks/Planned next but missed.md')?.frontmatter.sprint)
      .toEqual(['[[Sprint 3]]']);
    expect(vault.notes.get('Agile PM/Sprints/Sprint 1.md')?.frontmatter['sprint status'])
      .toBe('past');
    expect(vault.notes.get('Agile PM/Sprints/Sprint 2.md')?.frontmatter['sprint status'])
      .toBe('last');
    expect(vault.notes.get('Agile PM/Sprints/Sprint 3.md')?.frontmatter['sprint status'])
      .toBe('current');
    expect(vault.notes.get('Agile PM/Sprints/Sprint 4.md')?.frontmatter['sprint status'])
      .toBe('next');
  });

  it('moves unfinished tasks to the backlog when configured', async () => {
    const vault = new MemorySprintVault();
    vault.notes.set('Agile PM/Sprints/Sprint 1.md', {
      frontmatter: {
        'sprint number': 1,
        'start date': '2026-07-27',
        'sprint status': 'current',
      },
      body: '',
    });
    vault.notes.set('Agile PM/Tasks/Backlog me.md', {
      frontmatter: { sprint: ['[[Sprint 1]]'], 'is done': false },
      body: '',
    });
    const manager = new SprintManager(
      vault,
      () => settings({ profiles: [profile({ overrides: { incompleteTaskPolicy: 'backlog' } })] }),
      () => '2026-08-07',
    );

    await manager.sync();

    expect(vault.notes.get('Agile PM/Tasks/Backlog me.md')?.frontmatter.sprint).toBeUndefined();
  });

  it('synchronizes enabled profiles with their own cadence overrides', async () => {
    const vault = new MemorySprintVault();
    const manager = new SprintManager(
      vault,
      () => settings({
        profiles: [
          profile(),
          profile({
            id: 'personal',
            name: 'Personal',
            rootFolder: 'Personal',
            tasksBasePath: 'Personal/Tasks.base',
            sprintsBasePath: 'Personal/Sprints.base',
            overrides: { durationWeeks: 2, namingFormat: 'Cycle {number}' },
          }),
        ],
      }),
      () => '2026-08-07',
    );

    const result = await manager.sync();

    expect(result.profilesSynced).toBe(2);
    expect(vault.notes.has('Agile PM/Sprints/Sprint 1.md')).toBe(true);
    expect(vault.notes.get('Personal/Sprints/Cycle 1.md')?.frontmatter['end date'])
      .toBe('2026-08-16');
  });
});
