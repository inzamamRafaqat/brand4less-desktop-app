const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  printReceipt: (payload) => ipcRenderer.invoke('print-receipt', payload),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
});
