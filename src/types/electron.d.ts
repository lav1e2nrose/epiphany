import type { SeizureEvent } from './events'

declare global {
  interface Window {
    epiphany?: {
      windowAction: (action: 'minimize' | 'maximize' | 'close') => Promise<void>
      getEvents: () => Promise<SeizureEvent[]>
      addEvent: (event: SeizureEvent) => Promise<void>
      updateSettings: (patch: Record<string, unknown>) => Promise<void>
      listSerialPorts: () => Promise<string[]>
      scanBleDevices: () => Promise<string[]>
      exportPdf: (fileName: string) => Promise<{ ok: boolean; fileName: string }>
    }
  }
}

export {}
