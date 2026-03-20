import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DESKTOP_FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18] as const;

export const normalizeDesktopFontSize = (value: number): number => {
  if (!Number.isFinite(value)) return 12;
  return DESKTOP_FONT_SIZE_OPTIONS.reduce((nearest, candidate) =>
    Math.abs(candidate - value) < Math.abs(nearest - value) ? candidate : nearest,
  );
};
