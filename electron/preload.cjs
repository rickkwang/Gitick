const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('gitickDesktop', {
  platform: process.platform,
});
