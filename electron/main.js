const path = require('path');
const { app, BrowserWindow, ipcMain, Notification, shell, Tray, Menu, nativeImage } = require('electron');
const Farmer = require('./steam/farmer');

let win = null;
let tray = null;
const farmer = new Farmer();
const isDev = !!process.env.VITE_DEV;
const icon = path.join(__dirname, '..', 'build', 'icon.png');

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0c0a0e',
    title: 'SteamBandage',
    icon,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0c0a0e', symbolColor: '#b9aeb6', height: 38 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.on('close', (e) => {
    // si está farmeando, cerrar la ventana la manda a la bandeja
    if (farmer.running && !app.isQuiting) { e.preventDefault(); win.hide(); }
  });
}

function createTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 16, height: 16 }));
    tray.setToolTip('SteamBandage');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir', click: () => win.show() },
      { label: 'Salir', click: () => { app.isQuiting = true; app.quit(); } },
    ]));
    tray.on('click', () => win.show());
  } catch {}
}

farmer.on('state', (s) => win && !win.isDestroyed() && win.webContents.send('state', s));
farmer.on('drop', ({ game, count }) => {
  if (Notification.isSupported()) {
    new Notification({ title: `+${count} cromo${count > 1 ? 's' : ''}`, body: game, icon, silent: true }).show();
  }
});

ipcMain.handle('state', () => farmer.snapshot());
ipcMain.handle('resume', () => farmer.resume());
ipcMain.handle('login', (_e, data) => farmer.login(data));
ipcMain.handle('guard', (_e, code) => farmer.submitGuard(code));
ipcMain.handle('logout', () => farmer.logout());
ipcMain.handle('start', () => farmer.start());
ipcMain.handle('stop', () => farmer.stop());
ipcMain.handle('refresh', () => farmer.refresh());
ipcMain.handle('settings', (_e, patch) => farmer.setSettings(patch));
ipcMain.handle('skip', (_e, appid) => farmer.skip(appid));
ipcMain.handle('open', (_e, url) => shell.openExternal(url));

app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
app.whenReady().then(() => {
  app.setAppUserModelId('com.tomikav.steambandage');
  createWindow();
  createTray();
});
app.on('before-quit', () => {
  app.isQuiting = true;
  try { farmer.client?.gamesPlayed([]); farmer.client?.logOff(); } catch {}
});
app.on('window-all-closed', () => app.quit());
