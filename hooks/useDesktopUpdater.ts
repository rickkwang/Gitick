import { useCallback, useEffect, useRef, useState } from 'react';

export interface DesktopConfirmDialogRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

interface UseDesktopUpdaterOptions {
  enabled: boolean;
  showToast: (message: string) => void;
  setConfirmDialog: (dialog: DesktopConfirmDialogRequest | null) => void;
}

const getFriendlyUpdateError = (raw: string, reason?: string) => {
  const message = raw.replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedReason = (reason ?? '').trim().toLowerCase();
  if (
    normalizedReason === 'not-in-applications' ||
    normalizedReason === 'translocated-app' ||
    message.includes('/applications') ||
    message.includes('not-in-applications') ||
    message.includes('apptranslocation')
  ) {
    return 'Please move Gitick.app to /Applications, then retry in-app update.';
  }
  if (normalizedReason === 'user-cancelled') {
    return 'Move was canceled. Please move Gitick.app to /Applications and retry.';
  }
  if (normalizedReason === 'move-failed') {
    return 'Unable to move Gitick.app to /Applications. Please move it manually, then retry.';
  }
  if (
    normalizedReason === 'unsigned-app' ||
    normalizedReason === 'signature-invalid' ||
    normalizedReason === 'signature-check-failed' ||
    message.includes('code object is not signed')
  ) {
    return 'Current build signature is not ideal. Gitick will try fallback installer update flow.';
  }
  if (normalizedReason === 'adhoc-signature') {
    return 'Current build uses ad-hoc signing. In-app update may fail on some macOS setups, fallback installer will be used.';
  }
  if (message.includes('zip file not provided') || message.includes('err_updater_zip_file_not_found')) {
    return 'Release assets are incomplete (missing .zip update package). Please republish this version.';
  }
  if (message.includes('network') || message.includes('timeout') || message.includes('econn')) {
    return 'Update failed due to network issue. Please try again later.';
  }
  if (message.includes('not found') || message.includes('404')) {
    return 'Update metadata is not available yet. Please retry shortly.';
  }
  return 'Update failed. Please try again later.';
};

