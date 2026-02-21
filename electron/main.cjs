const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';
let mainWindow = null;

const sendUpdaterStatus = (payload) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:status', payload);
};

const setupAutoUpdater = () => {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

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
    sendUpdaterStatus({
      type: 'error',
      message: error?.message || 'Unknown update error',
    });
  });
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Gitick',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff',
    autoHideMenuBar: true,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
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

ipcMain.handle('updater:check', async () => {
  if (isDev) {
    return { ok: false, reason: 'dev-mode' };
  }
  await autoUpdater.checkForUpdates();
  return { ok: true };
});

ipcMain.handle('updater:download', async () => {
  if (isDev) {
    return { ok: false, reason: 'dev-mode' };
  }
  await autoUpdater.downloadUpdate();
  return { ok: true };
});

ipcMain.handle('updater:quit-install', () => {
  if (!isDev) {
    setImmediate(() => autoUpdater.quitAndInstall());
  }
  return { ok: true };
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
