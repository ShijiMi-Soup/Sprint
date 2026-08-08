# Sprint Agent Project Log

This document records the product and architecture decisions made while Sprint Agent was developed and while the provider-independent Sprint repository was extracted. It is intended as handoff context for continuing the work in a new Codex workspace.

## Local Repositories and Vault

- Original Claudian-derived Sprint Agent worktree: `/Users/takahiro/TTLab/claudian`
- Extracted Sprint repository: `/Users/takahiro/TTLab/Sprint`
- Sample Obsidian vault: `/Users/takahiro/Documents/my-life-prototype`
- Sample agile workspace: `/Users/takahiro/Documents/my-life-prototype/Agile PM`
- Installed development plugin: `/Users/takahiro/Documents/my-life-prototype/.obsidian/plugins/sprint-agent`

The Sprint repository is initialized as a Git repository but currently has no initial commit and no remote.

## Product History

### Claudian Investigation

The work began by examining how Claudian runs AI providers. Claudian is a provider-backed Obsidian agent interface rather than a single direct Claude API client. Claude, Codex, Grok, OpenCode, and Pi have separate provider adapters, capabilities, runtime processes, settings, and provider-owned session state.

The initial product idea was an agile task-management agent built on top of Claudian.

### Agile Workspace

The sample workspace under `Agile PM` was used as the initial data model. Notion-style sprint behavior and the user's existing agile task-management article informed the requested workflow.

The following sprint behavior was implemented:

- Automatic sprint generation on a configurable 1-8 week cadence.
- Catch-up generation when one or more cycles were missed while Obsidian was closed.
- Current, next, last, past, and future lifecycle statuses.
- Review and retrospective fields.
- Incomplete-task policies: move to the current sprint, move to backlog, or keep in the original sprint.
- Global sprint defaults.
- Multiple sprint profiles with project roots, Tasks Base paths, Sprints Base paths, cadence anchors, and profile overrides.
- Native Obsidian Bases views with profile, board/list, and completed-task options stored in `.base` view configuration.

The Tasks and Sprints Bases were deliberately associated with the same sprint profile so they cannot create independent cadences.

### Naming and Attribution

The product name selected was **Sprint Agent** with the identifier `sprint-agent`. The author was changed to **Shijimi**.

The Claudian-derived repository was comprehensively renamed internally. A changelog and README were added, including explicit attribution that Sprint Agent is a fork of Claudian.

### Optional Built-In Agent Direction

The product was then framed as:

- Sprint management is the core product and must work without AI.
- Integrated AI is an optional power feature.
- Deterministic sprint services remain authoritative for dates, lifecycle, numbering, and rollover.
- AI may plan and manage tasks, but must not independently reproduce scheduling logic.

An AI task-management guide was created to teach agents how to inspect profiles, create and update tasks, assign existing sprints, plan capacity, draft reviews, and request confirmation for broad changes.

### Agent Personality

An optional local questionnaire was added to the Claudian-derived Sprint Agent implementation. It does not call an AI model. It configures:

- Agent name.
- Accountability level.
- Response detail.
- Additional communication guidance.
- One of four templates.

The four templates are:

1. **Cheerful Companion**: warm, optimistic, and quick to recognize meaningful progress.
2. **Accountability Coach**: motivating but strict, with direct follow-through on commitments.
3. **Calm Strategist**: composed, analytical, and focused on sustainable progress.
4. **Pragmatic Partner**: concise, candid, and centered on the next useful action.

A future opt-in direction was recorded for adapting motivational style using an inspectable personality-preference questionnaire inspired by 16-type tests. It must not be presented as a psychological diagnosis, and users must be able to inspect, correct, disable, and reset inferred preferences.

### Repository Separation Discussion

The desired long-term structure was identified as:

```text
Sprint Agent integration repository
├── Claudian repository or dependency
├── Sprint repository or dependency
└── small integration and branding layer
```

The objective was to make Claudian updates easier by keeping upstream Claudian code unchanged and placing Sprint behavior in a separate repository. Git submodules were discussed as a way to pin exact upstream commits, with automated compatibility-update pull requests rather than untested floating updates.

The main constraint is that Claudian is a complete Obsidian plugin and does not necessarily expose stable embedding hooks. Generic lifecycle, settings, prompt-appendix, and branding extension points would be preferable to a large patch queue.

## Sprint Repository Extraction

The provider-independent sprint implementation was migrated into `/Users/takahiro/TTLab/Sprint`.

The repository currently produces:

- A standalone Obsidian plugin with ID `sprint` and display name `Sprint`.
- An embeddable ESM package named `@sprint-agent/sprint`.
- TypeScript declarations for the public API.

The architecture is:

