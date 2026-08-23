import type {
  IncompleteTaskPolicy,
  SprintDefaults,
  SprintProfile,
  SprintSettings,
} from './types';

export interface ResolvedSprintProfile extends SprintDefaults {
  id: string;
  name: string;
  rootFolder: string;
  tasksBasePath: string;
  sprintsBasePath: string;
  projectsBasePath: string;
  anchorDate: string;
}

interface LegacySprintSettings {
  enabled?: boolean;
  generateVaultRootInstructions?: boolean;
  rootFolder?: string;
  durationWeeks?: number;
  startDay?: number;
  anchorDate?: string;
  incompleteTaskPolicy?: IncompleteTaskPolicy;
}

const DEFAULTS: SprintDefaults = {
  durationWeeks: 1,
  startDay: 1,
  incompleteTaskPolicy: 'next',
  futureSprintCount: 1,
  namingFormat: 'Sprint {number}',
};

function profileForRoot(rootFolder: string, anchorDate = ''): SprintProfile {
  const root = rootFolder.trim().replace(/^\/+|\/+$/g, '') || 'Agile PM';
  return {
    id: 'agile-pm',
    name: root.split('/').at(-1) || 'Agile PM',
    enabled: true,
    rootFolder: root,
    tasksBasePath: `${root}/Bases/Tasks.base`,
    sprintsBasePath: `${root}/Bases/Sprints.base`,
    projectsBasePath: `${root}/Bases/Projects.base`,
    anchorDate,
    overrides: {},
  };
}

function defaultBasePath(rootFolder: string, filename: string): string {
  return `${rootFolder}/Bases/${filename}`;
}

function normalizeBasePath(
  path: string | undefined,
  rootFolder: string,
  filename: string,
): string {
  const trimmed = path?.trim() ?? '';
  if (!trimmed) return defaultBasePath(rootFolder, filename);
  if (
    trimmed.endsWith(`/Bases/${filename}`)
    && !trimmed.startsWith(`${rootFolder}/`)
  ) {
    return defaultBasePath(rootFolder, filename);
  }
  return trimmed;
}

export function normalizeSprintSettings(value: unknown): SprintSettings {
  const input = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const legacy = input as LegacySprintSettings;
  if (!input.defaults || !Array.isArray(input.profiles)) {
    return {
      enabled: legacy.enabled ?? false,
      generateVaultRootInstructions: legacy.generateVaultRootInstructions ?? false,
      defaults: {
        durationWeeks: legacy.durationWeeks ?? DEFAULTS.durationWeeks,
        startDay: legacy.startDay ?? DEFAULTS.startDay,
        incompleteTaskPolicy: legacy.incompleteTaskPolicy ?? DEFAULTS.incompleteTaskPolicy,
        futureSprintCount: DEFAULTS.futureSprintCount,
        namingFormat: DEFAULTS.namingFormat,
      },
      profiles: [profileForRoot(legacy.rootFolder ?? 'Agile PM', legacy.anchorDate)],
    };
  }

  const defaults = input.defaults as Partial<SprintDefaults>;
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : false,
    generateVaultRootInstructions: input.generateVaultRootInstructions === true,
    defaults: { ...DEFAULTS, ...defaults },
    profiles: (input.profiles as SprintProfile[]).map((profile) => {
      const normalized = {
        ...profileForRoot(profile.rootFolder, profile.anchorDate),
        ...profile,
        overrides: profile.overrides ?? {},
      };
      return {
        ...normalized,
        tasksBasePath: normalizeBasePath(normalized.tasksBasePath, normalized.rootFolder, 'Tasks.base'),
        sprintsBasePath: normalizeBasePath(normalized.sprintsBasePath, normalized.rootFolder, 'Sprints.base'),
        projectsBasePath: normalizeBasePath(normalized.projectsBasePath, normalized.rootFolder, 'Projects.base'),
      };
    }),
  };
}

export function resolveSprintProfile(
  settings: SprintSettings,
  profile: SprintProfile,
): ResolvedSprintProfile {
  return {
    id: profile.id,
    name: profile.name,
    rootFolder: profile.rootFolder,
    tasksBasePath: profile.tasksBasePath,
    sprintsBasePath: profile.sprintsBasePath,
    projectsBasePath: profile.projectsBasePath,
    anchorDate: profile.anchorDate,
    ...settings.defaults,
    ...profile.overrides,
  };
}
