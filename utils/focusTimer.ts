export type FocusModeType = 'focus' | 'break';

export const FOCUS_DEFAULT_SECONDS = 25 * 60;
export const BREAK_DEFAULT_SECONDS = 5 * 60;

export const getDefaultFocusSeconds = (mode: FocusModeType): number =>
  mode === 'focus' ? FOCUS_DEFAULT_SECONDS : BREAK_DEFAULT_SECONDS;

export const formatTimerLabel = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};
