import { Modal, Notice, Setting, type App } from 'obsidian';

export class MissingSprintWorkspaceError extends Error {
  constructor() {
    super('The configured Sprint workspace needs recovery.');
  }
}

export interface SprintWorkspaceRecoveryContext {
  rootFolder: string;
}

export interface SprintWorkspaceRecoveryHandlers {
  locateWorkspace(rootFolder: string): Promise<void>;
  createReplacementWorkspace(): Promise<void>;
}

/**
 * Gives users an explicit recovery route when a previously managed workspace
 * has been moved or deleted outside Sprint's settings flow.
 */
export class SprintWorkspaceRecoveryModal extends Modal {
  private folderPath = '';
  private errorEl: HTMLElement | null = null;

  constructor(
    app: App,
    private readonly context: SprintWorkspaceRecoveryContext,
    private readonly handlers: SprintWorkspaceRecoveryHandlers,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText('Sprint workspace not found');
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: `Sprint could not find the configured workspace: ${this.context.rootFolder}. Automatic synchronization is paused so it does not recreate that folder.`,
    });
    this.contentEl.createEl('p', {
      text: 'If you renamed or moved the workspace, enter its current vault-relative folder path. Otherwise, you can intentionally create an empty replacement workspace.',
    });

    new Setting(this.contentEl)
      .setName('Current workspace folder')
      .setDesc('For example: Planning/Sprint')
      .addText((text) => text
        .setPlaceholder(this.context.rootFolder)
        .onChange((value) => {
          this.folderPath = value;
          this.setError('');
        }));

    this.errorEl = this.contentEl.createDiv({ cls: 'sprint-workspace-recovery-error' });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('Not now')
        .onClick(() => { this.close(); }))
      .addButton((button) => button
        .setButtonText('Locate workspace')
        .onClick(() => { void this.locateWorkspace(); }))
      .addButton((button) => button
        .setButtonText('Create new workspace')
        .setDestructive()
        .onClick(() => { void this.createReplacementWorkspace(); }));
  }

  override onClose(): void {
    this.contentEl.empty();
  }

  private async locateWorkspace(): Promise<void> {
    try {
      await this.handlers.locateWorkspace(this.folderPath);
      this.close();
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Could not locate the Sprint workspace.');
    }
  }

  private async createReplacementWorkspace(): Promise<void> {
    this.close();
    await this.handlers.createReplacementWorkspace();
  }

  private setError(message: string): void {
    if (this.errorEl) this.errorEl.setText(message);
  }
}

export class CreateSprintWorkspaceModal extends Modal {
  private confirmation = '';

  constructor(
    app: App,
    private readonly rootFolder: string,
    private readonly onConfirm: () => Promise<void>,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.titleEl.setText('Create a new Sprint workspace?');
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: `This creates a new workspace at ${this.rootFolder}. The original workspace was not found and will not be changed.`,
    });
    this.contentEl.createEl('p', {
      text: 'The replacement includes support files and sprint notes, but no tutorial projects or tasks.',
    });
    this.contentEl.createEl('p', { text: 'To continue, type exactly: Create workspace' });

    let confirmButton: { setDisabled(disabled: boolean): unknown } | null = null;
    new Setting(this.contentEl)
      .setName('Confirmation')
      .addText((text) => text
        .setPlaceholder('Create workspace')
        .onChange((value) => {
          this.confirmation = value;
          confirmButton?.setDisabled(value !== 'Create workspace');
        }));

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('Cancel')
        .onClick(() => { this.close(); }))
      .addButton((button) => {
        confirmButton = button;
        button
          .setButtonText('Create workspace')
          .setDestructive()
          .setDisabled(true)
          .onClick(() => { void this.confirm(); });
      });
  }

  override onClose(): void {
    this.contentEl.empty();
  }

  private async confirm(): Promise<void> {
    if (this.confirmation !== 'Create workspace') return;
    try {
      await this.onConfirm();
      this.close();
    } catch (error) {
      new Notice(error instanceof Error
        ? `Sprint workspace creation failed: ${error.message}`
        : 'Sprint workspace creation failed.');
    }
  }
}
