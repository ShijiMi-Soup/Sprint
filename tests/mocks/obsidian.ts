export class BasesView {
  app: unknown;
  config: unknown;
  data: unknown;

  constructor(controller: { app?: unknown; config?: unknown; data?: unknown }) {
    this.app = controller.app;
    this.config = controller.config;
    this.data = controller.data;
  }
}

export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Notice {
  constructor(readonly message?: string) {}
}
export class Modal {
  titleEl = { setText: jest.fn() };
  contentEl = { createEl: jest.fn(), empty: jest.fn() };

  constructor(readonly app: unknown) {}

  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
}

export function parseYaml(yaml: string): unknown {
  return parse(yaml);
}

export function stringifyYaml(value: unknown): string {
  return stringify(value);
}
import { parse, stringify } from 'yaml';
