# Sprint development agents

Sprint defines four project-scoped Codex agents under `.codex/agents/`. They are
development tools for this repository and are not bundled with the Obsidian plugin or
installed into users' vaults.

## Roles

| Agent | Model | Mode | Use for |
| --- | --- | --- | --- |
| `sprint_product_engineer` | GPT-5.6 Terra, high | Workspace write | Bounded domain, Obsidian UI, settings, and Bases implementation. |
| `sprint_data_safety` | GPT-5.6 Terra, high | Workspace write | Migrations, startup, generated files, path handling, reinstall safety, and compatibility. |
| `sprint_qa_reviewer` | GPT-5.6 Terra, high | Read only | Correctness, regression, data-loss, compatibility, and test review. |
| `sprint_docs_release` | GPT-5.6 Luna, medium | Workspace write | VitePress, documentation, changelog, screenshots, and local release preparation. |

The primary agent owns architecture, requirements, task decomposition, file ownership,
integration, final verification, and communication with the user. Subagents never merge,
tag, publish, or perform external release actions.

## Delegation rules

1. Delegate only a bounded assignment with acceptance criteria, owned files, non-goals,
   expected tests, and a requested result format.
2. Prefer parallel work for independent exploration, tests, review, and documentation.
3. Avoid parallel write assignments that touch the same files or contract.
4. Require each implementation agent to return a summary, verification results,
   assumptions, and unresolved risks.
5. Have `sprint_qa_reviewer` inspect the integrated diff before release.
6. The primary agent runs `npm run check` and the documentation build after integration.
7. External writes, destructive operations, merges to `main`, tags, and releases require
   explicit user approval.

## Example assignment

```text
Use sprint_data_safety to design and implement missing-workspace recovery.
Acceptance criteria: automatic sync must stop when an initialized workspace is missing;
the user can locate it, intentionally create a replacement, or dismiss without repeated
hourly notices. Own SprintFeature, the recovery modal, and focused tests. Do not modify
Kanban rendering. Return the changed files, tests, assumptions, and remaining risks.
```

## Configuration

`.codex/config.toml` caps the repository at four concurrent subagent threads. Individual
agent files set their model, reasoning effort, and sandbox mode. Parent-session permission
overrides still apply when Codex starts a subagent.

