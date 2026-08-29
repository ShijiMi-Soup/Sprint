import {
  normalizeSprintSettings,
  resolveSprintProfile,
} from '@/domain/SprintSettings';

describe('SprintSettings', () => {
  it('uses Sprint as the default folder and profile name', () => {
    const settings = normalizeSprintSettings(undefined);

    expect(settings.profiles[0]).toEqual(expect.objectContaining({
      name: 'Sprint',
      rootFolder: 'Sprint',
      tasksBasePath: 'Sprint/Tasks.base',
      samplesInitialized: false,
    }));
    expect(settings.supportSchemaVersion).toBe(0);
  });

  it('normalizes the installed support schema version', () => {
    const settings = normalizeSprintSettings({
      enabled: true,
      supportSchemaVersion: 3.9,
      defaults: {},
      profiles: [],
    });

    expect(settings.supportSchemaVersion).toBe(3);
  });

  it('keeps only the first stored workspace for the v0.1 single-workspace model', () => {
    const settings = normalizeSprintSettings({
      enabled: true,
      defaults: {},
      profiles: [
        {
          id: 'primary',
          name: 'Primary',
          enabled: false,
          rootFolder: 'Primary',
          tasksBasePath: 'Primary/Tasks.base',
          sprintsBasePath: 'Primary/Sprints.base',
          projectsBasePath: 'Primary/Projects.base',
          anchorDate: '',
          overrides: {},
        },
        {
          id: 'secondary',
          name: 'Secondary',
          enabled: true,
          rootFolder: 'Secondary',
          tasksBasePath: 'Secondary/Tasks.base',
          sprintsBasePath: 'Secondary/Sprints.base',
          projectsBasePath: 'Secondary/Projects.base',
          anchorDate: '',
          overrides: {},
        },
      ],
    });

    expect(settings.profiles).toHaveLength(1);
    expect(settings.profiles[0]).toEqual(expect.objectContaining({
      id: 'primary',
      enabled: true,
      rootFolder: 'Primary',
      samplesInitialized: true,
    }));
  });

  it('preserves an explicit request to recreate tutorial samples after reset', () => {
    const settings = normalizeSprintSettings({
      enabled: true,
      defaults: {},
      profiles: [{
        id: 'primary',
        name: 'Primary',
        enabled: true,
        rootFolder: 'Primary',
        tasksBasePath: 'Primary/Tasks.base',
        sprintsBasePath: 'Primary/Sprints.base',
        projectsBasePath: 'Primary/Projects.base',
        anchorDate: '',
        samplesInitialized: false,
        overrides: {},
      }],
    });

    expect(settings.profiles[0]?.samplesInitialized).toBe(false);
  });

  it('migrates the original single-workspace settings into a profile', () => {
    const settings = normalizeSprintSettings({
      enabled: true,
      rootFolder: 'Work/Agile',
      durationWeeks: 2,
      startDay: 3,
      anchorDate: '2026-08-05',
      incompleteTaskPolicy: 'backlog',
    });

    expect(settings.defaults).toMatchObject({
      durationWeeks: 2,
      startDay: 3,
      incompleteTaskPolicy: 'backlog',
    });
    expect(settings.generateVaultRootInstructions).toBe(false);
    expect(settings.skillCustomInstructions).toEqual({});
    expect(settings.profiles[0]).toMatchObject({
      rootFolder: 'Work/Agile',
      tasksBasePath: 'Work/Agile/Tasks.base',
      sprintsBasePath: 'Work/Agile/Sprints.base',
      projectsBasePath: 'Work/Agile/Projects.base',
      anchorDate: '2026-08-05',
    });
  });

  it('normalizes vault-root AI instructions as an opt-in setting', () => {
    expect(normalizeSprintSettings({
      enabled: true,
      generateVaultRootInstructions: true,
      defaults: {},
      profiles: [],
    }).generateVaultRootInstructions).toBe(true);
  });

  it('normalizes editable AI skill additions', () => {
    expect(normalizeSprintSettings({
      enabled: true,
      skillCustomInstructions: {
        'sprint-vault': '  Prefer Fibonacci estimates.  ',
        invalid: 3,
      },
      defaults: {},
      profiles: [],
    }).skillCustomInstructions).toEqual({
      'sprint-vault': 'Prefer Fibonacci estimates.',
    });
  });

  it('resolves profile overrides over global defaults', () => {
    const settings = normalizeSprintSettings({
      enabled: true,
      defaults: {
        durationWeeks: 1,
        startDay: 1,
        incompleteTaskPolicy: 'next',
        futureSprintCount: 1,
        namingFormat: 'Sprint {number}',
      },
      profiles: [{
        id: 'work',
        name: 'Work',
        enabled: true,
        rootFolder: 'Work',
        tasksBasePath: 'Work/Tasks.base',
        sprintsBasePath: 'Work/Sprints.base',
        projectsBasePath: 'Work/Projects.base',
        anchorDate: '',
        overrides: { durationWeeks: 2, incompleteTaskPolicy: 'keep' },
      }],
    });

    expect(resolveSprintProfile(settings, settings.profiles[0]!)).toMatchObject({
      durationWeeks: 2,
      startDay: 1,
      incompleteTaskPolicy: 'keep',
    });
  });

  it('moves default-looking base paths with the profile root', () => {
    const settings = normalizeSprintSettings({
      enabled: true,
      defaults: {
        durationWeeks: 1,
        startDay: 1,
        incompleteTaskPolicy: 'next',
        futureSprintCount: 1,
        namingFormat: 'Sprint {number}',
      },
      profiles: [{
        id: 'agile-pm',
        name: 'Agile PM',
        enabled: true,
        rootFolder: 'Agile Tasks',
        tasksBasePath: 'Agile PM/Bases/Tasks.base',
        sprintsBasePath: 'Agile PM/Bases/Sprints.base',
        projectsBasePath: 'Agile PM/Bases/Projects.base',
        anchorDate: '',
        overrides: {},
      }],
    });

    expect(settings.profiles[0]).toMatchObject({
      rootFolder: 'Agile Tasks',
      tasksBasePath: 'Agile Tasks/Tasks.base',
      sprintsBasePath: 'Agile Tasks/Sprints.base',
      projectsBasePath: 'Agile Tasks/Projects.base',
    });
  });
});
