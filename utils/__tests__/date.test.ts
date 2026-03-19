import {
  addDaysLocalIsoDate,
  formatIsoDateForDisplay,
  toLocalIsoDate,
  todayLocalIsoDate,
} from '../date';

describe('date utils', () => {
  it('formats Date to local ISO date', () => {
    const date = new Date(2026, 2, 13, 9, 30, 0); // 2026-03-13 local
    expect(toLocalIsoDate(date)).toBe('2026-03-13');
  });

  it('adds days from base date', () => {
    const base = new Date(2026, 2, 13, 9, 30, 0);
    expect(addDaysLocalIsoDate(7, base)).toBe('2026-03-20');
  });

  it('formats today/tomorrow as relative labels', () => {
    const today = todayLocalIsoDate();
    const tomorrow = addDaysLocalIsoDate(1);

    expect(formatIsoDateForDisplay(today)).toBe('Today');
    expect(formatIsoDateForDisplay(tomorrow)).toBe('Tomorrow');
  });

  it('returns original input for invalid date string', () => {
    expect(formatIsoDateForDisplay('not-a-date')).toBe('not-a-date');
  });
});
