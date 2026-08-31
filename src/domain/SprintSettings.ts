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
  onboardingComplete?: boolean;
  generateVaultRootInstructions?: boolean;
  skillCustomInstructions?: Record<string, string>;
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

// Increment when an upgrade must rerun Base or support-file migrations.
export const CURRENT_SUPPORT_SCHEMA_VERSION = 1;

function profileForRoot(rootFolder: string, anchorDate = ''): SprintProfile {
  const root = rootFolder.trim().replace(/^\/+|\/+$/g, '') || 'Sprint';
  return {
    id: 'agile-pm',
    name: root.split('/').at(-1) || 'Sprint',
    enabled: true,
    rootFolder: root,
    tasksBasePath: `${root}/Tasks.base`,
    sprintsBasePath: `${root}/Sprints.base`,
    projectsBasePath: `${root}/Projects.base`,
    anchorDate,
    samplesInitialized: false,
    overrides: {},
  };
}

function defaultBasePath(rootFolder: string, filename: string): string {
  return `${rootFolder}/${filename}`;
}

function normalizeBasePath(
  path: string | undefined,
  rootFolder: string,
  filename: string,
): string {
  const trimmed = path?.trim() ?? '';
  if (!trimmed) return defaultBasePath(rootFolder, filename);
  if (trimmed === `${rootFolder}/Bases/${filename}`) {
    return defaultBasePath(rootFolder, filename);
  }
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
  const hasStoredSettings = Object.keys(input).length > 0;
  if (!input.defaults || !Array.isArray(input.profiles)) {
    return {
      enabled: legacy.enabled ?? false,
      onboardingComplete: legacy.onboardingComplete ?? hasStoredSettings,
      supportSchemaVersion: 0,
      generateVaultRootInstructions: legacy.generateVaultRootInstructions ?? false,
      skillCustomInstructions: normalizeSkillInstructions(legacy.skillCustomInstructions),
      defaults: {
        durationWeeks: legacy.durationWeeks ?? DEFAULTS.durationWeeks,
        startDay: legacy.startDay ?? DEFAULTS.startDay,
        incompleteTaskPolicy: legacy.incompleteTaskPolicy ?? DEFAULTS.incompleteTaskPolicy,
        futureSprintCount: DEFAULTS.futureSprintCount,
        namingFormat: DEFAULTS.namingFormat,
      },
      profiles: [profileForRoot(legacy.rootFolder ?? 'Sprint', legacy.anchorDate)],
    };
  }

  const defaults = input.defaults as Partial<SprintDefaults>;
  const storedProfile = (input.profiles as SprintProfile[])[0] ?? profileForRoot('Sprint');
  const normalizedProfile = {
    ...profileForRoot(storedProfile.rootFolder, storedProfile.anchorDate),
    ...storedProfile,
    enabled: true,
    samplesInitialized: storedProfile.samplesInitialized ?? (input.profiles as SprintProfile[]).length > 0,
    overrides: storedProfile.overrides ?? {},
  };
  return {
    enabled: typeof input.enabled === 'boolean' ? input.enabled : false,
    onboardingComplete: typeof input.onboardingComplete === 'boolean'
      ? input.onboardingComplete
      : true,
    supportSchemaVersion: typeof input.supportSchemaVersion === 'number'
      ? Math.max(0, Math.floor(input.supportSchemaVersion))
      : 0,
    generateVaultRootInstructions: input.generateVaultRootInstructions === true,
    skillCustomInstructions: normalizeSkillInstructions(input.skillCustomInstructions),
    defaults: { ...DEFAULTS, ...defaults },
    profiles: [{
      ...normalizedProfile,
      tasksBasePath: normalizeBasePath(
        normalizedProfile.tasksBasePath,
        normalizedProfile.rootFolder,
        'Tasks.base',
      ),
      sprintsBasePath: normalizeBasePath(
        normalizedProfile.sprintsBasePath,
        normalizedProfile.rootFolder,
        'Sprints.base',
      ),
      projectsBasePath: normalizeBasePath(
        normalizedProfile.projectsBasePath,
        normalizedProfile.rootFolder,
        'Projects.base',
      ),
    }],
  };
}

function normalizeSkillInstructions(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => (
      typeof entry[1] === 'string' && entry[1].trim().length > 0
    ))
    .map(([key, instructions]) => [key, instructions.trim()]));
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
