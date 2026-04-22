const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const Store = require('electron-store').default

const store = new Store({
  name: 'epiphany-storage',
  defaults: {
    events: [],
    settings: {},
  },
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 800,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#080C10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  if (!app.isPackaged) {
    win.loadURL(devServerUrl)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

ipcMain.handle('window:action', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) {
    return
  }
  if (action === 'minimize') win.minimize()
  if (action === 'maximize') (win.isMaximized() ? win.unmaximize() : win.maximize())
  if (action === 'close') win.close()
})

ipcMain.handle('store:getEvents', () => store.get('events', []))
ipcMain.handle('store:addEvent', (_event, payload) => {
  const events = store.get('events', [])
  store.set('events', [...events, payload])
})
ipcMain.handle('store:updateSettings', (_event, patch) => {
  const settings = store.get('settings', {})
  store.set('settings', { ...settings, ...patch })
})
ipcMain.handle('data:listSerialPorts', () => [])
ipcMain.handle('data:scanBleDevices', () => [])
ipcMain.handle('report:exportPdf', async (_event, fileName) => {
  await shell.openExternal('https://example.com')
  return { ok: true, fileName }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
