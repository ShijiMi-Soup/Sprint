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
    expect(settings.profiles[0]).toMatchObject({
      rootFolder: 'Work/Agile',
      tasksBasePath: 'Work/Agile/Bases/Tasks.base',
      sprintsBasePath: 'Work/Agile/Bases/Sprints.base',
      anchorDate: '2026-08-05',
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
        tasksBasePath: 'Work/Bases/Tasks.base',
        sprintsBasePath: 'Work/Bases/Sprints.base',
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
});
