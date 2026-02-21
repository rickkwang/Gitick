const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawnSync } = require('child_process');

const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';
let mainWindow = null;
let updaterCheckTask = null;
let updaterDownloadTask = null;

const sendUpdaterStatus = (payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:status', payload);
};

const classifyUpdaterReason = (rawMessage = '', fallbackReason = 'unknown') => {
  const message = String(rawMessage).toLowerCase();
  if (message.includes('/applications') || message.includes('not-in-applications')) return 'not-in-applications';
  if (message.includes('apptranslocation') || message.includes('translocated')) return 'translocated-app';
  if (message.includes('zip file not provided') || message.includes('err_updater_zip_file_not_found')) return 'zip-missing';
  if (message.includes('network') || message.includes('timeout') || message.includes('econn')) return 'network';
  if (message.includes('not found') || message.includes('404')) return 'metadata-missing';
  if (message.includes('code object is not signed') || message.includes('signature') || message.includes('codesign')) {
    return 'signature-invalid';
  }
  return fallbackReason;
};

const getMacBundlePath = () => {
  const executablePath = app.getPath('exe');
  const marker = '.app/Contents/MacOS/';
  const markerIndex = executablePath.indexOf(marker);
  if (markerIndex >= 0) {
    return executablePath.slice(0, markerIndex + 4);
  }
  return executablePath;
};

const readMacCodeSignature = (targetPath) => {
  const result = spawnSync('codesign', ['-dv', '--verbose=4', targetPath], {
    encoding: 'utf8',
  });
  const raw = `${result.stdout || ''}\n${result.stderr || ''}`.trim();

  if (result.error) {
    return { status: 'error', raw: result.error.message };
  }

  if (result.status !== 0) {
    if (raw.toLowerCase().includes('code object is not signed at all')) {
      return { status: 'unsigned', raw };
    }
    return { status: 'error', raw };
  }

  if (/signature=adhoc/i.test(raw) || /teamidentifier=not set/i.test(raw)) {
    return {
      status: 'adhoc',
      raw,
      teamIdentifier: null,
    };
  }

  const teamIdentifierMatch = raw.match(/TeamIdentifier=(.+)/);
  return {
    status: 'signed',
    raw,
    teamIdentifier: teamIdentifierMatch?.[1]?.trim() || null,
  };
};

const diagnoseUpdaterInstall = () => {
  const details = {
    isMac,
    isDev,
    executablePath: app.getPath('exe'),
    bundlePath: null,
    inApplicationsFolder: null,
    isTranslocated: false,
    signatureStatus: 'skipped',
    teamIdentifier: null,
  };

  if (!isMac || isDev) {
    return { ok: true, details };
  }

  const bundlePath = getMacBundlePath();
  details.bundlePath = bundlePath;
  details.inApplicationsFolder = typeof app.isInApplicationsFolder === 'function' ? app.isInApplicationsFolder() : null;
  details.isTranslocated =
    details.executablePath.includes('/AppTranslocation/') || bundlePath.includes('/AppTranslocation/');

  if (details.isTranslocated) {
    return {
      ok: false,
      reason: 'translocated-app',
      message: 'Gitick.app is running from a translocated path. Move it to /Applications and reopen before installing updates.',
      details,
    };
  }

  if (details.inApplicationsFolder === false) {
    return {
      ok: false,
      reason: 'not-in-applications',
      message: 'In-app updates on macOS require Gitick.app to be installed in /Applications.',
      details,
    };
  }

  const signature = readMacCodeSignature(bundlePath);
  details.signatureStatus = signature.status;
  details.teamIdentifier = signature.teamIdentifier || null;

  if (signature.status === 'unsigned') {
    return {
      ok: false,
      reason: 'unsigned-app',
      message: 'Current app bundle is unsigned. In-app update install cannot complete. Please install a signed build from DMG.',
      details,
    };
  }

  if (signature.status === 'error') {
    return {
      ok: false,
      reason: 'signature-check-failed',
      message: `Unable to validate app code signature: ${signature.raw || 'unknown error'}`,
      details,
    };
  }

  if (signature.status === 'adhoc') {
    return {
      ok: true,
      warningReason: 'adhoc-signature',
      warningMessage: 'Current build is ad-hoc signed. In-app update reliability may be limited on some macOS setups.',
      details,
    };
  }

  return { ok: true, details };
};

const moveAppToApplicationsFolder = () => {
  if (!isMac || isDev) {
    return { ok: false, reason: 'unsupported' };
  }

  if (typeof app.isInApplicationsFolder === 'function' && app.isInApplicationsFolder()) {
    return { ok: true, reason: 'already-in-applications' };
  }

  try {
    const moved = app.moveToApplicationsFolder({
      conflictHandler: () => true,
    });
    if (!moved) {
      return { ok: false, reason: 'user-cancelled' };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: 'move-failed',
      message: error?.message || 'Unable to move app to /Applications.',
    };
  }
};

const setupAutoUpdater = () => {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  // Older releases may miss blockmap artifacts; full download is more reliable.
  autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterStatus({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdaterStatus({ type: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdaterStatus({ type: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterStatus({
      type: 'download-progress',
      percent: Math.round(progress.percent || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterStatus({ type: 'downloaded', version: info.version });
  });

  autoUpdater.on('error', (error) => {
    const message = error?.message || 'Unknown update error';
    sendUpdaterStatus({
      type: 'error',
      reason: classifyUpdaterReason(message),
      message,
    });
  });
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: isMac ? '' : 'Gitick',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff',
    autoHideMenuBar: true,
    titleBarStyle: isMac ? 'hidden' : 'default',
    titleBarOverlay: false,
    trafficLightPosition: isMac ? { x: 14, y: 12 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('updater:get-version', () => app.getVersion());
ipcMain.handle('updater:diagnose', () => diagnoseUpdaterInstall());

ipcMain.handle('updater:check', async () => {
  if (isDev) {
    return { ok: false, reason: 'dev-mode' };
  }
  if (updaterCheckTask) {
    return { ok: true, reason: 'in-progress' };
  }
  updaterCheckTask = autoUpdater.checkForUpdates()
    .finally(() => {
      updaterCheckTask = null;
    });
  try {
    await updaterCheckTask;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: classifyUpdaterReason(error?.message, 'check-failed'),
      message: error?.message || 'Unable to check updates right now.',
    };
  }
});

ipcMain.handle('updater:download', async () => {
  if (isDev) {
    return { ok: false, reason: 'dev-mode' };
  }
  if (updaterDownloadTask) {
    return { ok: true, reason: 'in-progress' };
  }
  updaterDownloadTask = autoUpdater.downloadUpdate()
    .finally(() => {
      updaterDownloadTask = null;
    });
  try {
    await updaterDownloadTask;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: classifyUpdaterReason(error?.message, 'download-failed'),
      message: error?.message || 'Unable to download update right now.',
    };
  }
});

ipcMain.handle('updater:quit-install', () => {
  if (!isDev) {
    const readiness = diagnoseUpdaterInstall();
    if (!readiness.ok) {
      sendUpdaterStatus({
        type: 'error',
        reason: readiness.reason,
        message: readiness.message,
      });
      return {
        ok: false,
        reason: readiness.reason,
        message: readiness.message,
      };
    }
    setImmediate(() => autoUpdater.quitAndInstall());
  }
  return { ok: true };
});

ipcMain.handle('updater:move-to-applications', () => {
  const result = moveAppToApplicationsFolder();
  if (!result.ok && result.message) {
    sendUpdaterStatus({
      type: 'error',
      message: result.message,
    });
  }
  return result;
});

app.whenReady().then(() => {
  setupAutoUpdater();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
