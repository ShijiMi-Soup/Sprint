import { normalizeSprintSettings } from '@/domain/SprintSettings';
import { getSprintBasesOptions } from '@/obsidian/SprintBasesView';

describe('SprintBasesView', () => {
  it('offers profile and per-view display options stored by Obsidian Bases', () => {
    const settings = normalizeSprintSettings({ rootFolder: 'Agile PM' });

    expect(getSprintBasesOptions(settings)).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'sprintProfile', type: 'dropdown' }),
      expect.objectContaining({ key: 'layout', type: 'dropdown' }),
      expect.objectContaining({ key: 'showCompleted', type: 'toggle' }),
    ]));
  });
});
