const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { URL } = require('url');
const {
  RELEASE_METADATA_URL,
  RELEASES_LATEST_URL,
  isSafeExternalUrl,
  isTrustedGitHubReleaseUrl,
} = require('./externalUrl.cjs');

const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';
let mainWindow = null;
let updaterCheckTask = null;
let updaterDownloadTask = null;
let latestAvailableVersion = null;
let latestDownloadedVersion = null;
let externalInstallTask = null;
let externalInstallWaiters = null; // Queue of resolve callbacks for concurrent callers

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

// Validate that value is a safe path (alphanumeric, hyphen, underscore, dot, slash)
  // This prevents shell injection when shellSingleQuote is used with unsanitized input
  const isSafePath = (value) => /^[a-zA-Z0-9_/.,-]*$/.test(value);

  const shellSingleQuote = (value) => {
    const str = String(value);
    // Defensive check: reject values with potentially dangerous characters
    // that could break out of the single-quoted string or inject commands
    if (!isSafePath(str)) {
      throw new Error(`Unsafe path rejected by shellSingleQuote: ${str}`);
    }
    return `'${str.replace(/'/g, `'\\''`)}'`;
  };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchText = (sourceUrl) => new Promise((resolve, reject) => {
  const request = (urlString) => {
    if (!isTrustedGitHubReleaseUrl(urlString)) {
      reject(new Error('Blocked untrusted metadata URL.'));
      return;
    }
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

const resolveAvailableVersionFromMetadata = async () => {
  const latestYml = await fetchText(RELEASE_METADATA_URL);
  const metadataVersion = parseVersionFromLatestMacYml(latestYml);
  if (metadataVersion && compareSemver(metadataVersion, app.getVersion()) > 0) {
    latestAvailableVersion = metadataVersion;
    return metadataVersion;
  }
  return null;
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

const isBundleInApplicationsByPath = (bundlePath) => {
  if (!bundlePath) return false;
  const candidates = new Set([bundlePath]);
  try {
    candidates.add(fs.realpathSync(bundlePath));
  } catch (_) {
    // Ignore realpath failures and rely on raw path.
  }

  for (const candidate of candidates) {
    const normalized = String(candidate).replace(/\/+$/, '');
    if (
      normalized.startsWith('/Applications/') ||
      normalized.startsWith('/System/Volumes/Data/Applications/')
    ) {
      return true;
    }
  }
  return false;
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
  const electronInApplications =
    typeof app.isInApplicationsFolder === 'function' ? app.isInApplicationsFolder() : null;
  const pathInApplications = isBundleInApplicationsByPath(bundlePath);
  details.inApplicationsFolder = electronInApplications === true || pathInApplications;
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
  let resStream = null;
  let fileStream = null;

  const cleanup = () => {
    if (resStream) {
      resStream.removeAllListeners();
      resStream.resume();
      resStream = null;
    }
    if (fileStream) {
      fileStream.removeAllListeners();
      fileStream.destroy();
      fileStream = null;
    }
  };

  const request = (urlString) => {
    if (!isTrustedGitHubReleaseUrl(urlString)) {
      reject(new Error('Blocked untrusted download URL.'));
      return;
    }
    const requestUrl = new URL(urlString);
    const req = https.get(requestUrl, (res) => {
      resStream = res;

      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const redirectUrl = new URL(res.headers.location, requestUrl).toString();
        cleanup();
        request(redirectUrl);
        return;
      }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        cleanup();
        reject(new Error(`Download failed with status ${res.statusCode || 'unknown'}`));
        return;
      }

      const total = Number(res.headers['content-length'] || 0);
      let downloaded = 0;
      fileStream = fs.createWriteStream(outputPath);

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0) {
          const percent = Math.max(1, Math.min(100, Math.round((downloaded / total) * 100)));
          sendUpdaterStatus({ type: 'download-progress', percent });
        }
      });

      res.on('error', () => {
        cleanup();
        reject(new Error('Download stream error'));
      });
      fileStream.on('error', () => {
        cleanup();
        reject(new Error('File write error'));
      });
      fileStream.on('finish', () => {
        fileStream.close(() => resolve(outputPath));
      });
      res.pipe(fileStream);
    });

    req.on('error', () => {
      cleanup();
      reject(new Error('Request failed'));
    });
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

const waitForInstallerReady = async ({ readyPath, statusPath, timeoutMs = 3000 }) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (fs.existsSync(readyPath)) {
      return { ok: true };
    }
    if (fs.existsSync(statusPath)) {
      const status = fs.readFileSync(statusPath, 'utf8').trim();
      if (status.startsWith('error:')) {
        return { ok: false, status };
      }
    }
    await sleep(100);
  }
  return { ok: false, status: 'error:installer-timeout-before-ready' };
};

const scheduleMacExternalInstall = async (sourceAppPath) => {
  const scriptPath = path.join(os.tmpdir(), `gitick-install-${Date.now()}.sh`);
  const logPath = path.join(os.tmpdir(), `gitick-install-${Date.now()}.log`);
  const statusPath = path.join(os.tmpdir(), `gitick-install-${Date.now()}.status`);
  const readyPath = path.join(os.tmpdir(), `gitick-install-${Date.now()}.ready`);
  const appPid = process.pid;
  const scriptContent = `#!/bin/bash
set -euo pipefail
SOURCE_APP=${shellSingleQuote(sourceAppPath)}
TARGET_APP="/Applications/Gitick.app"
BACKUP_APP="/Applications/Gitick.app.backup.$(date +%s)"
STATUS_FILE=${shellSingleQuote(statusPath)}
READY_FILE=${shellSingleQuote(readyPath)}
LOG_FILE=${shellSingleQuote(logPath)}
APP_PID=${appPid}

exec >>"$LOG_FILE" 2>&1
echo "[gitick-update] started at $(date)"

if [ ! -d "$SOURCE_APP" ]; then
  echo "error:source-missing" > "$STATUS_FILE"
  exit 11
fi

echo "ready" > "$READY_FILE"

restore_backup() {
  if [ -d "$BACKUP_APP" ] && [ ! -d "$TARGET_APP" ]; then
    mv "$BACKUP_APP" "$TARGET_APP"
  fi
}

on_error() {
  code=$?
  echo "error:install-step-failed:$code" > "$STATUS_FILE"
  restore_backup || true
  exit "$code"
}
trap on_error ERR

for _ in {1..100}; do
  if ! kill -0 "$APP_PID" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if kill -0 "$APP_PID" >/dev/null 2>&1; then
  echo "error:app-still-running-timeout" > "$STATUS_FILE"
  exit 21
fi

if [ -d "$TARGET_APP" ]; then
  mv "$TARGET_APP" "$BACKUP_APP"
fi

/usr/bin/ditto "$SOURCE_APP" "$TARGET_APP"
/usr/bin/xattr -rd com.apple.quarantine "$TARGET_APP" >/dev/null 2>&1 || true
/usr/bin/open -a "$TARGET_APP"
/bin/rm -rf "$BACKUP_APP" >/dev/null 2>&1 || true
echo "ok" > "$STATUS_FILE"
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
  const readyResult = await waitForInstallerReady({ readyPath, statusPath });
  if (!readyResult.ok) {
    const status = readyResult.status || 'error:installer-ready-check-failed';
    throw new Error(`${status}. log=${logPath}`);
  }
  return { logPath };
};

