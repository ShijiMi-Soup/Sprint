# AI integration

Sprint does not include an AI model, make network requests to AI providers, or
depend on a particular coding assistant. It creates local instruction files so
an independently installed agent can understand the Sprint workspace.

## Generated instruction files

- `Sprint/AGENTS.md` describes the workspace paths and data conventions.
- `Sprint/CLAUDE.md` provides the same workspace guidance for Claude Code.
- `.agents/skills/sprint/SKILL.md` contains the reusable Sprint workflow for
  agents that support the Agent Skills convention.
- `.claude/skills/sprint/SKILL.md` contains the Claude Code skill.

Existing instruction files and unrelated skills are preserved. Optional
vault-root instruction sections are disabled by default and can be enabled in
**Settings -> Sprint -> AI skills**.

For the user-facing workspace contract, see the [Sprint reference](REFERENCE).
AI tools have their own permission and privacy behavior, so review those tools
before granting them access to your vault.

## What agents can manage

The generated guidance covers projects, tasks, sprint assignment, estimates,
state checkboxes, due dates, archived tasks, and sprint notes. It also explains
that generated support files should be changed additively and that reset is a
destructive operation.

Human users should normally add future sprints with Sprint's **Add Sprint** or
**Generate future sprint** controls. The generated skills also provide an
idempotent manual-creation procedure for AI agents that cannot invoke those
controls. Agents must derive the next number and dates from the configured
cadence and existing sprint notes, reject collisions, append rather than
overwrite, and allow Sprint synchronization to reconcile lifecycle statuses.
