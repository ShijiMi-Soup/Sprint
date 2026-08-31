import { normalizeSprintSettings } from '@/domain/SprintSettings';
import { SprintSettingTab } from '@/obsidian/SprintSettingTab';

describe('SprintSettingTab', () => {
  it('defines renderable rows for every settings section', () => {
    const feature = {
      settings: normalizeSprintSettings({ rootFolder: 'Sprint' }),
      updateSettings: jest.fn(),
    };
    const tab = new SprintSettingTab({} as never, {} as never, feature as never);

    const definitions = tab.getSettingDefinitions();
    const automatic = definitions[0];
    expect(automatic).toMatchObject({ name: 'Automatic sprints' });
    expect(automatic && 'render' in automatic && typeof automatic.render).toBe('function');

    const groups = definitions.slice(1).map((definition) => {
      if (!('type' in definition) || definition.type === 'page') {
        throw new Error('Expected a settings group.');
      }
      return definition;
    });
    expect(groups.map((group) => group.heading)).toEqual([
      'Global defaults',
      'Workspace',
      'Maintenance',
      'AI skills',
    ]);
    for (const group of groups) {
      expect(group.items?.length).toBeGreaterThan(0);
      expect(group.items?.every((item) => 'render' in item && typeof item.render === 'function'))
        .toBe(true);
    }
  });

  it('renders the automatic-sprints control into the provided setting row', () => {
    const feature = {
      settings: normalizeSprintSettings({ rootFolder: 'Sprint' }),
      updateSettings: jest.fn(),
    };
    const tab = new SprintSettingTab({} as never, {} as never, feature as never);
    const automatic = tab.getSettingDefinitions()[0];
    const setting = {
      setDesc: jest.fn().mockReturnThis(),
      addToggle: jest.fn().mockReturnThis(),
    };

    if (!automatic || !('render' in automatic) || !automatic.render) {
      throw new Error('Automatic sprints setting is not renderable.');
    }
    automatic.render(setting as never, {} as never);

    expect(setting.setDesc).toHaveBeenCalled();
    expect(setting.addToggle).toHaveBeenCalled();
  });
});
