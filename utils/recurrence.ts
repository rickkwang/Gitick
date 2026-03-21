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

const nextWeekday = (base: Date): Date => {
  const next = new Date(base);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  return next;
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
      next.setMonth(next.getMonth() + 1);
      return toLocalIsoDate(next);
    case 'weekdays':
      return toLocalIsoDate(nextWeekday(anchor));
    default:
      return currentDueDate;
  }
};
