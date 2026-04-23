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

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

ipcMain.handle('store:getEvents', () => asArray(store.get('events', [])))
ipcMain.handle('store:getSettings', () => asObject(store.get('settings', {})))
ipcMain.handle('store:getPersistedState', () => ({
  events: asArray(store.get('events', [])),
  settings: asObject(store.get('settings', {})),
}))
ipcMain.handle('store:addEvent', (_event, payload) => {
  const events = asArray(store.get('events', []))
  store.set('events', [...events, payload])
})
ipcMain.handle('store:updateSettings', (_event, patch) => {
  const settings = asObject(store.get('settings', {}))
  store.set('settings', { ...settings, ...patch })
})
ipcMain.handle('data:listSerialPorts', () => ['COM1', 'COM3', '/dev/ttyUSB0'])
ipcMain.handle('data:scanBleDevices', () => ['EpiBand-A1', 'EpiBand-B2'])
ipcMain.handle('data:testConnection', async (_event, payload) => {
  const mode = payload?.mode
  if (mode === 'websocket') {
    if (!payload?.websocketUrl) {
      return { ok: false, message: '请先填写 WebSocket 地址' }
    }
    let parsed
    try {
      parsed = new URL(payload.websocketUrl)
    } catch {
      return { ok: false, message: 'WebSocket 地址格式无效' }
    }
    if (!['ws:', 'wss:'].includes(parsed.protocol)) {
      return { ok: false, message: 'WebSocket 地址格式无效' }
    }
    return { ok: true, message: 'WebSocket 握手通过（模拟）' }
  }
  if (mode === 'serial') {
    if (!payload?.serialPort) return { ok: false, message: '未选择串口' }
    return { ok: true, message: `串口 ${payload.serialPort} 可用（模拟）` }
  }
  if (mode === 'ble') {
    if (!payload?.bleDeviceId) return { ok: false, message: '未选择 BLE 设备' }
    return { ok: true, message: `BLE ${payload.bleDeviceId} 已响应（模拟）` }
  }
  return { ok: true, message: 'Mock 模式无需连接测试' }
})
ipcMain.handle('report:exportPdf', async (event, payload) => {
  const fileName = typeof payload?.fileName === 'string' ? payload.fileName : `report-${Date.now()}.pdf`
  const stages = [
    { stage: '数据收集', progress: 20 },
    { stage: '统计汇总', progress: 45 },
    { stage: '图表渲染', progress: 70 },
    { stage: 'PDF 打包', progress: 92 },
    { stage: '完成', progress: 100 },
  ]
  for (const item of stages) {
    event.sender.send('report:exportProgress', item)
    await sleep(260)
  }
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