```text
src/domain/                  Provider- and Obsidian-independent behavior
src/obsidian/                Vault, Bases, settings, and storage adapters
src/SprintFeature.ts         Embeddable lifecycle and public API
src/main.ts                  Standalone Obsidian plugin entry point
docs/AGENT_GUIDE.md          Optional external-agent instructions
```

`SprintFeature` accepts an Obsidian plugin host and an optional settings store. Its default store persists under a namespaced `sprint` key while preserving unrelated host-plugin data.

Compatibility decisions:

- Keep the persisted Bases view type `sprint-agent-sprint-board`.
- Continue accepting the legacy single-workspace settings shape.
- Keep the default `agile-pm` profile and `Agile PM` folder layout.
- Do not remove the old sprint copy from the Claudian-derived worktree until integration against this repository is verified.

Current verification in the Sprint repository:

- TypeScript type checking passes.
- ESLint passes.
- 7 test suites and 14 tests pass.
- Standalone `main.js` and `styles.css` build successfully.
- Embeddable `dist/index.js` and declaration files build successfully.
- Package dry run succeeds without unresolved TypeScript path aliases.

## Latest Product Direction

The next direction changes the separation strategy:

- Turn this standalone **Sprint** repository into **Sprint Agent**.
- Do not bundle Claudian or any other AI-provider runtime.
- Keep the integration surface that allows external agents to understand and operate on Sprint data.
- Users may choose any agent capable of reading and editing their Obsidian vault, including Claudian, Claude Code, Codex, or another tool.
- Sprint Agent remains useful without an AI tool.

This avoids coupling the sprint plugin to provider processes, model settings, sessions, or APIs while retaining agent-aware task management.

## Requested Agent-Instruction Feature

Users need to be able to configure agent instructions in either:

1. Global Sprint Agent settings.
2. A specific Base view's settings.

Recommended precedence:

```text
Base-view instructions
    override or extend
Global agent instructions
    extend
Bundled Sprint task-management guide
```

The implementation should make the combination explicit. A per-Base setting should not silently replace safety and schema rules unless the user deliberately chooses replacement mode.

Recommended data model:

```ts
interface AgentInstructionSettings {
  enabled: boolean;
  globalInstructions: string;
  baseInstructionMode: 'append' | 'replace';
}

interface ResolvedAgentInstructions {
  bundledGuide: string;
  globalInstructions: string;
  baseInstructions: string;
  effectiveInstructions: string;
}
```

Recommended native Bases options:

```yaml
type: sprint-agent-sprint-board
sprintProfile: agile-pm
agentInstructionMode: append
agentInstructions: >-
  Prefer tasks that support the current quarterly objective.
```

Obsidian's custom Bases view options can persist a text field in each `.base` view. Because external agents may not open the custom view, Sprint Agent should also expose a deterministic way to resolve instructions directly from the `.base` file or export them to a known Markdown file.

## Recommended External-Agent Integration

The plugin should not attempt to discover or launch every possible agent. Instead, expose stable local integration artifacts:

- A bundled default guide.
- Resolved global and per-Base instructions.
- A command to copy effective agent instructions.
- A command to write or refresh an instruction file in the vault.
- A public API that returns sprint profiles, current sprint context, and effective instructions.
- Optional command/API operations for task creation, assignment, completion, and backlog movement.

Suggested generated file:

```text
.sprint-agent/AGENT_INSTRUCTIONS.md
```

An external tool such as Claude Code can read that file directly. Claudian or another Obsidian agent can consume the same content through the public API or normal vault-file access.

The generated file should contain no secrets and should clearly separate:

- Bundled immutable guidance.
- User global instructions.
- Profile/Base-specific instructions.
- Current resolved profile and Base paths.

## Next Implementation Steps

1. Rename the standalone plugin display name and manifest ID from Sprint to Sprint Agent and `sprint-agent`.
2. Decide whether the npm/module name remains `@sprint-agent/sprint` or changes to a public package name.
3. Add agent-instruction settings and normalization tests.
4. Add per-Base instruction options and precedence tests.
5. Add an instruction resolver independent of any AI provider.
6. Add copy/export commands and a public API for external agents.
7. Add deterministic task-operation APIs so agents do not need to hand-edit every frontmatter field.
8. Decide whether personality remains in this repository as provider-neutral prompt configuration or moves to a separate optional integration package.
9. Create an initial Git commit and configure the remote.
10. Only after the new plugin is verified, remove duplicated sprint code from the Claudian-derived worktree.

## Files to Read First in the New Workspace

1. `AGENTS.md`
2. `README.md`
3. `MIGRATION.md`
4. `docs/PROJECT_LOG.md`
5. `docs/AGENT_GUIDE.md`
6. `src/SprintFeature.ts`
7. `src/domain/types.ts`
8. `src/domain/SprintManager.ts`
9. `src/obsidian/SprintBasesView.ts`
10. `src/obsidian/SprintSettingTab.ts`
