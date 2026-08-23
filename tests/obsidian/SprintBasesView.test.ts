import { normalizeSprintSettings } from '@/domain/SprintSettings';
import {
  applyTaskBoardState,
  createSprintBasesViewRegistration,
  createSprintVelocityViewRegistration,
  getEstimateTone,
  getSprintBasesOptions,
} from '@/obsidian/SprintBasesView';

describe('SprintBasesView', () => {
  it('offers profile and per-view display options stored by Obsidian Bases', () => {
    const settings = normalizeSprintSettings({ rootFolder: 'Agile PM' });

    expect(getSprintBasesOptions(settings)).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'sprintProfile', type: 'dropdown' }),
      expect.objectContaining({ key: 'layout', type: 'dropdown' }),
      expect.objectContaining({ key: 'showCompleted', type: 'toggle' }),
    ]));
    expect(getSprintBasesOptions(settings)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'layout',
        options: expect.objectContaining({ kanban: 'Kanban' }),
      }),
    ]));
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
});
