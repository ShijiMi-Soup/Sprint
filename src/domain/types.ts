export type IncompleteTaskPolicy = 'next' | 'backlog' | 'keep';

export interface SprintDefaults {
  durationWeeks: number;
  startDay: number;
  incompleteTaskPolicy: IncompleteTaskPolicy;
  futureSprintCount: number;
  namingFormat: string;
}

export interface SprintProfileOverrides {
  durationWeeks?: number;
  startDay?: number;
  incompleteTaskPolicy?: IncompleteTaskPolicy;
  futureSprintCount?: number;
  namingFormat?: string;
}

export interface SprintProfile {
  id: string;
  name: string;
  enabled: boolean;
  rootFolder: string;
  tasksBasePath: string;
  sprintsBasePath: string;
  projectsBasePath: string;
  anchorDate: string;
  overrides: SprintProfileOverrides;
}

export interface SprintSettings {
  enabled: boolean;
  generateVaultRootInstructions: boolean;
  defaults: SprintDefaults;
  profiles: SprintProfile[];
}