const startExternalMacUpdateInstall = async () => {
  // If an installation is already in progress, wait for it instead of returning immediately.
  // This prevents race conditions where rapid concurrent calls could trigger multiple installs.
  if (externalInstallTask) {
    return new Promise((resolve) => {
      if (!externalInstallWaiters) externalInstallWaiters = [];
      externalInstallWaiters.push(resolve);
    });
  }

  const targetVersion = latestDownloadedVersion || latestAvailableVersion;
  if (!targetVersion) {
    return {
      ok: false,
      reason: 'version-unknown',
      message: 'No downloaded/available version found. Please check updates first.',
    };
  }

  let installResult;
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

    return scheduleMacExternalInstall(extractedApp);
  })();

  try {
    const installPlan = await externalInstallTask;
    installResult = {
      ok: true,
      reason: 'external-install-started',
      message: `Installing update and restarting app...${installPlan?.logPath ? ` (log: ${installPlan.logPath})` : ''}`,
    };
    setImmediate(() => app.quit());
  } catch (error) {
    try {
      // Fallback to manual installer path so users can still update.
      shell.openExternal(RELEASES_LATEST_URL);
    } catch (_) {
      // noop
    }
    installResult = {
      ok: false,
      reason: 'manual-install-required',
      message:
        `${error?.message || 'Unable to install update automatically.'} ` +
        'Gitick opened the latest release page for manual update.',
    };
  } finally {
    externalInstallTask = null;
    // Resolve all waiting callers with the same result
    if (externalInstallWaiters) {
      for (const resolve of externalInstallWaiters) {
        resolve(installResult);
      }
      externalInstallWaiters = null;
    }
  }

  return installResult;
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: isMac ? '' : 'Gitick',
    backgroundColor: isMac ? '#00000000' : (nativeTheme.shouldUseDarkColors ? '#09090b' : '#ffffff'),
    transparent: isMac,
    autoHideMenuBar: true,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    titleBarOverlay: false,
    ...(isMac ? { trafficLightPosition: { x: 18, y: 16 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url);
    } else {
      console.warn(`[security] blocked external url: ${url}`);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isSafeExternalUrl(url)) {
      event.preventDefault();
      console.warn(`[security] blocked navigation url: ${url}`);
      return;
    }
    event.preventDefault();
    shell.openExternal(url);
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
  updaterCheckTask = autoUpdater.checkForUpdates().finally(() => {
    updaterCheckTask = null;
  });

  let checkError = null;
  let directVersion = null;
  try {
    const result = await updaterCheckTask;
    directVersion = result?.updateInfo?.version || null;
  } catch (error) {
    checkError = error;
  }

  if (directVersion && compareSemver(directVersion, app.getVersion()) > 0) {
    latestAvailableVersion = directVersion;
    sendUpdaterStatus({ type: 'available', version: directVersion });
    return { ok: true };
  }

  try {
    const metadataVersion = await resolveAvailableVersionFromMetadata();
    if (metadataVersion) {
      sendUpdaterStatus({ type: 'available', version: metadataVersion });
    } else {
      sendUpdaterStatus({ type: 'not-available' });
    }
    return { ok: true };
  } catch (metadataError) {
    if (checkError) {
      const reason = classifyUpdaterReason(checkError?.message, 'check-failed');
      return {
        ok: false,
        reason,
        message: `${checkError?.message || 'Unable to check updates right now.'} (metadata fallback failed: ${metadataError?.message || 'unknown error'})`,
      };
    }
    return {
      ok: false,
      reason: classifyUpdaterReason(metadataError?.message, 'metadata-missing'),
      message: metadataError?.message || 'Unable to check updates right now.',
    };
  }
});

ipcMain.handle('updater:download', async () => {
  if (isDev) {
    return { ok: false, reason: 'dev-mode' };
  }
  if (isMac) {
    if (!latestAvailableVersion) {
      try {
        await resolveAvailableVersionFromMetadata();
      } catch (error) {
        return {
          ok: false,
          reason: classifyUpdaterReason(error?.message, 'download-failed'),
          message: error?.message || 'Unable to prepare update right now.',
        };
      }
    }

    if (!latestAvailableVersion || compareSemver(latestAvailableVersion, app.getVersion()) <= 0) {
      return { ok: false, reason: 'no-update' };
    }

    latestDownloadedVersion = latestAvailableVersion;
    sendUpdaterStatus({ type: 'downloaded', version: latestDownloadedVersion });
    return { ok: true, reason: 'external-installer-ready' };
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
