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

function isAlreadyExistsError(error: unknown): boolean {
  return error instanceof Error && /already exists/i.test(error.message);
}

function noteForPath(path: string): SprintVaultNote {
  return { path, basename: path.split('/').at(-1)!.replace(/\.md$/, '') };
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
        try {
          await this.app.vault.createFolder(current);
        } catch (error) {
          if (!isAlreadyExistsError(error) && !this.app.vault.getAbstractFileByPath(current)) {
            throw error;
          }
        }
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

  async upsertNote(
    path: string,
    frontmatter: Record<string, unknown>,
    body: string,
  ): Promise<{ note: SprintVaultNote; created: boolean }> {
    const normalizedPath = normalizePath(path);
    const existing = this.app.vault.getFileByPath(normalizedPath);
    if (existing) {
      await this.replaceGeneratedSprintNote(existing, frontmatter, body);
      return { note: noteForPath(existing.path), created: false };
    }

    try {
      const created = await this.createNote(normalizedPath, frontmatter, body);
      return { note: created, created: true };
    } catch (error) {
      if (!isAlreadyExistsError(error)) throw error;
      const raced = this.app.vault.getFileByPath(normalizedPath);
      if (!raced) throw error;
      await this.replaceGeneratedSprintNote(raced, frontmatter, body);
      return { note: noteForPath(raced.path), created: false };
    }
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

  private async replaceGeneratedSprintNote(
    file: TFile,
    frontmatter: Record<string, unknown>,
    body: string,
  ): Promise<void> {
    await this.app.vault.modify(file, `${serializeFrontmatter(frontmatter)}${body}`);
  }
}
