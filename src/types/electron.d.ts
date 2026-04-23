import type { SeizureEvent } from './events'
import type { AppSettings } from './user'

interface PersistedState {
  events: SeizureEvent[]
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
  }) => Promise<{ ok: boolean; fileName: string }>
  onExportProgress: (callback: (payload: ExportProgressPayload) => void) => () => void
}

declare global {
  interface Window {
    epiphany?: EpiphanyBridge
  }
}

export {}
