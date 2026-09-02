import type {
  App,
  BasesAllOptions,
  BasesEntry,
  BasesPropertyId,
  BasesViewRegistration,
  QueryController,
  TAbstractFile,
  TFile,
} from 'obsidian';
import { BasesView, normalizePath, Notice, setIcon } from 'obsidian';

import type { SprintSettings } from '../domain/types';

export const SPRINT_BASES_VIEW_TYPE = 'sprint-agent-sprint-board';
export const SPRINT_VELOCITY_VIEW_TYPE = 'sprint-agent-velocity-chart';
const TASK_DRAG_TYPE = 'application/x-sprint-task-path';

function markdownFilesInFolder(app: App, folder: string): TFile[] {
  const target = app.vault.getFolderByPath(normalizePath(folder));
  if (!target) return [];
  return target.children.filter((child: TAbstractFile): child is TFile => (
    'extension' in child && child.extension === 'md'
  ));
}

function getFrontmatterProperty(frontmatter: unknown, property: string): unknown {
  if (typeof frontmatter !== 'object' || frontmatter === null) return undefined;
  return (frontmatter as Record<string, unknown>)[property];
}

export type TaskBoardState = 'Not started' | 'In progress' | 'Done';
const TASK_STATES: TaskBoardState[] = ['Not started', 'In progress', 'Done'];

export function applyTaskBoardState(
  frontmatter: Record<string, unknown>,
  state: TaskBoardState,
): void {
  frontmatter['in progress'] = state === 'In progress';
  frontmatter['is done'] = state === 'Done';
}

export function applyNewTaskFrontmatter(
  frontmatter: Record<string, unknown>,
  state: TaskBoardState,
  projectTarget: string | null,
  sprintTarget: string | null,
  properties: Record<string, unknown>,
): void {
  applyTaskBoardState(frontmatter, state);
  if (frontmatter.archived === undefined) frontmatter.archived = false;
  if (frontmatter.due === undefined && properties.due === undefined) frontmatter.due = null;
  if (projectTarget) frontmatter.project = [`[[${projectTarget}]]`];
  Object.assign(frontmatter, properties);
  // Scoped boards own sprint assignment, even when a legacy form setting exists.
  if (sprintTarget) frontmatter.sprint = [`[[${sprintTarget}]]`];
}

export function getTaskProjectGroup(
  frontmatter: Record<string, unknown> | undefined,
): string {
  const rawProject = frontmatter?.project;
  const values = Array.isArray(rawProject) ? rawProject : [rawProject];
  const project = values.find((value): value is string => (
    typeof value === 'string' && value.trim().length > 0
  ));
  if (!project) return 'No project';

  const normalized = project.trim().replace(/^\[\[/, '').replace(/\]\]$/, '');
  const [target = '', alias] = normalized.split('|');
  return alias?.trim() || target.split('/').at(-1)?.trim() || 'No project';
}

export function groupPlannerTasksByProject<T>(
  tasks: readonly T[],
  getProject: (task: T) => string,
  getName: (task: T) => string,
): Array<{ project: string; tasks: T[] }> {
  const grouped = new Map<string, T[]>();
  for (const task of tasks) {
    const project = getProject(task) || 'No project';
    const projectTasks = grouped.get(project) ?? [];
    projectTasks.push(task);
    grouped.set(project, projectTasks);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => {
      if (left === 'No project') return 1;
      if (right === 'No project') return -1;
      return left.localeCompare(right);
    })
    .map(([project, projectTasks]) => ({
      project,
      tasks: projectTasks.sort((left, right) => getName(left).localeCompare(getName(right))),
    }));
}

export function openProjectNote(app: App, file: TFile): void {
  void app.workspace.openLinkText(file.path, '', false);
}

export function getSprintBasesOptions(
  settings: SprintSettings,
): BasesAllOptions[] {
  const profiles = Object.fromEntries(
    settings.profiles.map((profile) => [profile.id, profile.name]),
  );
  if (Object.keys(profiles).length === 0) profiles.none = 'No Sprint workspace';

  return [
    {
      key: 'sprintProfile',
      type: 'dropdown',
      displayName: 'Sprint workspace',
      default: settings.profiles[0]?.id ?? 'none',
      options: profiles,
    },
    {
      key: 'layout',
      type: 'dropdown',
      displayName: 'Layout',
      default: 'board',
      options: { board: 'Board', list: 'List', kanban: 'Kanban', planner: 'Sprint planner' },
    },
    {
      key: 'showCompleted',
      type: 'toggle',
      displayName: 'Show completed tasks',
      default: true,
    },
  ];
}

function isCardTaskProperty(property: BasesPropertyId): boolean {
  return property.startsWith('note.') && ![
    'note.in progress',
    'note.is done',
    'note.archived',
  ].includes(property);
}

export function getCardTaskProperties(
  order: unknown,
  legacyProperties: unknown,
): BasesPropertyId[] {
  const source = Array.isArray(order) ? order : legacyProperties;
  if (!Array.isArray(source)) return [];
  return [...new Set(source.filter((property): property is BasesPropertyId => (
    typeof property === 'string' && isCardTaskProperty(property as BasesPropertyId)
  )))];
}

const TASK_FORM_EXCLUDED_PROPERTIES = new Set([
  'project',
  'in progress',
  'is done',
  'archived',
]);

export type TaskPropertyType = 'text' | 'number' | 'checkbox' | 'date' | 'datetime' | 'list' | 'tags' | 'link';

const DEFAULT_TASK_PROPERTY_TYPES: Record<string, TaskPropertyType> = {
  estimate: 'number',
  priority: 'number',
  due: 'date',
  'due date': 'date',
  archived: 'checkbox',
  'in progress': 'checkbox',
  'is done': 'checkbox',
  project: 'link',
  sprint: 'link',
};

export function getEditableTaskProperties(
  order: unknown,
  legacyProperties?: unknown,
  sprintScope?: unknown,
): string[] {
  const source = Array.isArray(order) ? order : legacyProperties;
  if (!Array.isArray(source)) return ['estimate', 'due'];
  const scoped = sprintScope === 'current' || sprintScope === 'next';
  return [...new Set(source
    .filter((entry): entry is string => typeof entry === 'string' && entry.startsWith('note.'))
    .map((entry) => entry.trim().replace(/^note\./, ''))
    .filter((entry) => entry.length > 0 && !TASK_FORM_EXCLUDED_PROPERTIES.has(entry))
    .filter((entry) => !scoped || entry !== 'sprint'))];
}

export function resolveTaskPropertyType(
  property: string,
  registeredType: unknown,
): TaskPropertyType {
  if (property in DEFAULT_TASK_PROPERTY_TYPES) return DEFAULT_TASK_PROPERTY_TYPES[property]!;
  switch (registeredType) {
    case 'number': return 'number';
    case 'checkbox': return 'checkbox';
    case 'date': return 'date';
    case 'datetime': return 'datetime';
    case 'multitext':
    case 'list': return 'list';
    case 'tags': return 'tags';
    case 'link': return 'link';
    default: return 'text';
  }
}

