const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;
const HOSTNAME = '0.0.0.0'; // Listen on all interfaces for LAN access
const APP_NAME = 'HMS - Hospital Management System';

// ============================================================
// 1. Determine paths based on dev vs packaged mode
// ============================================================
const isDev = !app.isPackaged;
const appPath = app.getAppPath();

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
// 2. Get local IP for LAN access info
// ============================================================
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ============================================================
// 3. Create loading screen window
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
// 4. Start Next.js server on 0.0.0.0 (accessible from LAN)
// ============================================================
function startServer() {
  console.log('[HMS] Starting server...');
  console.log('[HMS] Base dir:', baseDir);
  console.log('[HMS] DB dir:', dbDir);
  console.log('[HMS] Listening on:', HOSTNAME + ':' + PORT);

  const env = {
    ...process.env,
    PORT: String(PORT),
    HOSTNAME: HOSTNAME,
    DATABASE_URL: 'file:' + dbDir + '/custom.db',
    NODE_ENV: 'production',
  };

  if (isDev) {
    serverProcess = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['next', 'dev', '-p', String(PORT), '-H', HOSTNAME],
      {
        cwd: baseDir,
        env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
  } else {
    const nextBin = process.platform === 'win32'
      ? 'node_modules\\.bin\\next.cmd'
      : 'node_modules/.bin/next';
    serverProcess = spawn(
      process.platform === 'win32' ? 'cmd.exe' : '/bin/bash',
      [nextBin, 'start', '-p', String(PORT), '-H', HOSTNAME],
      {
        cwd: baseDir,
        env,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
  }

  serverProcess.stdout.on('data', function (data) {
    console.log('[Next.js]', data.toString());
  });

  serverProcess.stderr.on('data', function (data) {
    console.log('[Next.js stderr]', data.toString());
  });

  serverProcess.on('close', function (code) {
    console.log('[Next.js] Process exited with code:', code);
    if (code !== 0 && code !== null) {
      if (mainWindow && mainWindow.isDestroyed() === false) {
        mainWindow.loadFile(path.join(__dirname, 'error.html'));
      }
    }
  });

  serverProcess.on('error', function (err) {
    console.error('[Next.js] Failed to start:', err.message);
  });
}

// ============================================================
// 5. Wait for server to be ready, then load the app
// ============================================================
function waitForServer(maxRetries) {
  maxRetries = maxRetries || 60;
  var retries = 0;

  var interval = setInterval(function () {
    retries++;
    console.log('[HMS] Waiting for server... (' + retries + '/' + maxRetries + ')');

    var req = http.get('http://localhost:' + PORT, function (res) {
      clearInterval(interval);
      console.log('[HMS] Server is ready!');
      openMainWindow();
    });

    req.on('error', function () {
      if (retries >= maxRetries) {
        clearInterval(interval);
        console.error('[HMS] Server failed to start');
        if (mainWindow && mainWindow.isDestroyed() === false) {
          mainWindow.loadFile(path.join(__dirname, 'error.html'));
        }
      }
    });

    req.setTimeout(1000);
  }, 1000);
}

// ============================================================
// 6. Open main application window
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

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Show LAN access info in console
  var localIP = getLocalIP();
  console.log('[HMS] ============================================');
  console.log('[HMS] Local:  http://localhost:' + PORT);
  console.log('[HMS] LAN:    http://' + localIP + ':' + PORT);
  console.log('[HMS] Other computers can access via LAN URL');
  console.log('[HMS] ============================================');
}

// ============================================================
// 7. App lifecycle
// ============================================================
app.whenReady().then(function () {
  createLoadingWindow();
  startServer();
  waitForServer();
});

app.on('window-all-closed', function () {
  killServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', function () {
  killServer();
});

app.on('activate', function () {
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
