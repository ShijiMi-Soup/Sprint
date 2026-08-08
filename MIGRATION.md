# Migration from Sprint Agent

This repository was extracted from the provider-independent sprint features originally implemented in the Sprint Agent fork of Claudian.

## Ownership Mapping

| Previous Sprint Agent area | Sprint repository owner |
| --- | --- |
| Sprint schedule calculations | `src/domain/SprintSchedule.ts` |
| Sprint settings and legacy normalization | `src/domain/SprintSettings.ts` |
| Generation, lifecycle, and rollover | `src/domain/SprintManager.ts` |
| Obsidian vault access | `src/obsidian/ObsidianSprintVault.ts` |
| Native Bases view | `src/obsidian/SprintBasesView.ts` |
| Sprint settings UI | `src/obsidian/SprintSettingTab.ts` |
| Plugin lifecycle integration | `src/SprintFeature.ts` |
| Agent task-management domain guide | `docs/AGENT_GUIDE.md` |

## Intentionally Not Migrated

- Claudian provider implementations and provider settings.
- Chat, inline edit, sessions, MCP, skills, and model selection.
- Agent personality settings and onboarding.
- Provider prompt injection and agent permissions.
- Sprint Agent product branding and integration adapters.

Those capabilities belong to the future Sprint Agent integration repository.

## Compatibility Contracts

- The Bases view type remains `sprint-agent-sprint-board` so existing `.base` files continue to resolve after integration.
- Existing legacy single-workspace settings remain accepted by `normalizeSprintSettings`.
- The default profile remains `agile-pm` with the `Agile PM` folder layout.
- The embedded settings store uses the `sprint` key and preserves unrelated host plugin data.

## Current Transition State

Sprint Agent still contains its original copy of the sprint implementation. It should continue using that copy until this repository has an initial commit, a remote URL, and is added to the integration repository as a pinned dependency or Git submodule. Removing the old copy before that integration is verified would break the existing plugin.
