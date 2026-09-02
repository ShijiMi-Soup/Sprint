# Documentation maintenance

Documentation is part of the definition of done for every user-visible Sprint
change.

## Required review

When behavior, settings, commands, generated files, properties, views, migration
rules, or AI instructions change:

1. Update [REFERENCE.md](REFERENCE.md).
2. Update the relevant installation guide when setup or onboarding changes:
   [English](INSTALLATION.md) and [Japanese](INSTALLATION_ja.md).
3. Update `README.md` and `README_ja.md` when the feature list, requirements,
   setup summary, or screenshots change.
4. Add a concise entry under **Unreleased** in `CHANGELOG.md`.
5. Update [TODO.md](TODO.md) when planned work is completed, added, or rescoped.
6. Update [AGENT_GUIDE.md](AGENT_GUIDE.md) and generated skill content when the
   task, project, sprint, or workspace contract changes.
7. Run `npm run check` before merging or releasing.

Pull requests repeat this review in `.github/pull_request_template.md` so the
requirement also applies to contributors who are not using a coding agent.

## Review limits

An automated check can verify links and site builds, but it cannot prove that a
behavioral explanation is accurate. The repository instruction in `AGENTS.md`
therefore requires the implementing agent or contributor to perform this review
as part of the same change.

When the documentation site is configured, its build should be added to CI so
broken links, invalid configuration, and rendering failures block publication.
