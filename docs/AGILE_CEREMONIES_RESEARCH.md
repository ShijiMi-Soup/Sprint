# Agile Ceremony Research

Date: 2026-08-31

## Purpose

This document explores how Sprint could support iteration planning, daily check-ins,
sprint reviews, and retrospectives for a person working alone, with other people, or
with an external AI agent. It is research and product direction, not an implementation
specification.

The recommended direction follows the lightweight, practical style of
*The Agile Samurai* rather than attempting to enforce every part of Scrum.

## Principles

1. Every ceremony must produce a useful change to the plan, the work, or the way of
   working. Sprint should not reward holding a meeting for its own sake.
2. The user remains the decision maker. An AI agent may prepare, facilitate, summarize,
   and propose changes, but it must not silently commit scope or declare work complete.
3. Existing task, project, and sprint notes remain the sources of truth. Meeting notes
   should reference and update those artifacts instead of becoming a parallel backlog.
4. The flow should work without an AI provider. AI assistance is an optional interface
   over the same provider-independent commands and files.
5. The board should make intent and progress visible. This matches both Scrum's emphasis
   on transparent artifacts and *The Agile Samurai*'s visual-workspace approach.
6. Users should be able to adapt or disable ceremonies that do not help them.

## Typical Iteration Flow

### 0. Project inception (occasional)

This happens when a project is created or substantially redirected, not every sprint.
An inception conversation establishes:

- why the project exists;
- the desired outcome and audience;
- what is explicitly out of scope;
- major risks and unknowns;
- the proposed solution and key constraints;
- time, capacity, and trade-offs;
- a product or project goal.

This is strongly aligned with the Inception Deck in *The Agile Samurai*. Sprint could
eventually offer a guided project-start note, but this is separate from the first
ceremony MVP.

### 1. Refine stories and tasks (ongoing)

Before planning, candidate work should be understandable and small enough to complete
within a sprint. Typical refinement work includes:

- clarifying the outcome and acceptance criteria;
- linking the task to a project;
- splitting oversized tasks;
- estimating relative effort;
- identifying dependencies and blockers;
- deciding whether the task is ready to plan.

*The Agile Samurai* describes this as story gathering and story planning. Scrum treats
backlog refinement as an ongoing activity rather than a formal event.

### 2. Start the sprint / iteration planning

Planning answers three questions:

1. **Why?** Define one sprint goal that explains the value of the sprint.
2. **What?** Select coherent work using priorities, readiness, capacity, and recent
   velocity.
3. **How?** Confirm the immediate plan, dependencies, and first actions.

Suggested Sprint flow:

1. Show unfinished work and the configured rollover decision.
2. Show candidate tasks, recent velocity, and available capacity.
3. Ask for a concise sprint goal.
4. Let the user select or approve proposed tasks.
5. Flag work that is unestimated, oversized, blocked, or unrelated to the goal.
6. Save the goal and planning summary to the sprint note.
7. Apply task assignments only after confirmation.
8. Mark the planning session complete without changing the scheduler's lifecycle dates.

The result is a sprint goal plus the selected task set and an actionable initial plan.

### 3. Daily check-in

The Daily Scrum is a short planning event, not a status report. Its purpose is to inspect
progress toward the sprint goal and create an actionable plan for the next working day.

Suggested prompts:

- What changed since the previous check-in?
- What matters most before the next check-in?
- What is blocked, uncertain, or at risk?
- Does the sprint plan need to change to protect the sprint goal?

Suggested Sprint flow:

1. Pre-fill recently completed, started, added, or moved tasks from vault state.
2. Show progress toward the sprint goal and remaining work.
3. Collect the user's focus and impediments.
4. Propose concrete task-state or priority changes.
5. Save a dated, short check-in record.
6. Apply approved changes to task notes.

For a solo user, the check-in can be asynchronous and take one or two minutes. Sprint
should not force the historical three-question format; the current Scrum Guide permits
any structure that produces focus and an actionable daily plan.

### 4. Showcase / sprint review

The review inspects outcomes and gathers feedback. It should demonstrate completed,
usable work rather than merely list activity.

Suggested Sprint flow:

1. Show the sprint goal and completed tasks.
2. Ask what outcome, artifact, or result can be demonstrated.
3. Record feedback, changed assumptions, and new opportunities.
4. Create proposed follow-up tasks in the backlog, with user approval.
5. Record whether the sprint goal was achieved and why.

This should remain distinct from the retrospective: the review examines the result;
the retrospective examines how the work was done.

### 5. Mini-retrospective

The retrospective identifies a small improvement to quality or effectiveness.

Suggested prompts:

- What helped?
- What made the work harder?
- What did we learn or assume incorrectly?
- What one experiment should we try next sprint?

Suggested Sprint flow:

1. Pre-fill facts from the sprint: throughput, rollover, scope changes, blockers, and
   check-in history.
2. Keep observations separate from interpretations.
3. Select one or two improvement experiments.
4. Optionally create an improvement task for the next sprint.
5. Save the retrospective to the sprint note.

The *Agile Samurai* framing of a mini-retrospective is appropriate for Sprint's personal
and small-team audience. A short useful reflection is preferable to a large template.

### 6. Close the sprint

