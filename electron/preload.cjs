const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gitickDesktop', {
  platform: process.platform,
  updater: {
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-install'),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
  },
});