export const useDesktopUpdater = ({
  enabled,
  showToast,
  setConfirmDialog,
}: UseDesktopUpdaterOptions) => {
  const desktopUpdateUserFlowRef = useRef(false);
  const manualDesktopCheckRef = useRef(false);
  const desktopUpdaterSignalRef = useRef(false);
  const promptedAvailableVersionRef = useRef<string | null>(null);
  const promptedDownloadedVersionRef = useRef<string | null>(null);

  const [desktopAppVersion, setDesktopAppVersion] = useState('');
  const [desktopUpdateStatus, setDesktopUpdateStatus] = useState('');
  const [isCheckingDesktopUpdate, setIsCheckingDesktopUpdate] = useState(false);

  const resetDesktopUpdaterState = useCallback(() => {
    desktopUpdateUserFlowRef.current = false;
    manualDesktopCheckRef.current = false;
    desktopUpdaterSignalRef.current = false;
    setDesktopUpdateStatus('');
    setIsCheckingDesktopUpdate(false);
  }, []);

  const finishDesktopUpdateFlow = useCallback(() => {
    desktopUpdateUserFlowRef.current = false;
    manualDesktopCheckRef.current = false;
    setIsCheckingDesktopUpdate(false);
  }, []);

  const tryMoveDesktopAppToApplications = useCallback(async () => {
    if (!window.gitickDesktop?.updater?.moveToApplications) {
      const friendly = getFriendlyUpdateError('move failed', 'move-failed');
      setDesktopUpdateStatus(friendly);
      showToast(friendly);
      return false;
    }

    try {
      const result = await window.gitickDesktop.updater.moveToApplications();
      if (result.ok) {
        setDesktopUpdateStatus('Moving Gitick.app to /Applications and relaunching...');
        showToast('Moving Gitick.app to /Applications...');
        return true;
      }

      const friendly = getFriendlyUpdateError(result.message ?? result.reason ?? 'move failed', result.reason);
      setDesktopUpdateStatus(friendly);
      showToast(friendly);
      return false;
    } catch (error) {
      console.warn('Move to /Applications failed:', error);
      const friendly = getFriendlyUpdateError('move failed', 'move-failed');
      setDesktopUpdateStatus(friendly);
      showToast(friendly);
      return false;
    }
  }, [showToast]);

  const openMoveToApplicationsDialog = useCallback(() => {
    setConfirmDialog({
      title: 'Move app to /Applications?',
      description: 'Gitick.app must be in /Applications for in-app updates on macOS. Move it now and relaunch?',
      confirmLabel: 'Move App',
      cancelLabel: 'Not Now',
      onConfirm: async () => {
        await tryMoveDesktopAppToApplications();
      },
      onCancel: async () => {
        const friendly = getFriendlyUpdateError('install failed', 'not-in-applications');
        setDesktopUpdateStatus(friendly);
        showToast(friendly);
      },
    });
  }, [setConfirmDialog, showToast, tryMoveDesktopAppToApplications]);

  const requestDesktopUpdateCheck = useCallback(async () => {
    if (!window.gitickDesktop?.updater) return;
    manualDesktopCheckRef.current = true;
    setIsCheckingDesktopUpdate(true);
    setDesktopUpdateStatus('Checking for updates...');
    try {
      const result = await window.gitickDesktop.updater.checkForUpdates();
      if (result.reason === 'in-progress') {
        setDesktopUpdateStatus('Update check already in progress...');
      } else if (!result.ok) {
        const friendly = getFriendlyUpdateError(result.message ?? result.reason ?? 'check failed', result.reason);
        setDesktopUpdateStatus(friendly);
        showToast(friendly);
        finishDesktopUpdateFlow();
      }
    } catch (error) {
      console.warn('Manual update check failed:', error);
      setDesktopUpdateStatus('Unable to check updates right now.');
      showToast('Unable to check updates right now.');
      manualDesktopCheckRef.current = false;
      setIsCheckingDesktopUpdate(false);
    }
  }, [finishDesktopUpdateFlow, showToast]);

  useEffect(() => {
    if (!enabled || !window.gitickDesktop?.updater) return;

    const updater = window.gitickDesktop.updater;
    void updater.getVersion().then((version) => setDesktopAppVersion(version)).catch(() => undefined);
    void updater
      .diagnose()
      .then((diagnosis) => {
        if (!diagnosis.ok) {
          const friendly = getFriendlyUpdateError(diagnosis.message ?? diagnosis.reason ?? 'install failed', diagnosis.reason);
          setDesktopUpdateStatus(friendly);
          return;
        }
        if (diagnosis.warningReason) {
          const warning = getFriendlyUpdateError(diagnosis.warningMessage ?? diagnosis.warningReason, diagnosis.warningReason);
          setDesktopUpdateStatus((current) => current || warning);
        }
      })
      .catch(() => undefined);

    desktopUpdaterSignalRef.current = false;

    const removeListener = updater.onStatus((payload) => {
      desktopUpdaterSignalRef.current = true;

      if (payload.type === 'checking') {
        setIsCheckingDesktopUpdate(true);
        setDesktopUpdateStatus('Checking for updates...');
      }

      if (payload.type === 'available') {
        const nextVersion = payload.version ?? '';
        setDesktopUpdateStatus(`Update ${nextVersion} is available.`.trim());
        if (promptedAvailableVersionRef.current === nextVersion) {
          return;
        }
        promptedAvailableVersionRef.current = nextVersion;
        setConfirmDialog({
          title: `Download update ${nextVersion}?`.trim(),
          description: 'A new desktop version is available. Download now and install after restart.',
          confirmLabel: 'Download',
          cancelLabel: 'Later',
          onConfirm: async () => {
            desktopUpdateUserFlowRef.current = true;
            setDesktopUpdateStatus('Downloading update...');
            try {
              const result = await updater.downloadUpdate();
              if (!result.ok) {
                const friendly = getFriendlyUpdateError(result.message ?? result.reason ?? 'download failed', result.reason);
                setDesktopUpdateStatus(friendly);
                showToast(friendly);
                finishDesktopUpdateFlow();
              }
            } catch (error) {
              console.warn('Download update call failed:', error);
              const friendly = getFriendlyUpdateError('download failed');
              setDesktopUpdateStatus(friendly);
              showToast(friendly);
              finishDesktopUpdateFlow();
            }
          },
          onCancel: async () => {
            setDesktopUpdateStatus('Update available. Download whenever you are ready.');
            finishDesktopUpdateFlow();
          },
        });
      }

      if (payload.type === 'download-progress' && payload.percent % 25 === 0) {
        setDesktopUpdateStatus(`Downloading... ${payload.percent}%`);
        showToast(`Downloading update... ${payload.percent}%`);
      }

      if (payload.type === 'downloaded') {
        const downloadedVersion = payload.version ?? '';
        setDesktopUpdateStatus(`Update ${downloadedVersion} downloaded. Restart to install.`.trim());
        if (promptedDownloadedVersionRef.current === downloadedVersion) {
          return;
        }
        promptedDownloadedVersionRef.current = downloadedVersion;
        setConfirmDialog({
          title: 'Install downloaded update now?',
          description: `Version ${downloadedVersion} has been downloaded and needs an app restart to finish installation.`.trim(),
          confirmLabel: 'Restart & Install',
          cancelLabel: 'Install Later',
          onConfirm: async () => {
            desktopUpdateUserFlowRef.current = true;
            try {
              const result = await updater.quitAndInstall();
              if (result.ok) {
                setDesktopUpdateStatus(result.message ?? 'Installing update and restarting app...');
                return;
              }

              if (result.reason === 'not-in-applications' || result.reason === 'translocated-app') {
                openMoveToApplicationsDialog();
                return;
              }

              const friendly = getFriendlyUpdateError(result.message ?? result.reason ?? 'install failed', result.reason);
              setDesktopUpdateStatus(friendly);
              showToast(friendly);
            } catch (error) {
              console.warn('Install update call failed:', error);
              const friendly = getFriendlyUpdateError('install failed');
              setDesktopUpdateStatus(friendly);
              showToast(friendly);
            } finally {
              finishDesktopUpdateFlow();
            }
          },
          onCancel: async () => {
            showToast('Update downloaded. It will install when you restart the app.');
            finishDesktopUpdateFlow();
          },
        });
      }

      if (payload.type === 'not-available') {
        setDesktopUpdateStatus('You are using the latest version.');
        promptedAvailableVersionRef.current = null;
        promptedDownloadedVersionRef.current = null;
        if (manualDesktopCheckRef.current) {
          showToast('You are already on the latest version.');
        }
        manualDesktopCheckRef.current = false;
        setIsCheckingDesktopUpdate(false);
      }

      if (payload.type === 'error') {
        const friendly = getFriendlyUpdateError(payload.message, payload.reason);
        setDesktopUpdateStatus(friendly);
        if (desktopUpdateUserFlowRef.current || manualDesktopCheckRef.current) {
          showToast(friendly);
        } else {
          console.warn('Background update check failed:', payload.message);
        }
        finishDesktopUpdateFlow();
      }
    });

    const runCheck = async () => {
      try {
        const result = await updater.checkForUpdates();
        if (result.reason === 'in-progress') {
          setDesktopUpdateStatus('Checking for updates...');
        } else if (!result.ok) {
          const friendly = getFriendlyUpdateError(result.message ?? result.reason ?? 'check failed', result.reason);
          setDesktopUpdateStatus(friendly);
          setIsCheckingDesktopUpdate(false);
        }
      } catch (error) {
        console.warn('Background update check call failed:', error);
        setDesktopUpdateStatus('Unable to check updates right now.');
        setIsCheckingDesktopUpdate(false);
      }
    };

    const initialTimer = window.setTimeout(() => {
      setIsCheckingDesktopUpdate(true);
      void runCheck();
    }, 1200);

    const retryTimer = window.setTimeout(() => {
      if (!desktopUpdaterSignalRef.current) {
        setIsCheckingDesktopUpdate(true);
        void runCheck();
      }
    }, 10000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(retryTimer);
      removeListener();
    };
  }, [enabled, finishDesktopUpdateFlow, openMoveToApplicationsDialog, setConfirmDialog, showToast]);

  return {
    desktopAppVersion,
    desktopUpdateStatus,
    isCheckingDesktopUpdate,
    requestDesktopUpdateCheck,
    resetDesktopUpdaterState,
  };
};
