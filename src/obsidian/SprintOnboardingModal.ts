import type { App } from 'obsidian';
import { Modal, Setting } from 'obsidian';

export interface SprintOnboardingContext {
  rootFolder: string;
  durationWeeks: number;
  futureSprintCount: number;
  existingWorkspace: boolean;
}

export interface SprintOnboardingActions {
  onSetup(): Promise<void>;
  onDismiss(): Promise<void>;
}

export class SprintOnboardingModal extends Modal {
  private resolved = false;

  constructor(
    app: App,
    private readonly context: SprintOnboardingContext,
    private readonly actions: SprintOnboardingActions,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.renderWelcome();
  }

  override onClose(): void {
    this.contentEl.empty();
    if (!this.resolved) {
      this.resolved = true;
      void this.actions.onDismiss();
    }
  }

  private renderWelcome(): void {
    this.titleEl.setText('Welcome to Sprint');
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: this.context.existingWorkspace
        ? `Sprint found an existing workspace at ${this.context.rootFolder}. It can connect to it and create only missing support files.`
        : 'Sprint can create a ready-to-use workspace with project boards, sprint notes, a summary, and optional AI skills.',
    });
    this.contentEl.createEl('p', {
      text: 'You can review and change the cadence, folder, and rollover behavior later in Sprint settings.',
    });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('Not now')
        .onClick(() => { this.dismiss(); }))
      .addButton((button) => button
        .setButtonText(this.context.existingWorkspace ? 'Use workspace' : 'Set up Sprint')
        .setCta()
        .onClick(() => { this.renderConfirmation(); }));
  }

  private renderConfirmation(): void {
    const duration = this.context.durationWeeks === 1
      ? '1 week'
      : `${this.context.durationWeeks} weeks`;
    this.titleEl.setText(this.context.existingWorkspace
      ? 'Use this Sprint workspace?'
      : 'Create the Sprint workspace?');
    this.contentEl.empty();
    this.contentEl.createEl('p', {
      text: `Folder: ${this.context.rootFolder}. Cadence: ${duration}. Future sprints: ${this.context.futureSprintCount}.`,
    });
    this.contentEl.createEl('p', {
      text: 'Sprint will enable automatic synchronization and create missing task, sprint, and project bases; sprint notes; a summary; local AI instructions; and vault-root skills for Codex and Claude Code.',
    });
    this.contentEl.createEl('p', {
      text: this.context.existingWorkspace
        ? 'Existing workspace files and user content are preserved. Tutorial projects and tasks are not recreated.'
        : 'Existing files are preserved if the configured folder is created before you continue.',
    });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText('Back')
        .onClick(() => { this.renderWelcome(); }))
      .addButton((button) => button
        .setButtonText(this.context.existingWorkspace ? 'Use workspace' : 'Create workspace')
        .setCta()
        .onClick(() => { this.setup(); }));
  }

  private dismiss(): void {
    this.resolved = true;
    this.close();
    void this.actions.onDismiss();
  }

  private setup(): void {
    this.resolved = true;
    this.close();
    void this.actions.onSetup();
  }
}
