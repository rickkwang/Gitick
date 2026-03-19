import { getNextRecurringDueDate } from '../recurrence';

describe('recurrence utils', () => {
  it('handles daily recurrence', () => {
    expect(getNextRecurringDueDate('2026-03-19', { type: 'daily' })).toBe('2026-03-20');
  });

  it('handles weekly recurrence', () => {
    expect(getNextRecurringDueDate('2026-03-19', { type: 'weekly' })).toBe('2026-03-26');
  });

  it('handles monthly recurrence', () => {
    expect(getNextRecurringDueDate('2026-03-19', { type: 'monthly' })).toBe('2026-04-19');
  });

  it('handles weekdays recurrence from friday to monday', () => {
    expect(getNextRecurringDueDate('2026-03-20', { type: 'weekdays' })).toBe('2026-03-23');
  });

  it('returns unchanged date when no recurrence is provided', () => {
    expect(getNextRecurringDueDate('2026-03-19', null)).toBe('2026-03-19');
  });
});
