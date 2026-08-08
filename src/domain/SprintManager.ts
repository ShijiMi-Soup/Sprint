import type {
  IncompleteTaskPolicy,
  SprintSettings,
} from './types';

import {
  resolveSprintProfile,
  type ResolvedSprintProfile,
} from './SprintSettings';
import {
  addDays,
  enumerateSprintStarts,
  getCurrentSprintStart,
  getLocalDate,
  getSprintEnd,
  getWeekStart,
} from './SprintSchedule';

export interface SprintVaultNote {
  path: string;
  basename: string;
}

export interface SprintVault {
  listMarkdownNotes(folder: string): SprintVaultNote[];
  getFrontmatter(note: SprintVaultNote): Record<string, unknown>;
  ensureFolder(folder: string): Promise<void>;
  createNote(
    path: string,
    frontmatter: Record<string, unknown>,
    body: string,
  ): Promise<SprintVaultNote>;
  updateFrontmatter(
    note: SprintVaultNote,
    mutation: (frontmatter: Record<string, unknown>) => void,
  ): Promise<void>;
}

export interface SprintSyncResult {
  created: number;
  movedTasks: number;
  updatedSprints: number;
  profilesSynced: number;
}

interface SprintRecord {
  note: SprintVaultNote;
  number: number;
  startDate: string | null;
  status: string | null;
}

const SPRINT_BODY = '## Goal\n\n\n## Review\n\n\n## Retrospective\n';

function normalizeFolder(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

function readSprintNumber(note: SprintVaultNote, frontmatter: Record<string, unknown>): number {
  const stored = frontmatter['sprint number'];
  if (typeof stored === 'number' && Number.isSafeInteger(stored) && stored > 0) {
    return stored;
  }
  const match = /^Sprint (\d+)$/.exec(note.basename);
  return match ? Number(match[1]) : 0;
}

function readDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function getSprintStatus(startDate: string, currentStart: string, nextStart: string): string {
  if (startDate === currentStart) return 'current';
  if (startDate === nextStart) return 'next';
  if (startDate < currentStart) {
    return 'past';
  }
  return 'future';
}

function sprintReferences(value: unknown, sprintName: string): boolean {
  const values = Array.isArray(value) ? value : [value];
  return values.some((entry) => {
    if (typeof entry !== 'string') return false;
    const normalized = entry.trim().replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0] ?? '';
    return normalized === sprintName || normalized.endsWith(`/${sprintName}`);
  });
}

function isTaskDone(frontmatter: Record<string, unknown>): boolean {
  if (frontmatter['is done'] === true) return true;
  const status = frontmatter.status;
  return typeof status === 'string'
    && ['done', 'complete', 'completed'].includes(status.trim().toLowerCase());
}

export class SprintManager {
  private syncTail: Promise<SprintSyncResult> = Promise.resolve({
    created: 0,
    movedTasks: 0,
    updatedSprints: 0,
    profilesSynced: 0,
  });

  constructor(
    private readonly vault: SprintVault,
    private readonly getSettings: () => SprintSettings,
    private readonly getToday: () => string = getLocalDate,
  ) {}

  sync(): Promise<SprintSyncResult> {
    const run = (): Promise<SprintSyncResult> => this.syncNow();
    this.syncTail = this.syncTail.then(run, run);
    return this.syncTail;
  }

  private async syncNow(): Promise<SprintSyncResult> {
    const settings = this.getSettings();
    if (!settings.enabled) {
      return { created: 0, movedTasks: 0, updatedSprints: 0, profilesSynced: 0 };
    }

    const result: SprintSyncResult = {
      created: 0,
      movedTasks: 0,
      updatedSprints: 0,
      profilesSynced: 0,
    };
    for (const profile of settings.profiles.filter((candidate) => candidate.enabled)) {
      const profileResult = await this.syncProfile(resolveSprintProfile(settings, profile));
      result.created += profileResult.created;
      result.movedTasks += profileResult.movedTasks;
      result.updatedSprints += profileResult.updatedSprints;
      result.profilesSynced += 1;
    }
    return result;
  }

