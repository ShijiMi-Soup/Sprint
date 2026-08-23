import {
  normalizeSprintSettings,
  resolveSprintProfile,
} from '@/domain/SprintSettings';

describe('SprintSettings', () => {
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
    expect(settings.profiles[0]).toMatchObject({
      rootFolder: 'Work/Agile',
      tasksBasePath: 'Work/Agile/Bases/Tasks.base',
      sprintsBasePath: 'Work/Agile/Bases/Sprints.base',
      projectsBasePath: 'Work/Agile/Bases/Projects.base',
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
        tasksBasePath: 'Work/Bases/Tasks.base',
        sprintsBasePath: 'Work/Bases/Sprints.base',
        projectsBasePath: 'Work/Bases/Projects.base',
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
      tasksBasePath: 'Agile Tasks/Bases/Tasks.base',
      sprintsBasePath: 'Agile Tasks/Bases/Sprints.base',
      projectsBasePath: 'Agile Tasks/Bases/Projects.base',
    });
  });
});
