# Sprint development agents

Sprint uses a Sol primary agent with two optional project-scoped agents under
`.codex/agents/`. These are development tools for this repository and are not bundled
with the Obsidian plugin or installed into users' vaults.

## Roles

| Agent | Model | Mode | Use for |
| --- | --- | --- | --- |
| `sprint_qa_reviewer` | GPT-5.6 Terra, high | Read only | Correctness, regression, data-loss, compatibility, and test review. |
| `sprint_docs_release` | GPT-5.6 Luna, medium | Workspace write | VitePress, documentation, changelog, screenshots, and local release preparation. |

The Sol primary agent performs normal planning, implementation, testing, documentation,
integration, final verification, and communication with the user. Subagents are opt-in:
use the reviewer for high-risk changes or release candidates, and use the documentation
agent only for substantial documentation work. Subagents never merge, tag, publish, or
perform external release actions.

## Delegation rules

1. Do not delegate routine feature implementation; the Sol primary owns it end to end.
2. Invoke `sprint_qa_reviewer` for migrations, destructive or data-sensitive behavior,
   large shared-component refactors, difficult regressions, and release candidates.
3. Invoke `sprint_docs_release` only when English/Japanese or VitePress work is large
   enough to benefit from a separate bounded pass.
4. Give every delegated task explicit acceptance criteria, file ownership, non-goals,
   expected checks, and a requested result format.
5. Avoid overlapping writes. The reviewer remains read only.
6. The primary agent evaluates every result and runs `npm run check` plus the
   documentation build after integration.
7. External writes, destructive operations, merges to `main`, tags, and releases require
   explicit user approval.

## Example assignment

```text
Review the missing-workspace recovery implementation with `sprint_qa_reviewer`.
Check startup, reinstall, rename, missing-folder, reset, and repeat-sync paths for data
loss or unintended workspace recreation. Do not edit files. Return findings ordered by
severity with reproduction conditions, file references, and missing regression tests.
```

## Configuration

`.codex/config.toml` caps the repository at two concurrent subagent threads. Individual
agent files set their model, reasoning effort, and sandbox mode. Parent-session permission
overrides still apply when Codex starts a subagent. Keeping these definitions in the
repository does not run them automatically; the primary must explicitly delegate work.
