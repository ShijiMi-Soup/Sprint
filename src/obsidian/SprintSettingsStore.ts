import type { Plugin } from 'obsidian';

import type { SprintSettings } from '../domain/types';
import { normalizeSprintSettings } from '../domain/SprintSettings';

export interface SprintSettingsStore {
  load(): Promise<SprintSettings>;
  save(settings: SprintSettings): Promise<void>;
}

interface PluginData {
  sprint?: unknown;
  [key: string]: unknown;
}

export class PluginDataSprintSettingsStore implements SprintSettingsStore {
  constructor(private readonly plugin: Plugin) {}

  async load(): Promise<SprintSettings> {
    const data = await this.plugin.loadData() as PluginData | null;
    return normalizeSprintSettings(data?.sprint);
  }

  async save(settings: SprintSettings): Promise<void> {
    const data = await this.plugin.loadData() as PluginData | null;
    await this.plugin.saveData({ ...(data ?? {}), sprint: settings });
  }
}
