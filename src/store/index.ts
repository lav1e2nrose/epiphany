import { create } from 'zustand'
import type { Alert, HandlingStatus, SeizureEvent } from '../types/events'
import type { AppSettings, Patient, Portal, User } from '../types/user'
import type { ConnectionStatus, IDataSource } from '../data/IDataSource'
import type { ProcessedFrame, RiskState } from '../types/signal'
import { MockAdapter } from '../data/adapters/MockAdapter'
import { WebSocketAdapter } from '../data/adapters/WebSocketAdapter'
import { SerialAdapter } from '../data/adapters/SerialAdapter'
import { BLEAdapter } from '../data/adapters/BLEAdapter'

const MAX_FRAMES = 7680

const defaultSettings: AppSettings = {
  dataSourceMode: 'mock',
  websocketUrl: 'ws://localhost:8080/stream',
  serialPort: 'COM3',
  baudRate: 115200,
  bleDeviceId: '',
  notchHz: 50,
  bandpassLow: 0.5,
  bandpassHigh: 70,
  emgThreshold: 150,
  sensitivity: 0.5,
  caregiverPhone: '',
  alertSound: true,
  warningLeadMinutes: 10,
}

const demoPatients: Patient[] = [
  { id: 'p1', name: '李明', age: 34, weeklySeizures: 7, lastSeizure: '2h前', riskLevel: 'seizure', adherence: 62 },
  { id: 'p2', name: '王芳', age: 28, weeklySeizures: 2, lastSeizure: '1d前', riskLevel: 'warning', adherence: 91 },
  { id: 'p3', name: '赵阳', age: 16, weeklySeizures: 4, lastSeizure: '6h前', riskLevel: 'warning', adherence: 78 },
  { id: 'p4', name: '陈雪', age: 42, weeklySeizures: 1, lastSeizure: '3d前', riskLevel: 'safe', adherence: 96 },
  { id: 'p5', name: '张一', age: 22, weeklySeizures: 5, lastSeizure: '9h前', riskLevel: 'seizure', adherence: 66 },
  { id: 'p6', name: '刘青', age: 31, weeklySeizures: 0, lastSeizure: '8d前', riskLevel: 'safe', adherence: 98 },
  { id: 'p7', name: '孙杰', age: 19, weeklySeizures: 3, lastSeizure: '15h前', riskLevel: 'warning', adherence: 85 },
  { id: 'p8', name: '周宁', age: 52, weeklySeizures: 6, lastSeizure: '4h前', riskLevel: 'seizure', adherence: 71 },
]

function normalizeEvent(event: SeizureEvent): SeizureEvent {
  if (event.handlingStatus) return event
  const handlingStatus: HandlingStatus = event.type === 'alert' || event.type === 'sos' ? 'pending' : 'resolved'
  return { ...event, handlingStatus }
}

export interface AppStore {
  dataSource: IDataSource
  connectionStatus: ConnectionStatus
  setConnectionStatus: (status: ConnectionStatus) => void
  setDataSource: (source: IDataSource) => void
  setDataSourceMode: (mode: AppSettings['dataSourceMode']) => void

  frameBuffer: ProcessedFrame[]
  latestFrame: ProcessedFrame | null
  pushFrame: (frame: ProcessedFrame) => void

  riskState: RiskState
  riskScore: number

  events: SeizureEvent[]
  addEvent: (event: SeizureEvent) => void
  updateEventHandling: (eventId: string, handlingStatus: HandlingStatus) => void

  currentUser: User | null
  currentPortal: Portal
  login: (user: User) => void
  switchPortal: (portal: Portal) => void
  requestedPage: string | null
  requestPage: (page: string) => void
  consumeRequestedPage: () => void

  alerts: Alert[]
  pushAlert: (alert: Alert) => void
  dismissAlert: (id: string) => void

  patients: Patient[]

  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  hydratePersistedState: (persisted: { events?: SeizureEvent[]; settings?: Partial<AppSettings> }) => void

  reviewFocusTimestamp: number | null
  setReviewFocusTimestamp: (timestamp: number | null) => void
}

function createDataSource(mode: AppSettings['dataSourceMode']): IDataSource {
  if (mode === 'websocket') return new WebSocketAdapter()
  if (mode === 'serial') return new SerialAdapter()
  if (mode === 'ble') return new BLEAdapter()
  return new MockAdapter()
}

export const useAppStore = create<AppStore>((set) => ({
  dataSource: new MockAdapter(),
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setDataSource: (source) => set({ dataSource: source }),
  setDataSourceMode: (mode) => {
    set((state) => ({
      settings: { ...state.settings, dataSourceMode: mode },
      dataSource: createDataSource(mode),
      connectionStatus: 'disconnected',
    }))
    void window.epiphany?.updateSettings({ dataSourceMode: mode })
  },

  frameBuffer: [],
  latestFrame: null,
  pushFrame: (frame) =>
    set((state) => ({
      frameBuffer: [...state.frameBuffer, frame].slice(-MAX_FRAMES),
      latestFrame: frame,
      riskState: frame.riskState,
      riskScore: frame.riskScore,
    })),

  riskState: 'safe',
  riskScore: 0,

  events: [],
  addEvent: (event) => {
    const normalizedEvent = normalizeEvent(event)
    set((state) => ({ events: [normalizedEvent, ...state.events].slice(0, 300) }))
    void window.epiphany?.addEvent(normalizedEvent)
  },
  updateEventHandling: (eventId, handlingStatus) => {
    set((state) => ({
      events: state.events.map((event) => (event.id === eventId ? { ...event, handlingStatus } : event)),
    }))
    void window.epiphany?.updateEventHandling(eventId, handlingStatus)
  },

  currentUser: null,
  currentPortal: 'patient',
  login: (user) => set({ currentUser: user, currentPortal: user.role }),
  switchPortal: (portal) => set({ currentPortal: portal }),
  requestedPage: null,
  requestPage: (page) => set({ requestedPage: page }),
  consumeRequestedPage: () => set({ requestedPage: null }),

  alerts: [],
  pushAlert: (alert) =>
    set((state) => {
      const nextAlert: Alert = {
        ...alert,
        handlingStatus: alert.handlingStatus ?? 'pending',
      }
      return { alerts: [...state.alerts, nextAlert].slice(-10) }
    }),
  dismissAlert: (id) => set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),

  patients: demoPatients,

  settings: defaultSettings,
  updateSettings: (patch) => {
    set((state) => ({ settings: { ...state.settings, ...patch } }))
    void window.epiphany?.updateSettings(patch)
  },
  hydratePersistedState: (persisted) =>
    set((state) => {
      const nextSettings = { ...state.settings, ...(persisted.settings ?? {}) }
        return {
          events: Array.isArray(persisted.events) ? persisted.events.slice(0, 300).map(normalizeEvent) : state.events,
          settings: nextSettings,
          dataSource: createDataSource(nextSettings.dataSourceMode),
        }
    }),

  reviewFocusTimestamp: null,
  setReviewFocusTimestamp: (timestamp) => set({ reviewFocusTimestamp: timestamp }),
}))