Closing should be a guided workflow that verifies records and decisions; it should not
be a separate ceremony that duplicates the review and retrospective.

Suggested checks:

- review completed or explicitly skipped;
- retrospective completed or explicitly skipped;
- unfinished tasks have an approved rollover destination;
- completed points and task counts have been captured;
- follow-up and improvement tasks have been created;
- the next sprint is ready for planning.

The scheduler remains authoritative for dates and lifecycle status. Closing a meeting
must not rewrite sprint dates or create a competing lifecycle.

## Recommended Product Model

### Meeting records

Store meeting records beneath the configured Sprint workspace, for example:

```text
Sprint/
  Meetings/
    Sprint 7 Planning.md
    2026-08-31 Daily Check-in.md
    Sprint 7 Review.md
    Sprint 7 Retrospective.md
```

Each record should have typed frontmatter:

```yaml
---
meeting type: daily
sprint:
  - "[[Sprint 7]]"
meeting date: 2026-08-31
meeting status: complete
facilitator: self
---
```

An alternative is to store planning, review, and retrospective directly in the sprint
note and create separate files only for daily check-ins. This is probably the better MVP
because the current sprint schema already has `review` and `retrospective` fields.

### Session states

Use a small explicit state machine for interactive sessions:

```text
not started -> in progress -> complete
                         \-> cancelled
```

Draft answers must be recoverable. Completing a session should show the proposed vault
changes and require confirmation before applying them.

### Provider-independent commands

The domain and Obsidian adapter should expose operations such as:

- get ceremony context;
- start planning, daily, review, or retrospective session;
- save a draft response;
- preview proposed task and sprint changes;
- apply approved changes;
- complete or cancel a session.

The built-in UI, command palette, Claude Code skill, and Codex skill should all use the
same concepts. No provider API belongs in Sprint.

## AI Agent Responsibilities

An optional agent can:

- assemble relevant sprint, task, project, and recent-meeting context;
- ask one focused question at a time;
- identify blockers, over-commitment, stale work, and contradictions;
- summarize discussion into a draft record;
- propose task creation, state changes, estimates, or rollover;
- explain why a proposal supports the sprint goal.

An agent must not:

- mark a task done without evidence or user confirmation;
- invent completed work, feedback, blockers, or meeting participants;
- change cadence, dates, or sprint numbering;
- apply a batch of planning or closing changes without showing the user;
- turn the ceremony into generic coaching disconnected from vault data.

Research on LLM assistants in real Agile meetings suggests value in reducing
organizational work and identifying risks, but also treats team readiness and
collaboration dynamics as important. Sprint should therefore begin with preparation,
facilitation, and drafting rather than autonomous meeting control.

## Recommended MVP Sequence

### Phase 1: Sprint fields and manual commands

- Add a sprint goal and optional outcome field to sprint notes and views.
- Add commands to start planning, record a daily check-in, review, and retrospective.
- Generate concise Markdown templates using current vault data.
- Reuse the existing review and retrospective fields where practical.
- Update agent skills with the same ceremony protocol.

### Phase 2: Guided built-in sessions

- Add recoverable session drafts and a focused modal or view.
- Preview task changes before applying them.
- Add a close-sprint checklist that works with existing rollover behavior.
- Show ceremony completion in the sprint overview.

### Phase 3: Project inception and learning

- Add a lightweight Inception Deck workflow for new projects.
- Track retrospective experiments into the next sprint.
- Surface patterns from prior check-ins and retrospectives without presenting inference
  as fact.

## Decisions to Make Before Implementation

1. Should daily check-ins be separate notes, sections in the sprint note, or one running
   daily log per sprint?
2. Should "start sprint" mean opening planning, completing planning, or changing a new
   explicit workflow status? Calendar lifecycle must remain independent.
3. Can review and retrospective be explicitly skipped, and should Sprint record a reason?
4. Which task mutations can be applied immediately and which always require a preview?
5. Should a solo check-in default to a command-driven modal or a generated Markdown note?
6. Is the first release optimized only for individuals, or must it model multiple
   participants and facilitators immediately?

## Recommendation

Start with a **solo-first ceremony companion**:

- planning at the beginning of a sprint;
- a one-to-two-minute daily check-in;
- a showcase-style review;
- a mini-retrospective;
- a close checklist that delegates dates and rollover to the existing scheduler.

The first implementation should use generated Markdown plus command-palette entry points.
That keeps the records portable, works without AI, and gives external agents a stable
workflow. A richer meeting UI can follow once the note schema and user flow have been
tested in real vaults.

## Sources

- [The Scrum Guide (2020)](https://scrumguides.org/scrum-guide.html)
- [Scrum Guide revision notes](https://scrumguides.org/revisions.html)
- [Agile Manifesto principles](https://agilemanifesto.org/principles.html)
- [*The Agile Samurai* Japanese edition, Ohmsha](https://www.ohmsha.co.jp/book/9784274068560.html)
- [*The Agile Samurai* contents and showcase excerpt, O'Reilly](https://www.oreilly.com/library/view/the-agile-samurai/9781680500066/f_0073.html)
- [Exploring Human-AI Collaboration in Agile: Customised LLM Meeting Assistants](https://arxiv.org/abs/2404.14871)