export function parseTaskPropertyValue(
  type: TaskPropertyType,
  value: string | boolean,
): unknown {
  if (type === 'checkbox') return value === true;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (type === 'number') {
    const number = Number(trimmed);
    return Number.isFinite(number) ? number : undefined;
  }
  if (type === 'list' || type === 'tags') {
    const values = trimmed.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);
    return values.length > 0 ? values : undefined;
  }
  if (type === 'link') return [`[[${trimmed.replace(/^\[\[|\]\]$/g, '')}]]`];
  return trimmed;
}

export function getNewTaskSprintScope(configuredScope: unknown): 'current' | 'next' | null {
  return configuredScope === 'current' || configuredScope === 'next' ? configuredScope : null;
}

export function applyTaskSprintAssignment(
  frontmatter: Record<string, unknown>,
  sprintTarget: string | null,
): void {
  frontmatter.sprint = sprintTarget ? [`[[${sprintTarget}]]`] : [];
}

export function taskReferencesSprint(value: unknown, sprintTarget: string): boolean {
  const sprintName = sprintTarget.split('/').at(-1) ?? sprintTarget;
  return sprintReferences(value, sprintTarget) || sprintReferences(value, sprintName);
}

type NewTaskPropertyInput = {
  type: TaskPropertyType;
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
};

function sprintReferences(value: unknown, sprintName: string): boolean {
  const values = Array.isArray(value) ? value : [value];
  return values.some((entry) => {
    if (typeof entry !== 'string') return false;
    const normalized = entry.trim().replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0] ?? '';
    return normalized === sprintName || normalized.endsWith(`/${sprintName}`);
  });
}

function isDone(frontmatter: Record<string, unknown> | undefined): boolean {
  return frontmatter?.['is done'] === true;
}

function taskState(frontmatter: Record<string, unknown> | undefined): TaskBoardState {
  if (isDone(frontmatter)) return 'Done';
  if (frontmatter?.['in progress'] === true) return 'In progress';
  return 'Not started';
}

