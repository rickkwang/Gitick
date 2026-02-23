const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { URL } = require('url');

const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';
let mainWindow = null;
let updaterCheckTask = null;
let updaterDownloadTask = null;
let latestAvailableVersion = null;
let latestDownloadedVersion = null;
let externalInstallTask = null;
const RELEASE_METADATA_URL = 'https://github.com/rickkwang/Gitick/releases/latest/download/latest-mac.yml';

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

const parseVersionFromLatestMacYml = (raw = '') => {
  const match = raw.match(/^\s*version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$/m);
  return match?.[1] || null;
};

const compareSemver = (a, b) => {
  const ap = a.split('.').map((n) => Number(n));
  const bp = b.split('.').map((n) => Number(n));
  for (let i = 0; i < 3; i += 1) {
    const diff = (ap[i] || 0) - (bp[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
};

const fetchText = (sourceUrl) => new Promise((resolve, reject) => {
  const request = (urlString) => {
    const requestUrl = new URL(urlString);
    const req = https.get(requestUrl, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, requestUrl).toString();
        res.resume();
        request(redirectUrl);
        return;
      }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Request failed with status ${res.statusCode || 'unknown'}`));
        res.resume();
        return;
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
  };

  request(sourceUrl);
});

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
      ok: true,
      warningReason: 'unsigned-app',
      warningMessage: 'Current app bundle is unsigned. In-app install may fail on some macOS setups; fallback installer will be used when possible.',
      details,
    };
  }

  if (signature.status === 'error') {
    return {
      ok: true,
      warningReason: 'signature-check-failed',
      warningMessage: `Unable to validate app code signature: ${signature.raw || 'unknown error'}`,
      details,
    };
  }

  if (signature.status === 'adhoc') {
    return {
      ok: true,
      warningReason: 'adhoc-signature',
      warningMessage: 'Current app build uses ad-hoc signing. In-app install may fail on some macOS setups; fallback installer will be used when possible.',
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
    latestAvailableVersion = info?.version || latestAvailableVersion;
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
    latestDownloadedVersion = info?.version || latestAvailableVersion || latestDownloadedVersion;
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

const downloadFileWithProgress = (sourceUrl, outputPath) => new Promise((resolve, reject) => {
  const request = (urlString) => {
    const requestUrl = new URL(urlString);
    const req = https.get(requestUrl, (res) => {
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const redirectUrl = new URL(res.headers.location, requestUrl).toString();
        res.resume();
        request(redirectUrl);
        return;
      }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Download failed with status ${res.statusCode || 'unknown'}`));
        res.resume();
        return;
      }

      const total = Number(res.headers['content-length'] || 0);
      let downloaded = 0;
      const file = fs.createWriteStream(outputPath);

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0) {
          const percent = Math.max(1, Math.min(100, Math.round((downloaded / total) * 100)));
          sendUpdaterStatus({ type: 'download-progress', percent });
        }
      });

      res.on('error', reject);
      file.on('error', reject);
      file.on('finish', () => {
        file.close(() => resolve(outputPath));
      });
      res.pipe(file);
    });

    req.on('error', reject);
  };

  request(sourceUrl);
});

const resolveMacArchName = () => (process.arch === 'arm64' ? 'arm64' : 'x64');

const buildGitHubZipUrlForVersion = (version) => {
  const arch = resolveMacArchName();
  return `https://github.com/rickkwang/Gitick/releases/download/v${version}/Gitick-${version}-${arch}.zip`;
};

const findExtractedAppBundle = (dir) => {
  const direct = path.join(dir, 'Gitick.app');
  if (fs.existsSync(direct)) return direct;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.endsWith('.app')) {
      return path.join(dir, entry.name);
    }
  }
  return null;
};

const scheduleMacExternalInstall = async (sourceAppPath) => {
  const scriptPath = path.join(os.tmpdir(), `gitick-install-${Date.now()}.sh`);
  const escapedSource = sourceAppPath.replace(/"/g, '\\"');
  const scriptContent = `#!/bin/bash
set -e
sleep 1
SOURCE_APP="${escapedSource}"
TARGET_APP="/Applications/Gitick.app"
BACKUP_APP="/Applications/Gitick.app.backup.$(date +%s)"

if [ ! -d "$SOURCE_APP" ]; then
  exit 11
fi

if [ -d "$TARGET_APP" ]; then
  mv "$TARGET_APP" "$BACKUP_APP"
fi

/usr/bin/ditto "$SOURCE_APP" "$TARGET_APP"
/usr/bin/xattr -rd com.apple.quarantine "$TARGET_APP" >/dev/null 2>&1 || true
/usr/bin/open -a "$TARGET_APP"
/bin/rm -rf "$BACKUP_APP" >/dev/null 2>&1 || true
`;

  fs.writeFileSync(scriptPath, scriptContent, { encoding: 'utf8', mode: 0o700 });
  const child = spawn('/bin/bash', [scriptPath], {
    detached: true,
    stdio: 'ignore',
  });
  if (child.error) {
    throw new Error(child.error.message || 'Failed to launch installer script.');
  }
  child.unref();
};

const startExternalMacUpdateInstall = async () => {
  if (externalInstallTask) {
    return { ok: true, reason: 'in-progress' };
  }

  const targetVersion = latestDownloadedVersion || latestAvailableVersion;
  if (!targetVersion) {
    return {
      ok: false,
      reason: 'version-unknown',
      message: 'No downloaded/available version found. Please check updates first.',
    };
  }

  externalInstallTask = (async () => {
    const workDir = path.join(os.tmpdir(), `gitick-update-${Date.now()}`);
    const zipPath = path.join(workDir, 'update.zip');
    const extractDir = path.join(workDir, 'expanded');
    fs.mkdirSync(extractDir, { recursive: true });

    const zipUrl = buildGitHubZipUrlForVersion(targetVersion);
    await downloadFileWithProgress(zipUrl, zipPath);

    const unzip = spawnSync('/usr/bin/ditto', ['-x', '-k', zipPath, extractDir], { encoding: 'utf8' });
    if (unzip.status !== 0) {
      throw new Error((unzip.stderr || unzip.stdout || 'Unable to extract update package').trim());
    }

    const extractedApp = findExtractedAppBundle(extractDir);
    if (!extractedApp) {
      throw new Error('Extracted update package does not contain Gitick.app.');
    }

    await scheduleMacExternalInstall(extractedApp);
  })().finally(() => {
    externalInstallTask = null;
  });

  try {
    await externalInstallTask;
    setImmediate(() => app.quit());
    return { ok: true, reason: 'external-install-started', message: 'Installing update and restarting app...' };
  } catch (error) {
    return {
      ok: false,
      reason: classifyUpdaterReason(error?.message, 'external-install-failed'),
      message: error?.message || 'Unable to install update automatically.',
    };
  }
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
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    titleBarOverlay: false,
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
    const result = await updaterCheckTask;
    const directVersion = result?.updateInfo?.version;
    if (directVersion && compareSemver(directVersion, app.getVersion()) > 0) {
      latestAvailableVersion = directVersion;
      sendUpdaterStatus({ type: 'available', version: directVersion });
    }
    if (!directVersion) {
      const latestYml = await fetchText(RELEASE_METADATA_URL);
      const metadataVersion = parseVersionFromLatestMacYml(latestYml);
      if (metadataVersion && compareSemver(metadataVersion, app.getVersion()) > 0) {
        latestAvailableVersion = metadataVersion;
        sendUpdaterStatus({ type: 'available', version: metadataVersion });
      }
    }
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
    if (isMac) {
      return startExternalMacUpdateInstall();
    }
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
