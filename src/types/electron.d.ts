import type { Alert, HandlingStatus, SeizureEvent } from './events'
import type { AppSettings } from './user'

interface PersistedState {
  events: SeizureEvent[]
  alerts: Alert[]
  settings: Partial<AppSettings>
}

interface ExportProgressPayload {
  stage: string
  progress: number
}

interface ConnectionTestPayload {
  mode: AppSettings['dataSourceMode']
  websocketUrl?: string
  serialPort?: string
  bleDeviceId?: string
}

type EpiphanyBridge = {
  windowAction: (action: 'minimize' | 'maximize' | 'close') => Promise<void>
  getEvents: () => Promise<SeizureEvent[]>
  getSettings: () => Promise<Partial<AppSettings>>
  getPersistedState: () => Promise<PersistedState>
  addEvent: (event: SeizureEvent) => Promise<void>
  addAlert: (alert: Alert) => Promise<void>
  updateEventHandling: (eventId: string, handlingStatus: HandlingStatus) => Promise<void>
  updateAlertHandling: (alertId: string, handlingStatus: HandlingStatus) => Promise<void>
  dismissAlert: (alertId: string) => Promise<void>
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  listSerialPorts: () => Promise<string[]>
  scanBleDevices: () => Promise<string[]>
  testConnection: (payload: ConnectionTestPayload) => Promise<{ ok: boolean; message: string }>
  exportPdf: (payload: {
    fileName: string
    modules: string[]
    note: string
    patientId?: string
    rangeDays?: number
    includeSignature?: boolean
    reportCycle?: 'week' | 'month'
    startDate?: string
    endDate?: string
  }) => Promise<{ ok: boolean; fileName: string; filePath: string }>
  showItemInFolder: (filePath: string) => Promise<boolean>
  checkForUpdates: () => Promise<{ ok: boolean; message: string }>
  clearLocalCache: () => Promise<{ ok: boolean; message: string }>
  exportDiagnosticLog: () => Promise<{ ok: boolean; filePath?: string; message: string }>
  onExportProgress: (callback: (payload: ExportProgressPayload) => void) => () => void
}

declare global {
  interface Window {
    epiphany?: EpiphanyBridge
  }
}

export {}