function estimate(frontmatter: Record<string, unknown> | undefined): number {
  const value = frontmatter?.estimate;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getEstimateTone(points: number): 'low' | 'medium' | 'high' | 'critical' {
  if (points >= 7) return 'critical';
  if (points >= 5) return 'high';
  if (points >= 3) return 'medium';
  return 'low';
}

export function formatTaskCardProperty(property: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatTaskCardProperty(property, entry))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (property === 'due' || property === 'due date') {
      const date = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(normalized);
      if (date) return `${date[1]}/${date[2]}/${date[3]}`;
    }
    const link = normalized.replace(/^\[\[/, '').replace(/\]\]$/, '');
    const [target = '', alias] = link.split('|');
    return alias?.trim() || target.split('/').at(-1)?.trim() || '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

class SprintBasesView extends BasesView {
  readonly type = SPRINT_BASES_VIEW_TYPE;
  private readonly containerEl: HTMLElement;
  private draggedTaskPath: string | null = null;
  private draggedTaskEl: HTMLElement | null = null;
  private draggedProjectGroup: string | null = null;
  private readonly collapsedProjects = new Set<string>();

  constructor(
    controller: QueryController,
    parentEl: HTMLElement,
    private readonly getSettings: () => SprintSettings,
  ) {
    super(controller);
    this.containerEl = parentEl.createDiv({ cls: 'sprint-bases-view' });
  }

  onDataUpdated(): void {
    this.containerEl.empty();

    const configuredProfile = this.config.get('sprintProfile');
    const profileId = typeof configuredProfile === 'string'
      ? configuredProfile
      : (this.getSettings().profiles[0]?.id ?? '');
    const profile = this.getSettings().profiles.find(({ id }) => id === profileId);
    const header = this.containerEl.createDiv({ cls: 'sprint-bases-header' });
    header.createEl('h3', { text: this.config.name });
    header.createSpan({
      cls: 'sprint-bases-profile',
      text: profile?.name ?? 'Unassigned workspace',
    });

    const configuredLayout = this.config.get('layout');
    const layout = configuredLayout === 'list'
      || configuredLayout === 'kanban'
      || configuredLayout === 'planner'
      ? configuredLayout
      : 'board';
    const content = this.containerEl.createDiv({
      cls: `sprint-bases-content sprint-bases-${layout}`,
    });
    const showCompleted = this.config.get('showCompleted') !== false;
    if (this.config.get('itemType') === 'sprint') {
      this.renderSprintOverview(content, profile?.rootFolder ?? '');
      return;
    }
    if (layout === 'kanban') {
      this.renderKanban(content, showCompleted, profile);
      return;
    }
    if (layout === 'planner') {
      this.renderSprintPlanner(content, showCompleted, profile);
      return;
    }

    let renderedEntries = 0;
    for (const group of this.data.groupedData) {
      const visibleEntries = group.entries.filter((entry) => {
        if (showCompleted) return true;
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        return !isDone(frontmatter);
      });
      if (visibleEntries.length === 0) continue;
      renderedEntries += visibleEntries.length;
      const section = content.createDiv({ cls: 'sprint-bases-group' });
      section.createEl('h4', { text: group.hasKey() ? group.key?.toString() : 'Items' });
      const entries = section.createDiv({ cls: 'sprint-bases-entries' });
      for (const entry of visibleEntries) {
        const link = entries.createEl('button', {
          cls: 'sprint-bases-entry',
          attr: { type: 'button' },
        });
        link.createSpan({ cls: 'sprint-bases-entry-title', text: entry.file.basename });
        link.addEventListener('click', () => {
          void this.app.workspace.openLinkText(entry.file.path, '', false);
        });
      }
    }
    if (renderedEntries === 0) {
      content.createDiv({ cls: 'sprint-bases-empty', text: 'No tasks match this view.' });
    }
  }

  private renderKanban(
    content: HTMLElement,
    showCompleted: boolean,
    profile: SprintSettings['profiles'][number] | undefined,
  ): void {
    const projects = new Map<string, Map<TaskBoardState, BasesEntry[]>>();
    const projectTargets = new Map<string, string>();
    const projectFileByGroup = new Map<string, TFile>();
    const projectFiles = profile?.rootFolder
      ? this.filesIn(`${profile.rootFolder.replace(/^\/+|\/+$/g, '')}/Projects`)
      : [];
    const projectFileByName = new Map(projectFiles.map((file) => [file.basename, file]));
    const scoped = this.config.get('sprintScope') === 'current'
      || this.config.get('sprintScope') === 'next';
    const isActiveProject = (file: TFile): boolean => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      return frontmatter?.['in progress'] === true && frontmatter?.['is done'] !== true;
    };
    const findProjectFile = (frontmatter: Record<string, unknown> | undefined): TFile | null => {
      const target = this.getReferenceTarget(frontmatter?.project);
      if (!target) return null;
      const direct = this.app.vault.getFileByPath(`${target}.md`);
      return direct ?? projectFileByName.get(target.split('/').at(-1) ?? '') ?? null;
    };
    const seen = new Set<string>();
    for (const group of this.data.groupedData) {
      for (const entry of group.entries) {
        if (seen.has(entry.file.path)) continue;
        seen.add(entry.file.path);
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        if (frontmatter?.archived === true) continue;
        if (!showCompleted && isDone(frontmatter)) continue;
        const projectFile = findProjectFile(frontmatter);
        if (scoped && projectFile && !isActiveProject(projectFile)) continue;
        const project = getTaskProjectGroup(frontmatter);
        if (projectFile) projectFileByGroup.set(project, projectFile);
        const projectTarget = this.getReferenceTarget(frontmatter?.project);
        if (projectTarget) projectTargets.set(project, projectTarget);
        const columns = projects.get(project) ?? new Map(
          TASK_STATES.map((state) => [state, [] as BasesEntry[]]),
        );
        columns.get(taskState(frontmatter))?.push(entry);
        projects.set(project, columns);
      }
    }

    if (profile?.rootFolder) {
      for (const projectFile of projectFiles) {
        if (scoped && !isActiveProject(projectFile)) continue;
        if (!projects.has(projectFile.basename)) {
          projects.set(projectFile.basename, new Map(
            TASK_STATES.map((state) => [state, [] as BasesEntry[]]),
          ));
        }
        projectTargets.set(projectFile.basename, projectFile.path.replace(/\.md$/, ''));
        projectFileByGroup.set(projectFile.basename, projectFile);
      }
    }
    if (!projects.has('No project')) {
      projects.set('No project', new Map(
        TASK_STATES.map((state) => [state, [] as BasesEntry[]]),
      ));
    }

    const sortedProjects = [...projects.entries()].sort(([left], [right]) => {
      if (left === 'No project') return 1;
      if (right === 'No project') return -1;
      return left.localeCompare(right);
    });
    const visibleProjects: typeof sortedProjects = [];
    const hiddenProjects: typeof sortedProjects = [];
    for (const item of sortedProjects) {
      const [project] = item;
      const projectFile = projectFileByGroup.get(project);
      const hidden = projectFile
        ? this.app.metadataCache.getFileCache(projectFile)?.frontmatter?.hidden === true
        : false;
      (hidden ? hiddenProjects : visibleProjects).push(item);
    }

    const renderProject = (
      parent: HTMLElement,
      project: string,
      columns: Map<TaskBoardState, BasesEntry[]>,
      hidden: boolean,
    ): void => {
      const projectSection = parent.createEl('details', { cls: 'sprint-bases-project' });
      projectSection.open = !this.collapsedProjects.has(project);
      projectSection.addEventListener('toggle', () => {
        if (projectSection.open) this.collapsedProjects.delete(project);
        else this.collapsedProjects.add(project);
      });
      const projectHeader = projectSection.createEl('summary', { cls: 'sprint-bases-project-header' });
      projectHeader.createSpan({ cls: 'sprint-bases-project-title', text: project });
      const projectFile = projectFileByGroup.get(project);
      if (projectFile) {
        const projectLink = projectHeader.createEl('button', {
          cls: 'sprint-bases-project-link clickable-icon',
          attr: {
            type: 'button',
            'aria-label': `Open project ${project}`,
            title: `Open project ${project}`,
          },
        });
        setIcon(projectLink, 'external-link');
        projectLink.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          openProjectNote(this.app, projectFile);
        });
      }
      projectHeader.createSpan({
        cls: 'sprint-bases-project-count',
        text: String([...columns.values()].reduce((total, entries) => total + entries.length, 0)),
      });
      if (projectFile) {
        const visibility = projectHeader.createEl('button', {
          cls: 'sprint-bases-project-visibility clickable-icon',
          attr: {
            type: 'button',
            'aria-label': hidden ? 'Show project' : 'Hide project',
            title: hidden ? 'Show project' : 'Hide project',
          },
        });
        setIcon(visibility, hidden ? 'eye' : 'eye-off');
        visibility.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          void this.setProjectHidden(projectFile, !hidden);
        });
      }
      const board = projectSection.createDiv({ cls: 'sprint-bases-project-board' });
      for (const state of TASK_STATES) {
        const section = board.createDiv({
          cls: 'sprint-bases-group',
          attr: { 'data-task-state': state, 'data-project-group': project },
        });
        section.createEl('h5', { text: state });
        const entries = section.createDiv({ cls: 'sprint-bases-entries' });
        this.registerDropTarget(section, entries, state, project);
        const stateEntries = columns.get(state) ?? [];
        if (stateEntries.length === 0) {
          entries.createDiv({ cls: 'sprint-bases-empty', text: 'No tasks' });
        }
        for (const entry of stateEntries) {
          this.renderTaskCard(entries, entry, project);
        }
        this.renderNewTaskControl(
          entries,
          state,
          project,
          projectTargets.get(project) ?? null,
          profile,
        );
      }
    };

    for (const [project, columns] of visibleProjects) {
      renderProject(content, project, columns, false);
    }
    if (hiddenProjects.length > 0) {
      const hiddenSection = content.createEl('details', { cls: 'sprint-bases-hidden-projects' });
      hiddenSection.createEl('summary', {
        cls: 'sprint-bases-hidden-header',
        text: `Hidden (${hiddenProjects.length})`,
      });
      const hiddenContent = hiddenSection.createDiv({ cls: 'sprint-bases-hidden-content' });
      for (const [project, columns] of hiddenProjects) {
        renderProject(hiddenContent, project, columns, true);
      }
    }
  }

  private renderSprintPlanner(
    content: HTMLElement,
    showCompleted: boolean,
    profile: SprintSettings['profiles'][number] | undefined,
  ): void {
    if (!profile?.rootFolder) {
      content.createDiv({ cls: 'sprint-bases-empty', text: 'No Sprint workspace is configured.' });
      return;
    }

    const root = profile.rootFolder.replace(/^\/+|\/+$/g, '');
    const sprints = this.filesIn(`${root}/Sprints`)
      .map((file) => {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        return {
          file,
          target: file.path.replace(/\.md$/, ''),
          startDate: String(frontmatter?.['start date'] ?? ''),
          sprintNumber: typeof frontmatter?.['sprint number'] === 'number'
            ? frontmatter['sprint number']
            : Number.POSITIVE_INFINITY,
          status: typeof frontmatter?.['sprint status'] === 'string'
            ? frontmatter['sprint status']
            : '',
        };
      })
      .sort((left, right) => (
        left.startDate.localeCompare(right.startDate)
        || left.sprintNumber - right.sprintNumber
        || left.file.basename.localeCompare(right.file.basename)
      ));
    const columns: Array<{ name: string; target: string | null; status: string }> = [
      { name: 'Backlog', target: null, status: '' },
      ...sprints.map((sprint) => ({
        name: sprint.file.basename,
        target: sprint.target,
        status: sprint.status,
      })),
    ];
    const entriesByTarget = new Map<string | null, BasesEntry[]>(
      columns.map(({ target }) => [target, []]),
    );
    const seen = new Set<string>();
    for (const group of this.data.groupedData) {
      for (const entry of group.entries) {
        if (seen.has(entry.file.path)) continue;
        seen.add(entry.file.path);
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        if (frontmatter?.archived === true) continue;
        if (!showCompleted && isDone(frontmatter)) continue;
        const sprint = sprints.find(({ target }) => taskReferencesSprint(frontmatter?.sprint, target));
        entriesByTarget.get(sprint?.target ?? null)?.push(entry);
      }
    }

    const board = content.createDiv({ cls: 'sprint-planner-board' });
    for (const column of columns) {
      const section = board.createDiv({
        cls: 'sprint-planner-column',
        attr: { 'data-sprint-target': column.target ?? '' },
      });
      const header = section.createDiv({ cls: 'sprint-planner-column-header' });
      const heading = header.createDiv({ cls: 'sprint-planner-column-heading' });
      heading.createEl('h4', { text: column.name });
      if (column.status) {
        heading.createSpan({ cls: 'sprint-planner-status', text: column.status });
      }
      header.createDiv({ cls: 'sprint-planner-column-metrics' });
      const entries = section.createDiv({ cls: 'sprint-planner-entries' });
      this.registerPlannerDropTarget(section, entries, column.target);
      const columnEntries = entriesByTarget.get(column.target) ?? [];
      const projectGroups = groupPlannerTasksByProject(
        columnEntries,
        (entry) => getTaskProjectGroup(
          this.app.metadataCache.getFileCache(entry.file)?.frontmatter,
        ),
        (entry) => entry.file.basename,
      );
      for (const projectGroup of projectGroups) {
        const projectEntries = this.createPlannerProjectGroup(entries, projectGroup.project);
        for (const entry of projectGroup.tasks) {
          this.renderPlannerTaskCard(projectEntries, entry, column.target, columns);
        }
      }
      this.ensurePlannerColumnEmptyState(entries);
      this.updatePlannerColumnMetrics(section);
    }
  }

  private renderPlannerTaskCard(
    entries: HTMLElement,
    entry: BasesEntry,
    currentTarget: string | null,
    columns: Array<{ name: string; target: string | null }>,
  ): void {
    const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
    const points = estimate(frontmatter);
    const card = entries.createDiv({
      cls: 'sprint-planner-card',
      attr: {
        draggable: 'true',
        'data-task-path': entry.file.path,
        'data-estimate': String(points),
        'data-done': String(isDone(frontmatter)),
        'data-project-group': getTaskProjectGroup(frontmatter),
        'aria-label': `${entry.file.basename}. Drag or use the Sprint selector to reassign.`,
      },
    });
    const title = card.createEl('button', {
      cls: 'sprint-planner-card-title',
      text: entry.file.basename,
      attr: { type: 'button' },
    });
    let dragged = false;
    title.addEventListener('click', (event) => {
      if (dragged) {
        event.preventDefault();
        return;
      }
      void this.app.workspace.openLinkText(entry.file.path, '', false);
    });

    const meta = card.createDiv({ cls: 'sprint-planner-card-meta' });
    meta.createSpan({
      cls: `sprint-planner-state sprint-planner-state-${taskState(frontmatter).toLowerCase().replace(' ', '-')}`,
      text: taskState(frontmatter),
    });
    const configuredProperties = getCardTaskProperties(this.config.getOrder(), []);
    for (const propertyId of configuredProperties) {
      const property = String(propertyId).replace(/^note\./, '');
      if (property === 'project' || property === 'sprint') continue;
      const value = getFrontmatterProperty(frontmatter, property);
      if (property === 'estimate') {
        if (points <= 0) continue;
        meta.createSpan({
          cls: `sprint-bases-entry-points sprint-bases-entry-points-${getEstimateTone(points)}`,
          text: `${points} pt`,
        });
        continue;
      }
      const displayValue = formatTaskCardProperty(property, value);
      if (!displayValue) continue;
      const badge = meta.createSpan({ cls: 'sprint-bases-entry-property' });
      if (property === 'due' || property === 'due date') {
        const icon = badge.createSpan({ cls: 'sprint-bases-entry-property-icon' });
        setIcon(icon, 'calendar-days');
        badge.createSpan({ text: displayValue });
      } else {
        badge.createSpan({ text: `${this.config.getDisplayName(propertyId)}: ${displayValue}` });
      }
    }

    const selector = card.createEl('select', {
      cls: 'sprint-planner-sprint-select',
      attr: { 'aria-label': `Sprint for ${entry.file.basename}`, draggable: 'false' },
    });
    for (const column of columns) {
      selector.createEl('option', { text: column.name, value: column.target ?? '' });
    }
    selector.value = currentTarget ?? '';
    selector.addEventListener('pointerdown', (event) => { event.stopPropagation(); });
    selector.addEventListener('change', () => {
      const target = selector.value || null;
      const targetEntries = this.findPlannerEntries(target);
      if (!targetEntries) return;
      void this.moveTaskToSprint(entry.file.path, target, targetEntries, card, selector);
    });

    card.addEventListener('dragstart', (event) => {
      if (event.target === selector) {
        event.preventDefault();
        return;
      }
      dragged = true;
      this.draggedTaskPath = entry.file.path;
      this.draggedTaskEl = card;
      this.draggedProjectGroup = null;
      card.classList.add('is-dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(TASK_DRAG_TYPE, entry.file.path);
        event.dataTransfer.setData('text/plain', entry.file.path);
      }
    });
    card.addEventListener('dragend', () => {
      this.clearDragState();
      card.ownerDocument.defaultView?.setTimeout(() => { dragged = false; }, 0);
    });
  }

  private registerPlannerDropTarget(
    section: HTMLElement,
    entries: HTMLElement,
    sprintTarget: string | null,
  ): void {
    section.addEventListener('dragover', (event) => {
      if (!this.draggedTaskPath) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      section.classList.add('is-drop-target');
    });
    section.addEventListener('dragleave', (event) => {
      const nextTarget = event.relatedTarget;
      const NodeConstructor = section.ownerDocument.defaultView?.Node;
      if (!NodeConstructor || !(nextTarget instanceof NodeConstructor) || !section.contains(nextTarget)) {
        section.classList.remove('is-drop-target');
      }
    });
    section.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      section.classList.remove('is-drop-target');
      const path = event.dataTransfer?.getData(TASK_DRAG_TYPE) || this.draggedTaskPath;
      if (!path) return;
      void this.moveTaskToSprint(path, sprintTarget, entries);
    });
  }

  private findPlannerEntries(sprintTarget: string | null): HTMLElement | null {
    const target = sprintTarget ?? '';
    const sections = this.containerEl.querySelectorAll<HTMLElement>('.sprint-planner-column');
    const section = [...sections].find((candidate) => candidate.dataset.sprintTarget === target);
    return section?.querySelector<HTMLElement>('.sprint-planner-entries') ?? null;
  }

  private createPlannerProjectGroup(entries: HTMLElement, project: string): HTMLElement {
    entries.querySelector('.sprint-bases-empty')?.remove();
    const group = entries.createDiv({
      cls: 'sprint-planner-project',
      attr: { 'data-project-group': project },
    });
    group.createEl('h5', { cls: 'sprint-planner-project-heading', text: project });
    return group.createDiv({ cls: 'sprint-planner-project-entries' });
  }

  private findOrCreatePlannerProjectEntries(entries: HTMLElement, project: string): HTMLElement {
    const groups = entries.querySelectorAll<HTMLElement>('.sprint-planner-project');
    const existing = [...groups].find((group) => group.dataset.projectGroup === project);
    return existing?.querySelector<HTMLElement>('.sprint-planner-project-entries')
      ?? this.createPlannerProjectGroup(entries, project);
  }

  private async moveTaskToSprint(
    path: string,
    sprintTarget: string | null,
    targetEntries: HTMLElement,
    selectedCard?: HTMLElement,
    selectedControl?: HTMLSelectElement,
  ): Promise<void> {
    const file = this.app.vault.getFileByPath(path);
    if (!file) {
      this.clearDragState();
      new Notice(`Unable to plan task: ${path} was not found.`);
      return;
    }
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const hasSprint = Array.isArray(frontmatter?.sprint)
      ? frontmatter.sprint.length > 0
      : typeof frontmatter?.sprint === 'string' && frontmatter.sprint.trim().length > 0;
    if ((sprintTarget && taskReferencesSprint(frontmatter?.sprint, sprintTarget)) || (!sprintTarget && !hasSprint)) {
      this.clearDragState();
      return;
    }

    const card = selectedCard ?? this.draggedTaskEl;
    const originalParent = card?.parentElement ?? null;
    const originalColumnEntries = originalParent?.closest<HTMLElement>('.sprint-planner-entries')
      ?? null;
    const originalNextSibling = card?.nextSibling ?? null;
    const originalTarget = originalParent?.closest<HTMLElement>('.sprint-planner-column')?.dataset.sprintTarget ?? '';
    const selector = selectedControl ?? card?.querySelector<HTMLSelectElement>('.sprint-planner-sprint-select');
    if (card) {
      const project = card.dataset.projectGroup || 'No project';
      const targetProjectEntries = this.findOrCreatePlannerProjectEntries(targetEntries, project);
      targetProjectEntries.append(card);
      card.classList.remove('is-dragging');
      card.classList.add('is-updating');
      card.setAttribute('aria-busy', 'true');
      if (selector) {
        selector.disabled = true;
        selector.value = sprintTarget ?? '';
      }
      this.updatePlannerColumnMetrics(originalParent?.closest<HTMLElement>('.sprint-planner-column') ?? null);
      this.updatePlannerColumnMetrics(targetEntries.closest<HTMLElement>('.sprint-planner-column'));
    }

    try {
      await this.app.fileManager.processFrontMatter(file, (properties) => {
        applyTaskSprintAssignment(properties as Record<string, unknown>, sprintTarget);
      });
      const originalProject = originalParent?.closest<HTMLElement>('.sprint-planner-project');
      if (originalProject && !originalProject.querySelector('.sprint-planner-card')) {
        originalProject.remove();
      }
      this.ensurePlannerColumnEmptyState(originalColumnEntries);
    } catch (error) {
      if (card && originalParent) {
        originalParent.querySelector('.sprint-bases-empty')?.remove();
        originalParent.insertBefore(card, originalNextSibling);
        const targetProject = [...targetEntries.querySelectorAll<HTMLElement>('.sprint-planner-project')]
          .find((group) => group.dataset.projectGroup === (card.dataset.projectGroup || 'No project'));
        if (targetProject && !targetProject.querySelector('.sprint-planner-card')) {
          targetProject.remove();
        }
        this.ensurePlannerColumnEmptyState(targetEntries);
        if (selector) selector.value = originalTarget;
        this.updatePlannerColumnMetrics(originalParent.closest<HTMLElement>('.sprint-planner-column'));
        this.updatePlannerColumnMetrics(targetEntries.closest<HTMLElement>('.sprint-planner-column'));
      }
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Unable to plan task: ${message}`);
    } finally {
      card?.classList.remove('is-updating');
      card?.removeAttribute('aria-busy');
      if (selector) selector.disabled = false;
      this.clearDragState();
    }
  }

  private ensurePlannerColumnEmptyState(entries: HTMLElement | null): void {
    if (!entries || entries.querySelector('.sprint-planner-card')) return;
    if (!entries.querySelector('.sprint-bases-empty')) {
      entries.createDiv({ cls: 'sprint-bases-empty', text: 'No tasks' });
    }
  }

  private updatePlannerColumnMetrics(section: HTMLElement | null): void {
    if (!section) return;
    const cards = [...section.querySelectorAll<HTMLElement>('.sprint-planner-card')];
    const points = cards.reduce((total, card) => total + Number(card.dataset.estimate ?? 0), 0);
    const completed = cards.filter((card) => card.dataset.done === 'true').length;
    const taskLabel = cards.length === 1 ? 'task' : 'tasks';
    const done = completed > 0 ? ` · ${completed} done` : '';
    const metrics = section.querySelector<HTMLElement>('.sprint-planner-column-metrics');
    if (metrics) metrics.setText(`${cards.length} ${taskLabel} · ${points} pt${done}`);
  }

  private async setProjectHidden(file: TFile, hidden: boolean): Promise<void> {
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        const properties = frontmatter as Record<string, unknown>;
        properties.hidden = hidden;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Unable to update project visibility: ${message}`);
    }
  }

  private renderNewTaskControl(
    entries: HTMLElement,
    state: TaskBoardState,
    project: string,
    projectTarget: string | null,
    profile: SprintSettings['profiles'][number] | undefined,
  ): void {
    if (!profile?.rootFolder) return;
    const button = entries.createEl('button', {
      cls: 'sprint-bases-new-task',
      attr: { type: 'button' },
    });
    const icon = button.createSpan({ cls: 'sprint-bases-new-task-icon' });
    setIcon(icon, 'plus');
    button.createSpan({ text: 'New task' });

    const form = entries.createEl('form', { cls: 'sprint-bases-new-task-form' });
    form.hidden = true;
    const nameInput = form.createEl('input', {
      cls: 'sprint-bases-new-task-name',
      attr: { type: 'text', placeholder: 'Task name', 'aria-label': 'Task name' },
    });
    const fields = form.createDiv({ cls: 'sprint-bases-new-task-fields' });
    let propertyInputs = new Map<string, NewTaskPropertyInput>();
    const legacyProperties = [1, 2, 3]
      .map((position) => this.config.getAsPropertyId(`newTaskProperty${position}`))
      .filter((property): property is BasesPropertyId => property !== null);
    const actions = form.createDiv({ cls: 'sprint-bases-new-task-actions' });
    const cancel = actions.createEl('button', { text: 'Cancel', attr: { type: 'button' } });
    const create = actions.createEl('button', {
      text: 'Create',
      cls: 'mod-cta',
      attr: { type: 'submit' },
    });

    const close = (): void => {
      form.reset();
      form.hidden = true;
      button.hidden = false;
      button.setAttribute('aria-expanded', 'false');
    };
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      button.hidden = true;
      form.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      nameInput.focus();
      create.disabled = true;
      void this.getTaskPropertyTypes().then((propertyTypes) => {
        if (form.hidden) return;
        const nativeOrder = this.config.getOrder();
        const properties = getEditableTaskProperties(
          nativeOrder.length > 0 ? nativeOrder : undefined,
          legacyProperties,
          this.config.get('sprintScope'),
        );
        propertyInputs = this.renderNewTaskFields(fields, properties, propertyTypes, profile.rootFolder);
        create.disabled = false;
      }).catch(() => {
        create.disabled = false;
      });
    });
    cancel.addEventListener('click', close);
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      create.disabled = true;
      void this.createTask(
        name,
        state,
        project === 'No project' ? null : projectTarget,
        profile.rootFolder,
        propertyInputs,
      ).then(() => close()).catch(() => undefined).finally(() => { create.disabled = false; });
    });
  }

  private async createTask(
    name: string,
    state: TaskBoardState,
    projectTarget: string | null,
    rootFolder: string,
    propertyInputs: Map<string, NewTaskPropertyInput>,
  ): Promise<void> {
    const folder = normalizePath(`${rootFolder}/Tasks`).replace(/^\/+/, '');
    const safeName = name.replace(/[\\/:*?"<>|]/g, '-').replace(/\.+$/g, '').trim();
    if (!safeName) {
      new Notice('Enter a valid task name.');
      throw new Error('Invalid task name');
    }
    let path = `${folder}/${safeName}.md`;
    let suffix = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = `${folder}/${safeName} ${suffix}.md`;
      suffix += 1;
    }

    let file: TFile | null = null;
    try {
      file = await this.app.vault.create(path, '');
      const sprint = this.getSprintForNewTask(rootFolder);
      const properties: Record<string, unknown> = {};
      for (const [property, field] of propertyInputs) {
        const rawValue = field.input instanceof HTMLInputElement && field.input.type === 'checkbox'
          ? field.input.checked
          : field.input.value;
        const value = parseTaskPropertyValue(field.type, rawValue);
        if (value !== undefined) properties[property] = value;
      }
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        applyNewTaskFrontmatter(
          frontmatter as Record<string, unknown>,
          state,
          projectTarget,
          sprint,
          properties,
        );
      });
      new Notice(`Task created: ${file.basename}`);
    } catch (error) {
      if (file) await this.app.fileManager.trashFile(file);
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Unable to create task: ${message}`);
      throw error;
    }
  }

  private getSprintForNewTask(rootFolder: string): string | null {
    const scope = getNewTaskSprintScope(this.config.get('sprintScope'));
    if (!scope) return null;
    const sprint = this.filesIn(`${rootFolder.replace(/^\/+|\/+$/g, '')}/Sprints`)
      .find((file) => this.app.metadataCache.getFileCache(file)?.frontmatter?.['sprint status'] === scope);
    return sprint?.path.replace(/\.md$/, '') ?? null;
  }

  private async getTaskPropertyTypes(): Promise<Record<string, unknown>> {
    const path = normalizePath(`${this.app.vault.configDir}/types.json`);
    try {
      if (!await this.app.vault.adapter.exists(path)) return {};
      const parsed: unknown = JSON.parse(await this.app.vault.adapter.read(path));
      if (typeof parsed !== 'object' || parsed === null) return {};
      const types = (parsed as Record<string, unknown>).types;
      return typeof types === 'object' && types !== null
        ? types as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }

  private renderNewTaskFields(
    container: HTMLElement,
    properties: string[],
    propertyTypes: Record<string, unknown>,
    rootFolder: string,
  ): Map<string, NewTaskPropertyInput> {
    container.empty();
    const inputs = new Map<string, NewTaskPropertyInput>();
    for (const property of properties) {
      const propertyId: `note.${string}` = `note.${property}`;
      const type = resolveTaskPropertyType(property, propertyTypes[property]);
      const field = container.createDiv({ cls: 'sprint-bases-new-task-field' });
      const fieldIcon = field.createSpan({ cls: 'sprint-bases-new-task-field-icon' });
      setIcon(fieldIcon, type === 'date' || type === 'datetime' ? 'calendar' : type === 'checkbox' ? 'check-square' : type === 'link' ? 'link' : 'circle-gauge');
      const label = this.config.getDisplayName(propertyId);
      let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (type === 'checkbox') {
        const checkboxLabel = field.createEl('label', { cls: 'sprint-bases-new-task-checkbox' });
        input = checkboxLabel.createEl('input', {
          attr: { type: 'checkbox', 'aria-label': label },
        });
        checkboxLabel.createSpan({ text: label });
      } else if (type === 'link' && property === 'sprint') {
        const select = field.createEl('select', { attr: { 'aria-label': label } });
        select.createEl('option', { text: 'No sprint', value: '' });
        for (const sprint of this.filesIn(`${rootFolder.replace(/^\/+|\/+$/g, '')}/Sprints`)) {
          select.createEl('option', {
            text: sprint.basename,
            value: sprint.path.replace(/\.md$/, ''),
          });
        }
        input = select;
      } else if (type === 'list' || type === 'tags') {
        input = field.createEl('textarea', {
          attr: {
            rows: '2',
            placeholder: type === 'tags' ? `${label} (comma separated)` : `${label} (comma separated)`,
            'aria-label': label,
          },
        });
      } else {
        input = field.createEl('input', {
          attr: {
            type: type === 'date' ? 'date' : type === 'datetime' ? 'datetime-local' : type === 'number' ? 'number' : 'text',
            placeholder: label,
            'aria-label': label,
            ...(type === 'number' ? { step: 'any' } : {}),
          },
        });
      }
      inputs.set(property, { type, input });
    }
    return inputs;
  }

  private getReferenceTarget(value: unknown): string | null {
    const values = Array.isArray(value) ? value : [value];
    const reference = values.find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
    if (!reference) return null;
    return reference.trim().replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0]?.trim() || null;
  }

  private renderSprintOverview(content: HTMLElement, rootFolder: string): void {
    const root = rootFolder.replace(/^\/+|\/+$/g, '');
    const tasks = this.filesIn(`${root}/Tasks`);
    let rendered = 0;
    for (const group of this.data.groupedData) {
      const section = content.createDiv({ cls: 'sprint-overview-group' });
      section.createEl('h4', { text: group.hasKey() ? group.key?.toString() : 'Sprints' });
      const cards = section.createDiv({ cls: 'sprint-overview-cards' });
      for (const entry of group.entries) {
        rendered += 1;
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        const sprintTasks = tasks.filter((task) => sprintReferences(
          this.app.metadataCache.getFileCache(task)?.frontmatter?.sprint,
          entry.file.basename,
        ));
        const completed = sprintTasks.filter((task) => isDone(
          this.app.metadataCache.getFileCache(task)?.frontmatter,
        ));
        const totalPoints = sprintTasks.reduce((sum, task) => (
          sum + estimate(this.app.metadataCache.getFileCache(task)?.frontmatter)
        ), 0);
        const completedPoints = completed.reduce((sum, task) => (
          sum + estimate(this.app.metadataCache.getFileCache(task)?.frontmatter)
        ), 0);
        const card = cards.createDiv({ cls: 'sprint-overview-card' });
        const title = card.createEl('button', {
          cls: 'sprint-overview-title',
          text: entry.file.basename,
          attr: { type: 'button' },
        });
        title.addEventListener('click', () => {
          void this.app.workspace.openLinkText(entry.file.path, '', false);
        });
        card.createDiv({
          cls: 'sprint-overview-dates',
          text: `${String(frontmatter?.['start date'] ?? 'Unknown')} to ${String(frontmatter?.['end date'] ?? 'Unknown')}`,
        });
        const metrics = card.createDiv({ cls: 'sprint-overview-metrics' });
        metrics.createSpan({ text: `${completed.length}/${sprintTasks.length} tasks` });
        metrics.createSpan({ text: `${completedPoints}/${totalPoints} pt` });
        const notes = card.createDiv({ cls: 'sprint-overview-notes' });
        notes.createSpan({
          cls: frontmatter?.review ? 'is-complete' : '',
          text: frontmatter?.review ? 'Review added' : 'No review',
        });
        notes.createSpan({
          cls: frontmatter?.retrospective ? 'is-complete' : '',
          text: frontmatter?.retrospective ? 'Retrospective added' : 'No retrospective',
        });
      }
    }
    if (rendered === 0) {
      content.createDiv({ cls: 'sprint-bases-empty', text: 'No sprints match this view.' });
    }
  }

  private filesIn(folder: string): TFile[] {
    return markdownFilesInFolder(this.app, folder);
  }

  private renderTaskCard(entries: HTMLElement, entry: BasesEntry, project: string): void {
    const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
    const link = entries.createEl('button', {
      cls: 'sprint-bases-entry',
      attr: {
        type: 'button',
        draggable: 'true',
        'data-task-path': entry.file.path,
        'aria-label': `${entry.file.basename}. Drag to change task state.`,
      },
    });
    link.createSpan({ cls: 'sprint-bases-entry-title', text: entry.file.basename });
    const legacyProperties = [1, 2, 3]
      .map((position) => this.config.getAsPropertyId(`cardProperty${position}`))
      .filter((property): property is BasesPropertyId => property !== null);
    const nativeOrder = this.config.getOrder();
    const configuredProperties = getCardTaskProperties(
      nativeOrder.length > 0 ? nativeOrder : undefined,
      legacyProperties,
    );
    const meta = link.createSpan({ cls: 'sprint-bases-entry-meta' });
    let renderedMetadata = false;
    for (const propertyId of configuredProperties) {
      const property = String(propertyId).replace(/^note\./, '');
      const value = getFrontmatterProperty(frontmatter, property);
      if (property === 'estimate') {
        const points = estimate(frontmatter);
        if (points <= 0) continue;
        meta.createSpan({
          cls: `sprint-bases-entry-points sprint-bases-entry-points-${getEstimateTone(points)}`,
          text: `${points} pt`,
        });
        renderedMetadata = true;
        continue;
      }
      const displayValue = formatTaskCardProperty(property, value);
      if (!displayValue) continue;
      const label = this.config.getDisplayName(propertyId);
      const badge = meta.createSpan({ cls: 'sprint-bases-entry-property' });
      if (property === 'due' || property === 'due date') {
        const icon = badge.createSpan({ cls: 'sprint-bases-entry-property-icon' });
        setIcon(icon, 'calendar-days');
        badge.createSpan({ text: displayValue });
      } else {
        badge.createSpan({
          text: property === 'sprint' ? displayValue : `${label}: ${displayValue}`,
        });
      }
      renderedMetadata = true;
    }
    if (!renderedMetadata) meta.remove();
    let dragged = false;
    link.addEventListener('dragstart', (event) => {
      dragged = true;
      this.draggedTaskPath = entry.file.path;
      this.draggedTaskEl = link;
      this.draggedProjectGroup = project;
      link.classList.add('is-dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(TASK_DRAG_TYPE, entry.file.path);
        event.dataTransfer.setData('text/plain', entry.file.path);
      }
    });
    link.addEventListener('dragend', () => {
      this.clearDragState();
      link.ownerDocument.defaultView?.setTimeout(() => {
        dragged = false;
      }, 0);
    });
    link.addEventListener('click', (event) => {
      if (dragged) {
        event.preventDefault();
        return;
      }
      void this.app.workspace.openLinkText(entry.file.path, '', false);
    });
  }

  private registerDropTarget(
    section: HTMLElement,
    entries: HTMLElement,
    state: TaskBoardState,
    project: string,
  ): void {
    section.addEventListener('dragover', (event) => {
      if (!this.draggedTaskPath || this.draggedProjectGroup !== project) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      section.classList.add('is-drop-target');
    });
    section.addEventListener('dragleave', (event) => {
      const nextTarget = event.relatedTarget;
      const NodeConstructor = section.ownerDocument.defaultView?.Node;
      if (!NodeConstructor || !(nextTarget instanceof NodeConstructor) || !section.contains(nextTarget)) {
        section.classList.remove('is-drop-target');
      }
    });
    section.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      section.classList.remove('is-drop-target');
      const path = event.dataTransfer?.getData(TASK_DRAG_TYPE) || this.draggedTaskPath;
      if (!path || this.draggedProjectGroup !== project) return;
      void this.moveTask(path, state, entries);
    });
  }

  private async moveTask(
    path: string,
    state: TaskBoardState,
    target: HTMLElement,
  ): Promise<void> {
    const file = this.app.vault.getFileByPath(path);
    if (!file) {
      this.clearDragState();
      new Notice(`Unable to move task: ${path} was not found.`);
      return;
    }

    const currentFrontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (taskState(currentFrontmatter) === state) {
      this.clearDragState();
      return;
    }

    const card = this.draggedTaskEl;
    const originalParent = card?.parentElement ?? null;
    const originalNextSibling = card?.nextSibling ?? null;
    if (card) {
      target.querySelector('.sprint-bases-empty')?.remove();
      target.append(card);
      card.classList.remove('is-dragging');
      card.classList.add('is-updating');
      card.setAttribute('aria-busy', 'true');
      this.ensureColumnEmptyState(originalParent);
    }

    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        applyTaskBoardState(frontmatter as Record<string, unknown>, state);
      });
    } catch (error) {
      if (card && originalParent) {
        originalParent.querySelector('.sprint-bases-empty')?.remove();
        originalParent.insertBefore(card, originalNextSibling);
        this.ensureColumnEmptyState(target);
      }
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Unable to move task: ${message}`);
    } finally {
      card?.classList.remove('is-updating');
      card?.removeAttribute('aria-busy');
      this.clearDragState();
    }
  }

  private ensureColumnEmptyState(entries: HTMLElement | null): void {
    if (!entries || entries.querySelector('.sprint-bases-entry')) return;
    if (!entries.querySelector('.sprint-bases-empty')) {
      entries.createDiv({ cls: 'sprint-bases-empty', text: 'No tasks' });
    }
  }

  private clearDragState(): void {
    this.draggedTaskEl?.classList.remove('is-dragging');
    this.containerEl.querySelectorAll('.is-drop-target').forEach((element) => {
      element.classList.remove('is-drop-target');
    });
    this.draggedTaskPath = null;
    this.draggedTaskEl = null;
    this.draggedProjectGroup = null;
  }
}

