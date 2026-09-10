const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { fork, spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
const API_PORT = parseInt(process.env.PORT || '4890', 10);
const API_HOST = process.env.HOST || '127.0.0.1';
const API_ORIGIN = `http://${API_HOST}:${API_PORT}`;

// ── Backend lifecycle ───────────────────────────────────────────────────────

function waitForApi(timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = http.get(`${API_ORIGIN}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error('API server did not become ready in time.'));
      setTimeout(ping, 400);
    };
    ping();
  });
}

function startBackend() {
  // Dev is expected to run `npm run dev:server` (tsx watch) separately.
  if (isDev) return Promise.resolve();

  const baseDir = app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.join(__dirname, '..');
  const compiled = path.join(baseDir, 'dist-server', 'server.js');
  const userDataPath = app.getPath('userData');
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(API_PORT),
    HOST: API_HOST,
    DATA_DIR: process.env.DATA_DIR || path.join(userDataPath, 'data'),
  };

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const logFile = path.join(userDataPath, 'backend.log');
  let logFd = 'ignore';
  try {
    logFd = fs.openSync(logFile, 'a');
  } catch (err) {
    console.error('Failed to open backend.log:', err);
  }

  const bundledNode = path.join(process.resourcesPath, 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
  const nodeBin = (app.isPackaged && fs.existsSync(bundledNode))
    ? bundledNode
    : (process.platform === 'win32' ? 'node.exe' : 'node');

  if (fs.existsSync(compiled)) {
    serverProcess = spawn(nodeBin, [compiled], {
      cwd: baseDir,
      env,
      stdio: ['ignore', logFd, logFd],
      shell: false,
      windowsHide: true,
    });
  } else {
    // Fallback: run the TypeScript entry directly via the locally-installed tsx if available
    const tsxBin = path.join(
      baseDir,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
    );
    const source = path.join(baseDir, 'server', 'server.ts');
    if (!fs.existsSync(tsxBin) || !fs.existsSync(source)) {
      return Promise.reject(
        new Error(`No backend build found at ${compiled}. Run "npm run build" before starting in production.`)
      );
    }
    serverProcess = spawn(tsxBin, [source], { cwd: baseDir, env, stdio: ['ignore', logFd, logFd], shell: false, windowsHide: true });
  }

  serverProcess.on('exit', (code) => {
    serverProcess = null;
    if (!app.isQuitting && code !== 0) {
      dialog.showErrorBox('Brand 4 Less', `The background service stopped unexpectedly (code ${code}).`);
      app.quit();
    }
  });

  return waitForApi();
}

function stopBackend() {
  if (serverProcess) {
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'], { windowsHide: true });
      } else {
        serverProcess.kill();
      }
    } catch (_) {
      /* noop */
    }
    serverProcess = null;
  }
}

// ── Window ──────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Brand 4 Less — Retail Management & POS Suite',
    ...(fs.existsSync(path.join(__dirname, '../public/favicon.ico')) ? { icon: path.join(__dirname, '../public/favicon.ico') } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    // Production: the API server also serves the built UI on the same origin.
    mainWindow.loadURL(API_ORIGIN);
  }

  // Block navigation to arbitrary external origins.
  const allowedOrigins = new Set([API_ORIGIN, 'http://localhost:5173']);
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      if (!allowedOrigins.has(new URL(url).origin)) event.preventDefault();
    } catch (_) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC HANDLERS ────────────────────────────────────────────────────────────

// 1. Silent / Thermal Receipt Native Printing & Hardware Queries
ipcMain.handle('get-printers', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      return await mainWindow.webContents.getPrintersAsync();
    }
  } catch (err) {
    console.error('Failed to get printers from webContents:', err);
  }
  return [];
});

ipcMain.handle('print-receipt', async (event, { htmlContent, printerName, silent = true, paperWidth = '80mm' }) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      width: paperWidth === '58mm' ? 220 : 320,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        javascript: false,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    return new Promise((resolve) => {
      const printOptions = {
        silent: silent !== false,
        printBackground: true,
        margins: { marginType: 'none' },
      };
      if (printerName) {
        printOptions.deviceName = printerName;
      }

      printWindow.webContents.print(
        printOptions,
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

// ── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await startBackend();
  } catch (err) {
    dialog.showErrorBox('Brand 4 Less — Startup Error', String(err && err.message ? err.message : err));
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopBackend();
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
