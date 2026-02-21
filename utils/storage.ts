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

export const writeStoredJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist localStorage key: ${key}`, error);
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