export interface VelocityPoint {
  label: string;
  value: number;
  sprintNumber: number;
  startDate: string;
}

export function selectRecentVelocityPoints(points: VelocityPoint[]): VelocityPoint[] {
  return [...points]
    .sort((left, right) => (
      left.startDate.localeCompare(right.startDate) || left.sprintNumber - right.sprintNumber
    ))
    .slice(-8);
}

class SprintVelocityView extends BasesView {
  readonly type = SPRINT_VELOCITY_VIEW_TYPE;
  private readonly containerEl: HTMLElement;

  constructor(
    controller: QueryController,
    parentEl: HTMLElement,
    private readonly getSettings: () => SprintSettings,
  ) {
    super(controller);
    this.containerEl = parentEl.createDiv({ cls: 'sprint-velocity-view' });
  }

  onDataUpdated(): void {
    this.containerEl.empty();

    const configuredProfile = this.config.get('sprintProfile');
    const profileId = typeof configuredProfile === 'string'
      ? configuredProfile
      : (this.getSettings().profiles[0]?.id ?? '');
    const profile = this.getSettings().profiles.find(({ id }) => id === profileId);
    const header = this.containerEl.createDiv({ cls: 'sprint-bases-header' });
    header.createEl('h3', { text: this.config.name });
    header.createSpan({
      cls: 'sprint-bases-profile',
      text: profile?.name ?? 'Unassigned workspace',
    });

    if (!profile?.rootFolder) {
      this.containerEl.createDiv({ cls: 'sprint-velocity-empty', text: 'No Sprint workspace selected.' });
      return;
    }

    const points = this.getVelocityPoints(profile.rootFolder);
    if (points.length === 0) {
      this.containerEl.createDiv({ cls: 'sprint-velocity-empty', text: 'No completed sprint estimates yet.' });
      return;
    }

    const max = Math.max(1, ...points.map((point) => point.value));
    const chart = this.containerEl.createDiv({ cls: 'sprint-velocity-chart' });
    for (const point of points) {
      const column = chart.createDiv({ cls: 'sprint-velocity-column' });
      const height = point.value === 0 ? 0 : Math.max(4, Math.round((point.value / max) * 100));
      const barWrap = column.createDiv({
        cls: 'sprint-velocity-bar-wrap',
        attr: { style: `--sprint-velocity-height: ${height}%` },
      });
      barWrap.createDiv({
        cls: `sprint-velocity-value${point.value === 0 ? ' is-zero' : ''}`,
        text: String(point.value),
      });
      barWrap.createDiv({
        cls: 'sprint-velocity-bar',
        attr: { style: 'height: var(--sprint-velocity-height)' },
      });
      column.createDiv({ cls: 'sprint-velocity-label', text: point.label });
    }
  }

