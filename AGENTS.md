# Sprint Repository

Sprint is provider-independent sprint-management software for Obsidian. It must not import or depend on Claudian, Sprint Agent, AI providers, model APIs, prompts, personalities, or chat features.

## Boundaries

- `src/domain/` owns scheduling, profiles, rollover rules, and provider-independent contracts. It must not import `obsidian`.
- `src/obsidian/` adapts domain contracts to vault files, Bases, settings UI, and plugin lifecycle.
- `src/SprintFeature.ts` is the embeddable integration boundary.
- `src/main.ts` is only the standalone Obsidian plugin entry point.
- `docs/AGENT_GUIDE.md` documents the domain for optional external agent integrations; it is not loaded by Sprint itself.

## Verification

Run `npm run check` before release. Tests mirror domain and Obsidian ownership under `tests/`.

## Documentation

Documentation is part of every user-visible change. When behavior, settings,
commands, generated files, properties, views, migrations, or AI instructions
change, review and update `docs/REFERENCE.md`, the relevant installation guides,
both READMEs, `CHANGELOG.md`, `docs/TODO.md`, and `docs/AGENT_GUIDE.md` as
applicable. Follow `docs/DOCUMENTATION_MAINTENANCE.md` and run `npm run check`
before merging or releasing.

## Subagents

The Sol primary agent handles normal development and final decisions. Two optional,
project-scoped agents are defined in `.codex/agents/`: a Terra reviewer for high-risk
changes and releases, and a Luna documentation agent for substantial documentation
work. Follow `docs/DEVELOPMENT_AGENTS.md`; do not delegate routine implementation.
