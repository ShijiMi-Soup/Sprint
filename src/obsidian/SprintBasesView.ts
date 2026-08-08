import type { BasesAllOptions, BasesViewRegistration, QueryController } from 'obsidian';
import { BasesView } from 'obsidian';

import type { SprintSettings } from '../domain/types';

export const SPRINT_BASES_VIEW_TYPE = 'sprint-agent-sprint-board';

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
      options: { board: 'Board', list: 'List' },
    },
    {
      key: 'showCompleted',
      type: 'toggle',
      displayName: 'Show completed tasks',
      default: true,
    },
  ];
}

class SprintBasesView extends BasesView {
  readonly type = SPRINT_BASES_VIEW_TYPE;

  constructor(
    controller: QueryController,
    private readonly containerEl: HTMLElement,
    private readonly getSettings: () => SprintSettings,
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.containerEl.empty();
    this.containerEl.addClass('sprint-bases-view');

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

    const layout = this.config.get('layout') === 'list' ? 'list' : 'board';
    const content = this.containerEl.createDiv({
      cls: `sprint-bases-content sprint-bases-${layout}`,
    });
    const showCompleted = this.config.get('showCompleted') !== false;
    for (const group of this.data.groupedData) {
      const visibleEntries = group.entries.filter((entry) => {
        if (showCompleted) return true;
        const frontmatter = this.app.metadataCache.getFileCache(entry.file)?.frontmatter;
        if (frontmatter?.['is done'] === true) return false;
        return !['done', 'complete', 'completed'].includes(
          String(frontmatter?.status ?? '').trim().toLowerCase(),
        );
      });
      if (visibleEntries.length === 0) continue;
      const section = content.createDiv({ cls: 'sprint-bases-group' });
      section.createEl('h4', { text: group.hasKey() ? group.key?.toString() : 'Items' });
      const entries = section.createDiv({ cls: 'sprint-bases-entries' });
      for (const entry of visibleEntries) {
        const link = entries.createEl('button', {
          cls: 'sprint-bases-entry',
          text: entry.file.basename,
          attr: { type: 'button' },
        });
        link.addEventListener('click', () => {
          void this.app.workspace.openLinkText(entry.file.path, '', false);
        });
      }
    }
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
