import type { BasesAllOptions, BasesViewRegistration, QueryController, TFile } from 'obsidian';
import { BasesView } from 'obsidian';

import type { SprintSettings } from '../domain/types';

export const SPRINT_BASES_VIEW_TYPE = 'sprint-agent-sprint-board';
export const SPRINT_VELOCITY_VIEW_TYPE = 'sprint-agent-velocity-chart';

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

function taskState(frontmatter: Record<string, unknown> | undefined): string {
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
    const columns = [
      { key: 'Not started', entries: [] as typeof this.data.groupedData[number]['entries'] },
      { key: 'In progress', entries: [] as typeof this.data.groupedData[number]['entries'] },
      { key: 'Done', entries: [] as typeof this.data.groupedData[number]['entries'] },
    ];
    const seen = new Set<string>();
    for (const group of this.data.groupedData) {
      for (const entry of group.entries) {
        if (seen.has(entry.file.path)) continue;
        seen.add(entry.file.path);
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        if (!showCompleted && isDone(frontmatter)) continue;
        columns.find(({ key }) => key === taskState(frontmatter))?.entries.push(entry);
      }
    }

    for (const column of columns) {
      const section = content.createDiv({ cls: 'sprint-bases-group' });
      section.createEl('h4', { text: column.key });
      const entries = section.createDiv({ cls: 'sprint-bases-entries' });
      if (column.entries.length === 0) {
        entries.createDiv({ cls: 'sprint-bases-empty', text: 'No tasks' });
      }
      for (const entry of column.entries) {
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        const link = entries.createEl('button', {
          cls: 'sprint-bases-entry',
          attr: { type: 'button' },
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
        link.addEventListener('click', () => {
          void this.app.workspace.openLinkText(entry.file.path, '', false);
        });
      }
    }
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
