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
  anchorDate: string;
}

interface LegacySprintSettings {
  enabled?: boolean;
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
    anchorDate,
    overrides: {},
  };
}

export function normalizeSprintSettings(value: unknown): SprintSettings {
  const input = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
  const legacy = input as LegacySprintSettings;
  if (!input.defaults || !Array.isArray(input.profiles)) {
    return {
      enabled: legacy.enabled ?? false,
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
    defaults: { ...DEFAULTS, ...defaults },
    profiles: (input.profiles as SprintProfile[]).map((profile) => ({
      ...profileForRoot(profile.rootFolder, profile.anchorDate),
      ...profile,
      overrides: profile.overrides ?? {},
    })),
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
    anchorDate: profile.anchorDate,
    ...settings.defaults,
    ...profile.overrides,
  };
}
