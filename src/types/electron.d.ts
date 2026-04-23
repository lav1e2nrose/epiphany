import type { SeizureEvent } from './events'
import type { AppSettings } from './user'

interface PersistedState {
  events: SeizureEvent[]
  settings: Partial<AppSettings>
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
  exportPdf: (fileName: string) => Promise<{ ok: boolean; fileName: string }>
}

declare global {
  interface Window {
    epiphany?: EpiphanyBridge
  }
}

export {}
