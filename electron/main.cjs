const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Brand 4 Less — Retail Management & POS Suite',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC HANDLERS ────────────────────────────────────────────────────────────

// 1. Silent / Thermal Receipt Native Printing
ipcMain.handle('print-receipt', async (event, { htmlContent, paperWidth }) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      width: paperWidth === '58mm' ? 220 : 320,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: false, // Set to true for direct silent POS thermal printing
          printBackground: true,
          margins: { marginType: 'none' },
        },
        (success, failureReason) => {
          printWindow.close();
          if (success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: failureReason });
          }
        }
      );
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 2. Desktop Notifications
ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
    return true;
  }
  return false;
});

// 3. Save File Dialog
ipcMain.handle('save-file-dialog', async (event, { defaultFilename, filters }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultFilename,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  return filePath;
});

// 4. Open File Dialog
ipcMain.handle('open-file-dialog', async (event, { filters }) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  return filePaths && filePaths.length > 0 ? filePaths[0] : null;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
