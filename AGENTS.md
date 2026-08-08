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
