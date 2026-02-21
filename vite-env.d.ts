/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

type GitickUpdaterStatus =
  | { type: 'checking' }
  | { type: 'available'; version?: string }
  | { type: 'not-available' }
  | { type: 'download-progress'; percent: number }
  | { type: 'downloaded'; version?: string }
  | { type: 'error'; message: string; reason?: string };

interface GitickUpdaterResult {
  ok: boolean;
  reason?: string;
  message?: string;
}

interface GitickUpdaterDiagnosis extends GitickUpdaterResult {
  warningReason?: string;
  warningMessage?: string;
  details?: {
    isMac: boolean;
    isDev: boolean;
    executablePath: string;
    bundlePath: string | null;
    inApplicationsFolder: boolean | null;
    isTranslocated: boolean;
    signatureStatus: string;
    teamIdentifier: string | null;
  };
}

interface GitickDesktopApi {
  platform: string;
  updater?: {
    getVersion: () => Promise<string>;
    diagnose: () => Promise<GitickUpdaterDiagnosis>;
    checkForUpdates: () => Promise<GitickUpdaterResult>;
    downloadUpdate: () => Promise<GitickUpdaterResult>;
    quitAndInstall: () => Promise<GitickUpdaterResult>;
    moveToApplications: () => Promise<{ ok: boolean; reason?: string; message?: string }>;
    onStatus: (callback: (payload: GitickUpdaterStatus) => void) => () => void;
  };
}

interface Window {
  gitickDesktop?: GitickDesktopApi;
}
