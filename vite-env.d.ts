/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

type GitickUpdaterStatus =
  | { type: 'checking' }
  | { type: 'available'; version?: string }
  | { type: 'not-available' }
  | { type: 'download-progress'; percent: number }
  | { type: 'downloaded'; version?: string }
  | { type: 'error'; message: string };

interface GitickDesktopApi {
  platform: string;
  updater?: {
    getVersion: () => Promise<string>;
    checkForUpdates: () => Promise<{ ok: boolean; reason?: string }>;
    downloadUpdate: () => Promise<{ ok: boolean; reason?: string }>;
    quitAndInstall: () => Promise<{ ok: boolean }>;
    onStatus: (callback: (payload: GitickUpdaterStatus) => void) => () => void;
  };
}

interface Window {
  gitickDesktop?: GitickDesktopApi;
}
