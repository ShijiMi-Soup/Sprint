import { Plugin } from 'obsidian';

import { SprintFeature } from './SprintFeature';

export default class SprintPlugin extends Plugin {
  private feature?: SprintFeature;

  override async onload(): Promise<void> {
    this.feature = new SprintFeature(this);
    await this.feature.load();
  }
}
