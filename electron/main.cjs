const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs/promises')
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
// 模拟报告分阶段构建节奏，便于前端呈现平滑进度动画。
const EXPORT_STAGE_DELAY_MS = 260

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
ipcMain.handle('store:updateEventHandling', (_event, payload) => {
  const eventId = typeof payload?.eventId === 'string' ? payload.eventId : ''
  const handlingStatus = typeof payload?.handlingStatus === 'string' ? payload.handlingStatus : ''
  if (!eventId || !handlingStatus) return
  const events = asArray(store.get('events', []))
  store.set(
    'events',
    events.map((item) => (item?.id === eventId ? { ...item, handlingStatus } : item)),
  )
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
  const rawName = typeof payload?.fileName === 'string' ? payload.fileName : `report-${Date.now()}.pdf`
  const fileName = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`
  const filePath = path.join(app.getPath('documents'), fileName)
  const stages = [
    { stage: '数据收集', progress: 20 },
    { stage: '统计汇总', progress: 45 },
    { stage: '图表渲染', progress: 70 },
    { stage: 'PDF 打包', progress: 92 },
    { stage: '完成', progress: 100 },
  ]
  for (const item of stages) {
    event.sender.send('report:exportProgress', item)
    await sleep(EXPORT_STAGE_DELAY_MS)
  }
  const sections = Array.isArray(payload?.modules) ? payload.modules.join(' / ') : '无'
  const html = `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>灵犀妙探报告</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 32px; color: #111; }
          h1 { margin-bottom: 8px; }
          .meta { color: #555; margin-bottom: 24px; }
          .card { border: 1px solid #dcdcdc; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>灵犀妙探 · 医疗报告</h1>
        <div class="meta">导出时间：${new Date().toLocaleString()} ｜ 患者：${payload?.patientId ?? 'all'} ｜ 统计范围：${payload?.rangeDays ?? 7} 天</div>
        <div class="card"><strong>导出章节</strong><div>${sections}</div></div>
        <div class="card"><strong>医生备注</strong><div>${typeof payload?.note === 'string' ? payload.note : '无'}</div></div>
      </body>
    </html>
  `
  let tempWindow
  try {
    tempWindow = new BrowserWindow({
      show: false,
      width: 1024,
      height: 1440,
      webPreferences: { sandbox: true },
    })
    await tempWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdfBuffer = await tempWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
    })
    await fs.writeFile(filePath, pdfBuffer)
    shell.showItemInFolder(filePath)
    return { ok: true, fileName, filePath }
  } finally {
    if (tempWindow && !tempWindow.isDestroyed()) {
      tempWindow.close()
    }
  }
})
ipcMain.handle('report:showItemInFolder', (_event, filePath) => {
  if (typeof filePath !== 'string' || filePath.length === 0) return false
  shell.showItemInFolder(filePath)
  return true
})
ipcMain.handle('system:checkForUpdates', () => ({
  ok: true,
  message: `当前已是最新版本（v${app.getVersion()}）`,
}))
ipcMain.handle('system:clearLocalCache', async () => {
  store.set('events', [])
  store.set('settings', {})
  return { ok: true, message: '本地缓存已清除（包含事件日志与设置）' }
})
ipcMain.handle('system:exportDiagnosticLog', async () => {
  const filePath = path.join(app.getPath('documents'), `epiphany-diagnostic-${Date.now()}.json`)
  const snapshot = {
    exportedAt: Date.now(),
    appVersion: app.getVersion(),
    platform: process.platform,
    release: os.release(),
    persisted: {
      events: asArray(store.get('events', [])),
      settings: asObject(store.get('settings', {})),
    },
  }
  await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf8')
  shell.showItemInFolder(filePath)
  return { ok: true, filePath, message: '诊断日志导出成功' }
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
