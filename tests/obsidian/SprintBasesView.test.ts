import { normalizeSprintSettings } from '@/domain/SprintSettings';
import {
  applyTaskSprintAssignment,
  applyTaskBoardState,
  applyNewTaskFrontmatter,
  createSprintBasesViewRegistration,
  createSprintVelocityViewRegistration,
  formatTaskCardProperty,
  getCardTaskProperties,
  getEstimateTone,
  getEditableTaskProperties,
  getNewTaskSprintScope,
  getSprintBasesOptions,
  getTaskProjectGroup,
  groupPlannerTasksByProject,
  openProjectNote,
  parseTaskPropertyValue,
  resolveTaskPropertyType,
  selectRecentVelocityPoints,
  taskReferencesSprint,
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
        options: expect.objectContaining({ kanban: 'Kanban', planner: 'Sprint planner' }),
      }),
    ]));
  });

  it('uses the native Properties order for editable new-task fields', () => {
    expect(getEditableTaskProperties([
      'file.name',
      'formula.task_state',
      'note.due',
      'note.project',
      'note.sprint',
      'note.estimate',
      'note.archived',
      'note.custom field',
    ], ['note.priority'])).toEqual([
      'due',
      'sprint',
      'estimate',
      'custom field',
    ]);
    expect(getEditableTaskProperties(
      ['note.estimate', 'note.sprint', 'note.due'],
      undefined,
      'current',
    )).toEqual(['estimate', 'due']);
    expect(getEditableTaskProperties(undefined, ['note.priority', 'note.due']))
      .toEqual(['priority', 'due']);
    expect(getEditableTaskProperties(undefined)).toEqual(['estimate', 'due']);
  });

  it('resolves registered Obsidian property types and safely falls back to text', () => {
    expect(resolveTaskPropertyType('estimate', 'text')).toBe('number');
    expect(resolveTaskPropertyType('custom date', 'date')).toBe('date');
    expect(resolveTaskPropertyType('custom datetime', 'datetime')).toBe('datetime');
    expect(resolveTaskPropertyType('custom toggle', 'checkbox')).toBe('checkbox');
    expect(resolveTaskPropertyType('custom list', 'multitext')).toBe('list');
    expect(resolveTaskPropertyType('custom tags', 'tags')).toBe('tags');
    expect(resolveTaskPropertyType('custom link', 'link')).toBe('link');
    expect(resolveTaskPropertyType('unknown custom property', 'unsupported')).toBe('text');
  });

  it.each([
    ['text', 'Read chapter', 'Read chapter'],
    ['number', '3.5', 3.5],
    ['checkbox', true, true],
    ['date', '2026-09-04', '2026-09-04'],
    ['datetime', '2026-09-04T09:30', '2026-09-04T09:30'],
    ['list', 'research, write\nsubmit', ['research', 'write', 'submit']],
    ['tags', 'class, urgent', ['class', 'urgent']],
    ['link', 'Sprint 2', ['[[Sprint 2]]']],
  ] as const)('serializes %s form values for frontmatter', (type, input, expected) => {
    expect(parseTaskPropertyValue(type, input)).toEqual(expected);
  });

  it('uses no sprint by default on the full board and scopes Current/Next boards', () => {
    expect(getNewTaskSprintScope(undefined)).toBeNull();
    expect(getNewTaskSprintScope('current')).toBe('current');
    expect(getNewTaskSprintScope('next')).toBe('next');
  });

  it('reassigns only the sprint list for Sprint Planner moves', () => {
    const frontmatter: Record<string, unknown> = {
      project: ['[[Sprint/Projects/Research]]'],
      sprint: ['[[Sprint/Sprints/Sprint 1]]'],
      'in progress': true,
      'is done': false,
    };

    applyTaskSprintAssignment(frontmatter, 'Sprint/Sprints/Sprint 2');
    expect(frontmatter).toEqual({
      project: ['[[Sprint/Projects/Research]]'],
      sprint: ['[[Sprint/Sprints/Sprint 2]]'],
      'in progress': true,
      'is done': false,
    });

    applyTaskSprintAssignment(frontmatter, null);
    expect(frontmatter.sprint).toEqual([]);
  });

  it('matches planner sprint assignments by full path or sprint basename', () => {
    expect(taskReferencesSprint(
      ['[[Sprint/Sprints/Sprint 2]]'],
      'Sprint/Sprints/Sprint 2',
    )).toBe(true);
    expect(taskReferencesSprint(['[[Sprint 2]]'], 'Sprint/Sprints/Sprint 2')).toBe(true);
    expect(taskReferencesSprint(['[[Sprint 3]]'], 'Sprint/Sprints/Sprint 2')).toBe(false);
  });

  it('groups planner tasks by project with unassigned work last', () => {
    const grouped = groupPlannerTasksByProject(
      [
        { name: 'Write abstract', project: 'Conference' },
        { name: 'Read paper', project: 'Research' },
        { name: 'Backlog note', project: 'No project' },
        { name: 'Book venue', project: 'Conference' },
      ],
      (task) => task.project,
      (task) => task.name,
    );

    expect(grouped).toEqual([
      {
        project: 'Conference',
        tasks: [
          { name: 'Book venue', project: 'Conference' },
          { name: 'Write abstract', project: 'Conference' },
        ],
      },
      { project: 'Research', tasks: [{ name: 'Read paper', project: 'Research' }] },
      { project: 'No project', tasks: [{ name: 'Backlog note', project: 'No project' }] },
    ]);
  });

  it('uses the native Properties order for task-card metadata', () => {
    expect(getCardTaskProperties(
      ['file.name', 'note.due', 'note.estimate', 'formula.task_state'],
      ['note.sprint'],
    )).toEqual(['note.due', 'note.estimate']);
    expect(getCardTaskProperties(undefined, ['note.estimate', 'note.sprint']))
      .toEqual(['note.estimate', 'note.sprint']);
    expect(getCardTaskProperties(['file.name'], ['note.estimate'])).toEqual([]);
  });

  it('renders Due values as date-only YYYY/MM/DD labels', () => {
    expect(formatTaskCardProperty('due', '2026-08-31T14:00:00')).toBe('2026/08/31');
    expect(formatTaskCardProperty('due', '2026-09-04')).toBe('2026/09/04');
    expect(formatTaskCardProperty('project', '[[Projects/Research]]')).toBe('Research');
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

  it('keeps an explicitly selected sprint on the full Sprint board', () => {
    const frontmatter: Record<string, unknown> = {};

    applyNewTaskFrontmatter(
      frontmatter,
      'Not started',
      'Sprint/Projects/Research',
      null,
      { sprint: ['[[Sprint/Sprints/Sprint 3]]'], estimate: 2 },
    );

    expect(frontmatter.sprint).toEqual(['[[Sprint/Sprints/Sprint 3]]']);
  });

  it.each([
    ['current', 'Sprint/Sprints/Sprint 1'],
    ['next', 'Sprint/Sprints/Sprint 2'],
  ] as const)('makes the %s board sprint assignment take precedence', (_scope, sprint) => {
    const frontmatter: Record<string, unknown> = {};

    applyNewTaskFrontmatter(
      frontmatter,
      'Not started',
      null,
      sprint,
      { sprint: ['[[Sprint/Sprints/Incorrect sprint]]'] },
    );

    expect(frontmatter.sprint).toEqual([`[[${sprint}]]`]);
  });

  it('adds a blank Due date to new tasks when one is not entered', () => {
    const frontmatter: Record<string, unknown> = {};

    applyNewTaskFrontmatter(frontmatter, 'Not started', null, null, { estimate: 2 });

    expect(frontmatter).toEqual(expect.objectContaining({ due: null }));
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

  it('opens a Kanban project note at its exact vault path', () => {
    const openLinkText = jest.fn();
    const app = { workspace: { openLinkText } };
    const file = { path: 'Sprint/Projects/Research project.md' };

    openProjectNote(app as never, file as never);

    expect(openLinkText).toHaveBeenCalledWith(file.path, '', false);
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
