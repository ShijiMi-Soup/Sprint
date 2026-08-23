import type {
  BasesAllOptions,
  BasesEntry,
  BasesViewRegistration,
  QueryController,
  TFile,
} from 'obsidian';
import { BasesView, Notice } from 'obsidian';

import type { SprintSettings } from '../domain/types';

export const SPRINT_BASES_VIEW_TYPE = 'sprint-agent-sprint-board';
export const SPRINT_VELOCITY_VIEW_TYPE = 'sprint-agent-velocity-chart';
const TASK_DRAG_TYPE = 'application/x-sprint-task-path';

export type TaskBoardState = 'Not started' | 'In progress' | 'Done';
const TASK_STATES: TaskBoardState[] = ['Not started', 'In progress', 'Done'];

export function applyTaskBoardState(
  frontmatter: Record<string, unknown>,
  state: TaskBoardState,
): void {
  frontmatter['in progress'] = state === 'In progress';
  frontmatter['is done'] = state === 'Done';
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

export function getSprintBasesOptions(
  settings: SprintSettings,
): BasesAllOptions[] {
  const profiles = Object.fromEntries(
    settings.profiles.map((profile) => [profile.id, profile.name]),
  );
  if (Object.keys(profiles).length === 0) profiles.none = 'No sprint profiles';

  return [
    {
      key: 'sprintProfile',
      type: 'dropdown',
      displayName: 'Sprint profile',
      default: settings.profiles[0]?.id ?? 'none',
      options: profiles,
    },
    {
      key: 'layout',
      type: 'dropdown',
      displayName: 'Layout',
      default: 'board',
      options: { board: 'Board', list: 'List', kanban: 'Kanban' },
    },
    {
      key: 'showCompleted',
      type: 'toggle',
      displayName: 'Show completed tasks',
      default: true,
    },
  ];
}

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

class SprintBasesView extends BasesView {
  readonly type = SPRINT_BASES_VIEW_TYPE;
  private readonly containerEl: HTMLElement;
  private readonly embedded: boolean;
  private draggedTaskPath: string | null = null;
  private draggedTaskEl: HTMLElement | null = null;
  private draggedProjectGroup: string | null = null;

  constructor(
    controller: QueryController,
    parentEl: HTMLElement,
    private readonly getSettings: () => SprintSettings,
  ) {
    super(controller);
    this.embedded = parentEl.closest('.bases-embed') !== null;
    this.containerEl = parentEl.createDiv({ cls: 'sprint-bases-view' });
  }

  onDataUpdated(): void {
    this.containerEl.empty();
    console.debug('[Sprint][temporary-bases-debug] Sprint board data updated', {
      view: this.config.name,
      entries: this.data.data.length,
      groups: this.data.groupedData.length,
      embedded: this.embedded,
    });

    const profileId = String(
      this.config.get('sprintProfile') ?? this.getSettings().profiles[0]?.id ?? '',
    );
    const profile = this.getSettings().profiles.find(({ id }) => id === profileId);
    const header = this.containerEl.createDiv({ cls: 'sprint-bases-header' });
    header.createEl('h3', { text: this.config.name });
    header.createSpan({
      cls: 'sprint-bases-profile',
      text: profile?.name ?? 'Unassigned profile',
    });

    const configuredLayout = this.config.get('layout');
    const layout = configuredLayout === 'list' || configuredLayout === 'kanban' ? configuredLayout : 'board';
    const content = this.containerEl.createDiv({
      cls: `sprint-bases-content sprint-bases-${layout}`,
    });
    const showCompleted = this.config.get('showCompleted') !== false;
    if (layout === 'kanban') {
      this.renderKanban(content, showCompleted);
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

  private renderKanban(content: HTMLElement, showCompleted: boolean): void {
    const projects = new Map<string, Map<TaskBoardState, BasesEntry[]>>();
    const seen = new Set<string>();
    for (const group of this.data.groupedData) {
      for (const entry of group.entries) {
        if (seen.has(entry.file.path)) continue;
        seen.add(entry.file.path);
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        if (!showCompleted && isDone(frontmatter)) continue;
        const project = getTaskProjectGroup(frontmatter);
        const columns = projects.get(project) ?? new Map(
          TASK_STATES.map((state) => [state, [] as BasesEntry[]]),
        );
        columns.get(taskState(frontmatter))?.push(entry);
        projects.set(project, columns);
      }
    }

    const sortedProjects = [...projects.entries()].sort(([left], [right]) => {
      if (left === 'No project') return 1;
      if (right === 'No project') return -1;
      return left.localeCompare(right);
    });
    if (sortedProjects.length === 0) {
      content.createDiv({ cls: 'sprint-bases-empty', text: 'No tasks match this view.' });
      return;
    }

    for (const [project, columns] of sortedProjects) {
      const projectSection = content.createDiv({ cls: 'sprint-bases-project' });
      const projectHeader = projectSection.createDiv({ cls: 'sprint-bases-project-header' });
      projectHeader.createEl('h4', { text: project });
      projectHeader.createSpan({
        cls: 'sprint-bases-project-count',
        text: String([...columns.values()].reduce((total, entries) => total + entries.length, 0)),
      });
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
      }
    }
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
    const points = estimate(frontmatter);
    if (points > 0) {
      const meta = link.createSpan({ cls: 'sprint-bases-entry-meta' });
      meta.createSpan({
        cls: `sprint-bases-entry-points sprint-bases-entry-points--${getEstimateTone(points)}`,
        text: `${points} pt`,
      });
    }
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

interface VelocityPoint {
  label: string;
  value: number;
}

class SprintVelocityView extends BasesView {
  readonly type = SPRINT_VELOCITY_VIEW_TYPE;
  private readonly containerEl: HTMLElement;
  private readonly embedded: boolean;

  constructor(
    controller: QueryController,
    parentEl: HTMLElement,
    private readonly getSettings: () => SprintSettings,
  ) {
    super(controller);
    this.embedded = parentEl.closest('.bases-embed') !== null;
    this.containerEl = parentEl.createDiv({ cls: 'sprint-velocity-view' });
  }

  onDataUpdated(): void {
    this.containerEl.empty();

    const profileId = String(
      this.config.get('sprintProfile') ?? this.getSettings().profiles[0]?.id ?? '',
    );
    const profile = this.getSettings().profiles.find(({ id }) => id === profileId);
    const header = this.containerEl.createDiv({ cls: 'sprint-bases-header' });
    header.createEl('h3', { text: this.config.name });
    header.createSpan({
      cls: 'sprint-bases-profile',
      text: profile?.name ?? 'Unassigned profile',
    });

    if (!profile?.rootFolder) {
      this.containerEl.createDiv({ cls: 'sprint-velocity-empty', text: 'No sprint profile selected.' });
      return;
    }

    const points = this.getVelocityPoints(profile.rootFolder);
    console.debug('[Sprint][temporary-bases-debug] Velocity data updated', {
      view: this.config.name,
      queryEntries: this.data.data.length,
      sprintFiles: this.filesIn(`${profile.rootFolder.replace(/^\/+|\/+$/g, '')}/Sprints`).length,
      taskFiles: this.filesIn(`${profile.rootFolder.replace(/^\/+|\/+$/g, '')}/Tasks`).length,
      points: points.length,
      embedded: this.embedded,
    });
    if (points.length === 0) {
      this.containerEl.createDiv({ cls: 'sprint-velocity-empty', text: 'No completed sprint estimates yet.' });
      return;
    }

    const max = Math.max(1, ...points.map((point) => point.value));
    const chart = this.containerEl.createDiv({ cls: 'sprint-velocity-chart' });
    for (const point of points) {
      const column = chart.createDiv({ cls: 'sprint-velocity-column' });
      column.createDiv({ cls: 'sprint-velocity-value', text: String(point.value) });
      const barWrap = column.createDiv({ cls: 'sprint-velocity-bar-wrap' });
      barWrap.createDiv({
        cls: 'sprint-velocity-bar',
        attr: { style: `height: ${Math.max(4, Math.round((point.value / max) * 100))}%` },
      });
      column.createDiv({ cls: 'sprint-velocity-label', text: point.label });
    }
  }

  private getVelocityPoints(rootFolder: string): VelocityPoint[] {
    const root = rootFolder.replace(/^\/+|\/+$/g, '');
    const taskFiles = this.filesIn(`${root}/Tasks`);
    return this.filesIn(`${root}/Sprints`)
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
      })
      .filter((point) => point.value > 0)
      .sort((left, right) => (
        left.startDate.localeCompare(right.startDate) || left.sprintNumber - right.sprintNumber
      ))
      .slice(-8);
  }

  private filesIn(folder: string): TFile[] {
    const prefix = `${folder}/`;
    return this.app.vault.getMarkdownFiles()
      .filter((file) => file.path.startsWith(prefix) && !file.path.slice(prefix.length).includes('/'));
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
