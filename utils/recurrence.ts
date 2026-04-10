import { RecurrenceRule } from '../types';
import { toLocalIsoDate } from './date';

const isoToLocalDate = (iso: string): Date | null => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  // Validate: invalid dates silently roll over (e.g., 2024-02-30 → Mar 1)
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

// nextWeekday skips weekend days (Saturday=6, Sunday=0).
// Note: This is a simplified implementation that always skips weekends.
// A more complete solution would allow configuring which days to skip.
const nextWeekday = (base: Date): Date => {
  const next = new Date(base);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  return next;
};

const nextMonthSameDayOrLast = (base: Date): Date => {
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();

  const targetMonth = month + 1;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = targetMonth % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedTargetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(targetYear, normalizedTargetMonth, targetDay);
};

export const getNextRecurringDueDate = (
  currentDueDate: string | undefined,
  recurrence: RecurrenceRule | null | undefined,
): string | undefined => {
  if (!recurrence) return currentDueDate;

  const anchor = currentDueDate ? isoToLocalDate(currentDueDate) : new Date();
  if (!anchor) return currentDueDate;

  const next = new Date(anchor);

  switch (recurrence.type) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      return toLocalIsoDate(next);
    case 'weekly':
      next.setDate(next.getDate() + 7);
      return toLocalIsoDate(next);
    case 'monthly':
      return toLocalIsoDate(nextMonthSameDayOrLast(anchor));
    case 'weekdays':
      next.setDate(next.getDate() + 1);
      return toLocalIsoDate(nextWeekday(next));
    default:
      return currentDueDate;
  }
};