  private async syncProfile(settings: ResolvedSprintProfile): Promise<SprintSyncResult> {
    const root = normalizeFolder(settings.rootFolder);
    if (!root) {
      throw new Error('Set a sprint profile root folder before enabling automatic sprints.');
    }

    const durationWeeks = Math.min(8, Math.max(1, Math.round(settings.durationWeeks)));
    const today = this.getToday();
    const sprintsFolder = `${root}/Sprints`;
    const tasksFolder = `${root}/Tasks`;
    await this.vault.ensureFolder(sprintsFolder);

    const records = this.readSprintRecords(sprintsFolder);
    const datedRecords = records.filter(
      (record): record is SprintRecord & { startDate: string } => record.startDate !== null,
    );
    const earliestStart = datedRecords.map((record) => record.startDate).sort()[0];
    const anchorDate = settings.anchorDate || earliestStart || getWeekStart(today, settings.startDay);
    const currentStart = getCurrentSprintStart(anchorDate, durationWeeks, today);
    const nextStart = addDays(currentStart, durationWeeks * 7);
    const lastFutureStart = addDays(
      currentStart,
      durationWeeks * 7 * Math.min(8, Math.max(1, Math.round(settings.futureSprintCount))),
    );
    const rolloverSources = records.filter((record) => (
      record.startDate !== null
      && record.startDate < currentStart
      && (record.status === 'current' || record.status === 'next')
    ));

    const existingStarts = new Set(datedRecords.map((record) => record.startDate));
    const latestStart = datedRecords.map((record) => record.startDate).sort().at(-1);
    const firstMissingCandidate = latestStart
      ? addDays(latestStart, durationWeeks * 7)
      : currentStart;
    const startsToConsider = firstMissingCandidate <= lastFutureStart
      ? enumerateSprintStarts(firstMissingCandidate, lastFutureStart, durationWeeks)
      : [];
    if (!existingStarts.has(currentStart)) startsToConsider.push(currentStart);
    if (!existingStarts.has(lastFutureStart)) startsToConsider.push(lastFutureStart);

    let nextNumber = Math.max(0, ...records.map((record) => record.number)) + 1;
    let created = 0;
    for (const startDate of Array.from(new Set(startsToConsider)).sort()) {
      if (existingStarts.has(startDate)) continue;
      const sprintName = settings.namingFormat.replaceAll('{number}', String(nextNumber)).trim();
      if (!sprintName || sprintName.includes('/')) {
        throw new Error(`Invalid sprint naming format: ${settings.namingFormat}`);
      }
      const note = await this.vault.createNote(
        `${sprintsFolder}/${sprintName}.md`,
        {
          'sprint number': nextNumber,
          'start date': startDate,
          'end date': getSprintEnd(startDate, durationWeeks),
          'sprint status': getSprintStatus(startDate, currentStart, nextStart),
          review: '',
          retrospective: '',
        },
        SPRINT_BODY,
      );
      records.push({
        note,
        number: nextNumber,
        startDate,
        status: getSprintStatus(startDate, currentStart, nextStart),
      });
      existingStarts.add(startDate);
      nextNumber += 1;
      created += 1;
    }

    const currentRecord = records.find((record) => record.startDate === currentStart);
    if (!currentRecord) {
      throw new Error(`Could not resolve the current sprint for ${currentStart}.`);
    }

    let movedTasks = 0;
    for (const source of rolloverSources) {
      movedTasks += await this.moveIncompleteTasks(
        tasksFolder,
        source.note.basename,
        currentRecord.note.basename,
        settings.incompleteTaskPolicy,
      );
    }

    const priorStarts = records
      .filter((record): record is SprintRecord & { startDate: string } => (
        record.startDate !== null && record.startDate < currentStart
      ))
      .map((record) => record.startDate)
      .sort();
    const lastStart = priorStarts.at(-1);
    let updatedSprints = 0;
    for (const record of records) {
      if (!record.startDate) continue;
      let expectedStatus = getSprintStatus(record.startDate, currentStart, nextStart);
      if (record.startDate === lastStart) expectedStatus = 'last';
      if (record.status === expectedStatus) continue;
      await this.vault.updateFrontmatter(record.note, (frontmatter) => {
        frontmatter['sprint status'] = expectedStatus;
        frontmatter['end date'] = getSprintEnd(record.startDate!, durationWeeks);
      });
      record.status = expectedStatus;
      updatedSprints += 1;
    }

    return { created, movedTasks, updatedSprints, profilesSynced: 1 };
  }

  private readSprintRecords(folder: string): SprintRecord[] {
    return this.vault.listMarkdownNotes(folder).map((note) => {
      const frontmatter = this.vault.getFrontmatter(note);
      return {
        note,
        number: readSprintNumber(note, frontmatter),
        startDate: readDate(frontmatter['start date']),
        status: typeof frontmatter['sprint status'] === 'string'
          ? frontmatter['sprint status']
          : null,
      };
    });
  }

  private async moveIncompleteTasks(
    tasksFolder: string,
    previousSprintName: string,
    currentSprintName: string,
    policy: IncompleteTaskPolicy,
  ): Promise<number> {
    if (policy === 'keep') return 0;

    let moved = 0;
    for (const note of this.vault.listMarkdownNotes(tasksFolder)) {
      const frontmatter = this.vault.getFrontmatter(note);
      if (isTaskDone(frontmatter) || !sprintReferences(frontmatter.sprint, previousSprintName)) {
        continue;
      }
      await this.vault.updateFrontmatter(note, (updated) => {
        if (policy === 'backlog') {
          delete updated.sprint;
        } else {
          updated.sprint = [`[[${currentSprintName}]]`];
        }
      });
      moved += 1;
    }
    return moved;
  }
}
