const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (payload) => ipcRenderer.invoke('print-receipt', payload),
  exportPdf: (payload) => ipcRenderer.invoke('export-pdf', payload),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
});
