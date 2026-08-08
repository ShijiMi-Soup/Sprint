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
export class Notice {}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
}
