import {
  enumerateSprintStarts,
  getCurrentSprintStart,
  getSprintEnd,
} from '@/domain/SprintSchedule';

describe('SprintSchedule', () => {
  it('keeps a two-week cadence anchored to the configured start date', () => {
    expect(getCurrentSprintStart('2026-08-03', 2, '2026-08-07')).toBe('2026-08-03');
    expect(getCurrentSprintStart('2026-08-03', 2, '2026-08-16')).toBe('2026-08-03');
    expect(getCurrentSprintStart('2026-08-03', 2, '2026-08-17')).toBe('2026-08-17');
  });

  it('returns the inclusive sprint end date', () => {
    expect(getSprintEnd('2026-08-03', 1)).toBe('2026-08-09');
    expect(getSprintEnd('2026-08-03', 2)).toBe('2026-08-16');
  });

  it('enumerates missed sprint starts chronologically', () => {
    expect(enumerateSprintStarts('2026-07-20', '2026-08-17', 2)).toEqual([
      '2026-07-20',
      '2026-08-03',
      '2026-08-17',
    ]);
  });
});
