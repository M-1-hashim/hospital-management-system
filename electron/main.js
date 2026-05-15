const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;
const APP_NAME = 'HMS - Hospital Management System';

// ============================================================
// 1. Determine paths based on dev vs packaged mode
// ============================================================
const isDev = !app.isPackaged;
const appPath = app.getAppPath();

// In packaged mode, resources are in `resources/app`
const baseDir = isDev
  ? path.resolve(appPath)
  : path.resolve(process.resourcesPath, 'app');

const dbDir = isDev
  ? path.join(baseDir, 'db')
  : path.join(app.getPath('userData'), 'db');

// Ensure db directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ============================================================
// 2. Create loading screen window
// ============================================================
function createLoadingWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    resizable: false,
    frame: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
}

// ============================================================
// 3. Start Next.js server
// ============================================================
function startServer() {
  console.log('[HMS] Starting server...');
  console.log('[HMS] Base dir:', baseDir);
  console.log('[HMS] DB dir:', dbDir);

  const env = {
    ...process.env,
    PORT: String(PORT),
    DATABASE_URL: `file:${dbDir}/custom.db`,
    NODE_ENV: 'production',
  };

  if (isDev) {
    // Dev mode: start next dev
    serverProcess = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['next', 'dev', '-p', String(PORT)],
      {
        cwd: baseDir,
        env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
  } else {
    // Packaged mode: start next start (requires next build first)
    const nextBin = process.platform === 'win32'
      ? 'node_modules\\.bin\\next.cmd'
      : 'node_modules/.bin/next';
    serverProcess = spawn(
      process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      [nextBin, 'start', '-p', String(PORT)],
      {
        cwd: baseDir,
        env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
  }

  serverProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log('[Next.js]', msg);
  });

  serverProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    console.log('[Next.js stderr]', msg);
  });

  serverProcess.on('close', (code) => {
    console.log('[Next.js] Process exited with code:', code);
    if (code !== 0 && code !== null) {
      if (mainWindow && mainWindow.isDestroyed() === false) {
        mainWindow.loadFile(path.join(__dirname, 'error.html'));
      }
    }
  });

  serverProcess.on('error', (err) => {
    console.error('[Next.js] Failed to start:', err.message);
  });
}

// ============================================================
// 4. Wait for server to be ready, then load the app
// ============================================================
function waitForServer(maxRetries = 60) {
  let retries = 0;

  const interval = setInterval(() => {
    retries++;
    console.log('[HMS] Waiting for server... (' + retries + '/' + maxRetries + ')');

    const req = http.get('http://localhost:' + PORT, (res) => {
      clearInterval(interval);
      console.log('[HMS] Server is ready!');
      openMainWindow();
    });

    req.on('error', () => {
      if (retries >= maxRetries) {
        clearInterval(interval);
        console.error('[HMS] Server failed to start after', maxRetries, 'seconds');
        if (mainWindow && mainWindow.isDestroyed() === false) {
          mainWindow.loadFile(path.join(__dirname, 'error.html'));
        }
      }
    });

    req.setTimeout(1000);
  }, 1000);
}

// ============================================================
// 5. Open main application window
// ============================================================
function openMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      title: APP_NAME,
      backgroundColor: '#0f172a',
      icon: path.join(baseDir, 'public', 'favicon.svg'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
  }

  mainWindow.setTitle(APP_NAME);
  mainWindow.loadURL('http://localhost:' + PORT);

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Remove menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }
}

// ============================================================
// 6. App lifecycle
// ============================================================
app.whenReady().then(() => {
  createLoadingWindow();
  startServer();
  waitForServer();
});

app.on('window-all-closed', () => {
  killServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killServer();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createLoadingWindow();
    openMainWindow();
  }
});

function killServer() {
  if (serverProcess) {
    console.log('[HMS] Killing server process...');
    try {
      serverProcess.kill('SIGTERM');
    } catch (e) {
      try {
        serverProcess.kill('SIGKILL');
      } catch (e2) {
        // ignore
      }
    }
    serverProcess = null;
  }
}
