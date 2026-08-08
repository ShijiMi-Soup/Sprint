# Sprint

Sprint is provider-independent sprint management for Obsidian. It generates sprint notes, maintains sprint lifecycle metadata, rolls incomplete tasks forward, and provides profile-aware Bases views without requiring an AI provider.

The repository produces both:

- A standalone Obsidian plugin with the ID `sprint`.
- An embeddable `@sprint-agent/sprint` module for Sprint Agent or other host plugins.

See [MIGRATION.md](MIGRATION.md) for the extraction boundary and compatibility contracts.
See [docs/PROJECT_LOG.md](docs/PROJECT_LOG.md) for the full project history, latest product direction, and new-workspace handoff.

## Features

- Global defaults for sprint duration, start day, rollover policy, future sprint count, and naming.
- Multiple sprint profiles with independent roots, Base associations, cadence anchors, and overrides.
- Automatic current and future sprint generation on a 1-8 week cadence.
- Catch-up generation after Obsidian has been closed for one or more cycles.
- Current, next, last, past, and future lifecycle metadata.
- Incomplete-task rollover to the current sprint, backlog, or original sprint.
- Native Obsidian Bases board/list view with profile and completed-task options stored in `.base` files.
- Review and retrospective fields on generated sprint notes.
- A public integration API with no dependency on Claudian or an AI provider.

## Standalone Usage

1. Open **Settings -> Sprint**.
2. Enable automatic sprints and configure the global defaults.
3. Configure a profile with its project root, Tasks Base, Sprints Base, and cadence anchor.
4. Run **Sprint: Sync sprints** from the command palette.
5. Add the **Sprint** view to an associated `.base` file and select the profile.

The expected default profile layout is:

```text
Agile PM/
├── Bases/
│   ├── Tasks.base
│   └── Sprints.base
├── Tasks/
└── Sprints/
```

## Embedding

`SprintFeature` accepts an Obsidian `Plugin` host and an optional settings store. Its default store uses the host plugin's `data.json` while preserving unrelated data under a namespaced `sprint` key.

```ts
import { SprintFeature } from '@sprint-agent/sprint';

export default class HostPlugin extends Plugin {
  private sprint?: SprintFeature;

  async onload(): Promise<void> {
    this.sprint = new SprintFeature(this);
    await this.sprint.load();
  }
}
```

The integration API exposes current settings, ordered settings updates, and synchronization:

```ts
await sprint.updateSettings((settings) => {
  settings.defaults.durationWeeks = 2;
});

const result = await sprint.sync();
```

## Optional Agent Integrations

Sprint does not load an AI agent. [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md) documents the task and sprint rules that an external agent integration can add to its own prompt or skill system. Sprint Agent is responsible for injecting that guide, provider integration, permissions, and agent personality.

## Development

```bash
npm install
npm run check
```

The production build creates `main.js`, `styles.css`, and an embeddable ESM module under `dist/`.

## Architecture

```text
src/domain/        Scheduling, profiles, rollover, and contracts
src/obsidian/      Vault, Bases, settings, and storage adapters
src/SprintFeature  Embeddable lifecycle and public API
src/main.ts        Standalone Obsidian entry point
```

The domain layer is tested to remain independent of Obsidian and AI integrations.

## License

MIT License. Copyright 2026 Shijimi.
