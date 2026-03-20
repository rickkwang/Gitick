export const STORAGE_KEYS = {
  tasks: 'gitick-tasks',
  projects: 'gitick-projects',
  profile: 'gitick-profile',
  sidebarCollapsed: 'gitick-sidebar-collapsed',
  theme: 'gitick-theme',
  desktopFontSize: 'gitick-desktop-font-size',
} as const;

export const LEGACY_STORAGE_KEYS = {
  tasks: 'zendo-tasks',
  projects: 'zendo-projects',
  profile: 'zendo-profile',
  sidebarCollapsed: 'zendo-sidebar-collapsed',
  theme: 'zendo-theme',
  desktopFontSize: 'zendo-desktop-font-size',
} as const;

export const readStoredValue = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read localStorage key: ${key}`, error);
    return null;
  }
};

export const readStoredJson = <T>(
  keys: string[],
  fallback: T,
  parse?: (value: unknown) => T,
): T => {
  if (typeof window === 'undefined') return fallback;

  for (const key of keys) {
    const raw = readStoredValue(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      return parse ? parse(parsed) : (parsed as T);
    } catch (error) {
      console.error(`Failed to parse localStorage key: ${key}`, error);
    }
  }

  return fallback;
};

export const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const getLocalStorageUsage = (): { used: number; available: boolean } => {
  let used = 0;
  try {
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        used += localStorage.getItem(key)?.length ?? 0;
      }
    }
  } catch {
    return { used: 0, available: false };
  }
  return { used, available: true };
};

export const writeStoredJson = (key: string, value: unknown): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error(`localStorage quota exceeded for key: ${key}. Consider clearing old data.`);
    } else {
      console.error(`Failed to persist localStorage key: ${key}`, error);
    }
    return false;
  }
};

export const writeStoredValue = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to persist localStorage key: ${key}`, error);
  }
};

export const removeStoredKeys = (keys: string[]) => {
  if (typeof window === 'undefined') return;
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove localStorage key: ${key}`, error);
    }
  });
};
