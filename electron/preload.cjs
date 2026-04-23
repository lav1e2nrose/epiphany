const { contextBridge, ipcRenderer } = require('electron')

const reportProgressListeners = new Set()
ipcRenderer.on('report:exportProgress', (_event, payload) => {
  reportProgressListeners.forEach((listener) => listener(payload))
})

contextBridge.exposeInMainWorld('epiphany', {
  windowAction: (action) => ipcRenderer.invoke('window:action', action),
  getEvents: () => ipcRenderer.invoke('store:getEvents'),
  getSettings: () => ipcRenderer.invoke('store:getSettings'),
  getPersistedState: () => ipcRenderer.invoke('store:getPersistedState'),
  addEvent: (event) => ipcRenderer.invoke('store:addEvent', event),
  updateEventHandling: (eventId, handlingStatus) => ipcRenderer.invoke('store:updateEventHandling', { eventId, handlingStatus }),
  updateSettings: (patch) => ipcRenderer.invoke('store:updateSettings', patch),
  listSerialPorts: () => ipcRenderer.invoke('data:listSerialPorts'),
  scanBleDevices: () => ipcRenderer.invoke('data:scanBleDevices'),
  testConnection: (payload) => ipcRenderer.invoke('data:testConnection', payload),
  exportPdf: (payload) => ipcRenderer.invoke('report:exportPdf', payload),
  showItemInFolder: (filePath) => ipcRenderer.invoke('report:showItemInFolder', filePath),
  checkForUpdates: () => ipcRenderer.invoke('system:checkForUpdates'),
  clearLocalCache: () => ipcRenderer.invoke('system:clearLocalCache'),
  exportDiagnosticLog: () => ipcRenderer.invoke('system:exportDiagnosticLog'),
  onExportProgress: (callback) => {
    reportProgressListeners.add(callback)
    return () => reportProgressListeners.delete(callback)
  },
})