  private getVelocityPoints(rootFolder: string): VelocityPoint[] {
    const root = rootFolder.replace(/^\/+|\/+$/g, '');
    const taskFiles = this.filesIn(`${root}/Tasks`);
    return selectRecentVelocityPoints(this.filesIn(`${root}/Sprints`)
      .map((file) => {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        const sprintNumber = typeof frontmatter?.['sprint number'] === 'number'
          ? frontmatter['sprint number']
          : Number(file.basename.match(/\d+/)?.[0] ?? 0);
        const startDate = typeof frontmatter?.['start date'] === 'string' ? frontmatter['start date'] : '';
        const value = taskFiles
          .filter((task) => {
            const taskFrontmatter = this.app.metadataCache.getFileCache(task)?.frontmatter;
            return isDone(taskFrontmatter) && sprintReferences(taskFrontmatter?.sprint, file.basename);
          })
          .reduce((sum, task) => (
            sum + estimate(this.app.metadataCache.getFileCache(task)?.frontmatter)
          ), 0);
        return { label: file.basename, value, sprintNumber, startDate };
      }));
  }

  private filesIn(folder: string): TFile[] {
    return markdownFilesInFolder(this.app, folder);
  }
}

export function createSprintBasesViewRegistration(
  getSettings: () => SprintSettings,
): BasesViewRegistration {
  return {
    name: 'Sprint',
    icon: 'calendar-range',
    factory: (controller, containerEl) => (
      new SprintBasesView(controller, containerEl, getSettings)
    ),
    options: () => getSprintBasesOptions(getSettings()),
  };
}

export function createSprintVelocityViewRegistration(
  getSettings: () => SprintSettings,
): BasesViewRegistration {
  return {
    name: 'Sprint velocity',
    icon: 'bar-chart-3',
    factory: (controller, containerEl) => (
      new SprintVelocityView(controller, containerEl, getSettings)
    ),
    options: () => getSprintBasesOptions(getSettings()).filter((option) => (
      'key' in option && option.key === 'sprintProfile'
    )),
  };
}
