const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('epiphany', {
  windowAction: (action) => ipcRenderer.invoke('window:action', action),
  getEvents: () => ipcRenderer.invoke('store:getEvents'),
  addEvent: (event) => ipcRenderer.invoke('store:addEvent', event),
  updateSettings: (patch) => ipcRenderer.invoke('store:updateSettings', patch),
  listSerialPorts: () => ipcRenderer.invoke('data:listSerialPorts'),
  scanBleDevices: () => ipcRenderer.invoke('data:scanBleDevices'),
  exportPdf: (fileName) => ipcRenderer.invoke('report:exportPdf', fileName),
})
