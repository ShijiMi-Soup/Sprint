import { normalizeSprintSettings } from '@/domain/SprintSettings';
import {
  applyTaskBoardState,
  applyNewTaskFrontmatter,
  createSprintBasesViewRegistration,
  createSprintVelocityViewRegistration,
  getEstimateTone,
  getEditableTaskProperties,
  getSprintBasesOptions,
  getTaskProjectGroup,
  selectRecentVelocityPoints,
} from '@/obsidian/SprintBasesView';

describe('SprintBasesView', () => {
  it('offers profile and per-view display options stored by Obsidian Bases', () => {
    const settings = normalizeSprintSettings({ rootFolder: 'Agile PM' });

    expect(getSprintBasesOptions(settings)).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'sprintProfile', type: 'dropdown' }),
      expect.objectContaining({ key: 'layout', type: 'dropdown' }),
      expect.objectContaining({ key: 'showCompleted', type: 'toggle' }),
      expect.objectContaining({
        type: 'group',
        displayName: 'Task cards',
        items: expect.arrayContaining([
          expect.objectContaining({ key: 'cardProperty1', type: 'property' }),
        ]),
      }),
      expect.objectContaining({
        type: 'group',
        displayName: 'New task form',
        items: expect.arrayContaining([
          expect.objectContaining({ key: 'newTaskProperty1', type: 'property' }),
        ]),
      }),
    ]));
    expect(getSprintBasesOptions(settings)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'layout',
        options: expect.objectContaining({ kanban: 'Kanban' }),
      }),
    ]));
  });

  it('normalizes the properties shown in the new-task composer', () => {
    expect(getEditableTaskProperties(['note.estimate', 'due', 'estimate', 'project']))
      .toEqual(['estimate', 'due']);
    expect(getEditableTaskProperties(undefined)).toEqual(['estimate']);
  });

  it('applies Kanban context and editable values to a new task', () => {
    const frontmatter: Record<string, unknown> = {};

    applyNewTaskFrontmatter(
      frontmatter,
      'In progress',
      'Agile PM/Projects/Research',
      'Agile PM/Sprints/Sprint 2',
      { estimate: 3, due: '2026-09-04' },
    );

    expect(frontmatter).toEqual({
      'in progress': true,
      'is done': false,
      archived: false,
      project: ['[[Agile PM/Projects/Research]]'],
      sprint: ['[[Agile PM/Sprints/Sprint 2]]'],
      estimate: 3,
      due: '2026-09-04',
    });
  });

  it('creates dedicated child containers for embedded custom views', () => {
    const settings = normalizeSprintSettings({ rootFolder: 'Agile PM' });
    const boardChild = {} as HTMLElement;
    const velocityChild = {} as HTMLElement;
    const boardParent = {
      closest: jest.fn(() => ({ className: 'bases-embed' })),
      createDiv: jest.fn(() => boardChild),
    } as unknown as HTMLElement;
    const velocityParent = {
      closest: jest.fn(() => null),
      createDiv: jest.fn(() => velocityChild),
    } as unknown as HTMLElement;
    const controller = { app: {}, config: {}, data: {} } as never;

    createSprintBasesViewRegistration(() => settings).factory(controller, boardParent);
    createSprintVelocityViewRegistration(() => settings).factory(controller, velocityParent);

    expect((boardParent as unknown as { createDiv: jest.Mock }).createDiv)
      .toHaveBeenCalledWith({ cls: 'sprint-bases-view' });
    expect((velocityParent as unknown as { createDiv: jest.Mock }).createDiv)
      .toHaveBeenCalledWith({ cls: 'sprint-velocity-view' });
  });

  it('escalates estimate warning tones at the configured defaults', () => {
    expect([1, 2].map(getEstimateTone)).toEqual(['low', 'low']);
    expect([3, 4].map(getEstimateTone)).toEqual(['medium', 'medium']);
    expect([5, 6].map(getEstimateTone)).toEqual(['high', 'high']);
    expect([7, 13].map(getEstimateTone)).toEqual(['critical', 'critical']);
  });

  it.each([
    ['Not started', false, false],
    ['In progress', true, false],
    ['Done', false, true],
  ] as const)('maps the %s board column to task frontmatter', (state, inProgress, done) => {
    const frontmatter: Record<string, unknown> = {
      'in progress': !inProgress,
      'is done': !done,
      estimate: 3,
    };

    applyTaskBoardState(frontmatter, state);

    expect(frontmatter).toEqual({
      'in progress': inProgress,
      'is done': done,
      estimate: 3,
    });
  });

  it.each([
    [{ project: ['[[Projects/Research project]]'] }, 'Research project'],
    [{ project: '[[Projects/Internal|Internal tools]]' }, 'Internal tools'],
    [{ project: [] }, 'No project'],
    [{}, 'No project'],
  ])('resolves task project swimlanes', (frontmatter, expected) => {
    expect(getTaskProjectGroup(frontmatter)).toBe(expected);
  });

  it('keeps zero-point sprints in the recent Velocity series', () => {
    const points = selectRecentVelocityPoints([
      { label: 'Sprint 2', value: 0, sprintNumber: 2, startDate: '2026-08-24' },
      { label: 'Sprint 1', value: 3, sprintNumber: 1, startDate: '2026-08-17' },
    ]);

    expect(points).toEqual([
      expect.objectContaining({ label: 'Sprint 1', value: 3 }),
      expect.objectContaining({ label: 'Sprint 2', value: 0 }),
    ]);
  });
});
