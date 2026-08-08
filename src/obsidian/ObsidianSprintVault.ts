import type { App, TFile } from 'obsidian';
import { normalizePath } from 'obsidian';

import type { SprintVault, SprintVaultNote } from '../domain/SprintManager';

function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => {
    const serialized = typeof value === 'number' ? String(value) : JSON.stringify(value);
    return `${key}: ${serialized}`;
  });
  return `---\n${lines.join('\n')}\n---\n\n`;
}

export class ObsidianSprintVault implements SprintVault {
  constructor(private readonly app: App) {}

  listMarkdownNotes(folder: string): SprintVaultNote[] {
    const prefix = `${normalizePath(folder)}/`;
    return this.app.vault.getMarkdownFiles()
      .filter((file) => file.path.startsWith(prefix) && !file.path.slice(prefix.length).includes('/'));
  }

  getFrontmatter(note: SprintVaultNote): Record<string, unknown> {
    const file = this.getFile(note.path);
    return { ...(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {}) };
  }

  async ensureFolder(folder: string): Promise<void> {
    let current = '';
    for (const segment of normalizePath(folder).split('/')) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  async createNote(
    path: string,
    frontmatter: Record<string, unknown>,
    body: string,
  ): Promise<SprintVaultNote> {
    return this.app.vault.create(
      normalizePath(path),
      `${serializeFrontmatter(frontmatter)}${body}`,
    );
  }

  async updateFrontmatter(
    note: SprintVaultNote,
    mutation: (frontmatter: Record<string, unknown>) => void,
  ): Promise<void> {
    await this.app.fileManager.processFrontMatter(this.getFile(note.path), mutation);
  }

  private getFile(path: string): TFile {
    const file = this.app.vault.getFileByPath(path);
    if (!file) throw new Error(`Sprint note not found: ${path}`);
    return file;
  }
}
