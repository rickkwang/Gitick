export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const todayLocalIsoDate = (): string => toLocalIsoDate(new Date());

export const addDaysLocalIsoDate = (days: number, baseDate = new Date()): string => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
};

export const formatIsoDateForDisplay = (dateStr?: string, locale = 'en-US'): string | null => {
  if (!dateStr) return null;

  const today = todayLocalIsoDate();
  if (dateStr === today) return 'Today';

  const tomorrow = addDaysLocalIsoDate(1);
  if (dateStr === tomorrow) return 'Tomorrow';

  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
};

export const isWithinNextDays = (dateStr: string | undefined, days: number): boolean => {
  if (!dateStr) return false;
  const end = addDaysLocalIsoDate(days);
  return dateStr <= end;
};
