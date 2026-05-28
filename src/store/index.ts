import { create } from 'zustand'
import type { Alert, HandlingStatus, SeizureEvent } from '../types/events'
import type {
  AISummary,
  ChatChannel,
  ChatMessage,
  ClinicalSeizureEvent,
  MedicalHistory,
  VideoClipMeta,
} from '../types/clinical'
import type { AppSettings, MonitoringMode, Patient, Portal, User } from '../types/user'
import type { ConnectionStatus, IDataSource } from '../data/IDataSource'
import type { ProcessedFrame, RiskState } from '../types/signal'
import { MockAdapter } from '../data/adapters/MockAdapter'
import { WebSocketAdapter } from '../data/adapters/WebSocketAdapter'
import { SerialAdapter } from '../data/adapters/SerialAdapter'
import { BLEAdapter } from '../data/adapters/BLEAdapter'
import { generateSummaryDraft } from '../ai/SummaryGenerator'

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

  monitoringMode: 'daytime',
  sleepStartHour: '22:00',
  sleepEndHour: '07:00',

  cameraSource: 'ip',
  cameraUrl: 'rtsp://demo.local/live',
  autoVideoLink: true,
  videoPreRecordSec: 30,
  videoPostRecordMin: 5,
  faceBlurEnabled: false,
  localRetentionDays: 30,

  voiceInputEnabled: true,
  voiceLanguage: 'zh-CN',
  voiceHoldToRecord: true,

  chatDesktopNotify: true,
  chatBadgeNotify: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  chatDefaultPolicy: 'manual_open',
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

const demoMedicalHistory: Record<string, MedicalHistory> = {
  p1: {
    patientId: 'p1',
    cerebralInfection: { value: false },
    headTrauma: { value: false },
    birthInjury: { value: 'unknown', detail: '家属无法回忆' },
    febrileSeizure: { value: true, ageAtEvent: 5, detail: '高热抽搐约2分钟' },
    familyHistory: { value: false },
    medications: [
      { drugName: '拉莫三嗪', dosage: '200mg bid', startDate: '2023-01-01', effect: 'partial', notes: '夜间发作仍偶发' },
    ],
    drugReactions: '偶有轻度皮疹',
    onsetAge: 16,
    seizureFrequencyHistory: [
      { year: 2022, monthlyCount: 3 },
      { year: 2023, monthlyCount: 2 },
      { year: 2024, monthlyCount: 4 },
    ],
    seizureEvolutionNotes: '近半年夜间事件增多，凌晨 2-5 点集中。',
    examinations: [
      {
        type: 'EEG',
        date: '2025-01-10',
        hospital: '华山医院',
        conclusion: '右侧颞区可见异常放电。',
        attachments: [{ name: 'EEG-20250110.pdf', url: '#', sizeLabel: '2.1MB' }],
      },
    ],
    questionnaires: [
      { name: 'QOLIE-31', date: '2025-01-11', totalScore: 58, itemScores: { sleep: 2, mood: 3 }, interpretation: '生活质量中等受影响' },
    ],
    updatedAt: Date.now(),
    lockedByDoctor: false,
  },
}

const demoClinicalEvents: ClinicalSeizureEvent[] = [
  {
    id: 'cse-1',
    patientId: 'p1',
    timestamp: Date.now() - 3600 * 1000 * 7,
    durationSec: 134,
    source: 'patient',
    confirmed: 'confirmed',
    pre: {
      triggers: [
        {
          category: 'sleep_deprivation',
          rawInput: '昨晚没睡好，凌晨还醒来几次',
          refinedAnswers: [
            { question: '昨晚大约几点上床？', answer: '23:50', answerType: 'text' },
            { question: '总睡眠时长大约多少？', answer: '4.5h', answerType: 'choice' },
          ],
          severity: 4,
        },
      ],
      aura: [{ type: 'epigastric_rising', description: '上腹有上冲感，约持续30秒' }],
      timeBeforeOnset: 30,
    },
    ictal: {
      seizureType: 'focal_impaired',
      symptoms: ['右上肢强直', '意识丧失', '口角偏斜'],
      patientDescription: '意识恢复后仅记得胸口发紧。',
      witnessDescription: '右臂突然僵硬约2分钟。',
      videoClipUrl: '/mock-videos/clip-1.mp4',
      eegSnippetRef: 'eeg-snippet-1',
    },
    post: {
      state: 'confused',
      recoveryDurationMin: 8,
      notes: '有短时迷糊，休息后恢复。',
    },
    medicationCompliance: { missedDoseLast24h: false, lastDoseTime: Date.now() - 3600 * 1000 * 9 },
    doctorReview: {
      doctorId: 'doc-1',
      reviewedAt: Date.now() - 3600 * 1000 * 2,
      annotation: '事件与夜间睡眠不足相关，建议继续睡眠监测。',
      classification: 'focal_impaired',
      relevanceToTreatment: 'high',
    },
  },
]

const demoChatMessages: Record<string, ChatMessage[]> = {
  p1: [
    {
      id: 'chat-1',
      patientId: 'p1',
      doctorId: 'doc-1',
      sender: 'doctor',
      type: 'text',
      content: '本周先保持睡眠监测模式，复诊时带上 01-15 事件记录。',
      timestamp: Date.now() - 1000 * 60 * 60 * 12,
      read: true,
    },
  ],
}

const demoChatChannels: Record<string, ChatChannel> = {
  p1: { patientId: 'p1', doctorId: 'doc-1', status: 'open', openedAt: Date.now() - 1000 * 60 * 60 * 24 * 3 },
  p2: { patientId: 'p2', doctorId: 'doc-1', status: 'closed', closedAt: Date.now() - 1000 * 60 * 60 * 24 * 2, reason: '复诊后暂时关闭' },
}

const demoVideoClips: VideoClipMeta[] = [
  {
    id: 'clip-1',
    patientId: 'p1',
    eventId: 'cse-1',
    startAt: Date.now() - 3600 * 1000 * 7,
    endAt: Date.now() - 3600 * 1000 * 7 + 134000,
    durationSec: 134,
    source: 'mock',
    thumbnail: '🌙',
    fileUrl: '/mock-videos/clip-1.mp4',
  },
]

function normalizeEvent(event: SeizureEvent): SeizureEvent {
  if (event.handlingStatus) return event
  const handlingStatus: HandlingStatus = event.type === 'alert' || event.type === 'sos' ? 'pending' : 'resolved'
  return { ...event, handlingStatus }
}

function normalizeAlert(alert: Alert): Alert {
  if (alert.handlingStatus) return alert
  const handlingStatus: HandlingStatus = alert.type === 'warning' || alert.type === 'error' || alert.type === 'sos' ? 'pending' : 'resolved'
  return { ...alert, handlingStatus }
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

  clinicalEvents: ClinicalSeizureEvent[]
  addSeizureEvent: (event: ClinicalSeizureEvent) => void
  updateSeizurePhase: (id: string, phase: 'pre' | 'ictal' | 'post', patch: Partial<ClinicalSeizureEvent['pre']> | Partial<ClinicalSeizureEvent['ictal']> | Partial<ClinicalSeizureEvent['post']>) => void
  reviewSeizure: (id: string, review: NonNullable<ClinicalSeizureEvent['doctorReview']>) => void

  currentUser: User | null
  currentPortal: Portal
  login: (user: User) => void
  switchPortal: (portal: Portal) => void
  requestedPage: string | null
  requestPage: (page: string) => void
  consumeRequestedPage: () => void

  alerts: Alert[]
  pushAlert: (alert: Alert) => void
  updateAlertHandling: (alertId: string, handlingStatus: HandlingStatus) => void
  dismissAlert: (id: string) => void

  patients: Patient[]
  selectedDoctorPatientId: string | null
  setSelectedDoctorPatientId: (patientId: string | null) => void

  settings: AppSettings
  monitoringMode: MonitoringMode
  setMonitoringMode: (mode: MonitoringMode) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  hydratePersistedState: (persisted: { events?: SeizureEvent[]; alerts?: Alert[]; settings?: Partial<AppSettings> }) => void

  medicalHistories: Record<string, MedicalHistory>
  upsertMedicalHistory: (history: MedicalHistory) => void

  chatMessages: Record<string, ChatMessage[]>
  sendChatMessage: (message: ChatMessage) => void

  chatChannels: Record<string, ChatChannel>
  toggleChatChannel: (patientId: string, status: ChatChannel['status'], reason?: string) => void

  aiSummaries: Record<string, AISummary[]>
  generateAISummary: (patientId: string, start: number, end: number) => Promise<AISummary>
  approveAISummary: (summaryId: string) => void

  videoClips: VideoClipMeta[]
  addVideoClip: (clip: VideoClipMeta) => void

  reviewFocusTimestamp: number | null
  setReviewFocusTimestamp: (timestamp: number | null) => void
}

function createDataSource(mode: AppSettings['dataSourceMode']): IDataSource {
  if (mode === 'websocket') return new WebSocketAdapter()
  if (mode === 'serial') return new SerialAdapter()
  if (mode === 'ble') return new BLEAdapter()
  return new MockAdapter()
}

export const useAppStore = create<AppStore>((set, get) => ({
  dataSource: new MockAdapter(),
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setDataSource: (source) => set({ dataSource: source }),
  setDataSourceMode: (mode) => {
    set((state) => {
      const nextSettings = { ...state.settings, dataSourceMode: mode }
      return {
        settings: nextSettings,
        dataSource: createDataSource(mode),
        connectionStatus: 'disconnected',
      }
    })
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
    let linkedAlertId: string | undefined
    set((state) => {
      const nextEvents = state.events.map((event) =>
        event.id === eventId ? { ...event, handlingStatus, handledAt: Date.now() } : event,
      )
      linkedAlertId = nextEvents.find((event) => event.id === eventId)?.linkedAlertId
      return {
        events: nextEvents,
        alerts: linkedAlertId
          ? state.alerts.map((alert) =>
              alert.id === linkedAlertId ? { ...alert, handlingStatus, handledAt: Date.now() } : alert,
            )
          : state.alerts,
      }
    })
    void window.epiphany?.updateEventHandling(eventId, handlingStatus)
    if (linkedAlertId) {
      void window.epiphany?.updateAlertHandling(linkedAlertId, handlingStatus)
    }
  },

  clinicalEvents: demoClinicalEvents,
  addSeizureEvent: (event) => set((state) => ({ clinicalEvents: [event, ...state.clinicalEvents] })),
  updateSeizurePhase: (id, phase, patch) =>
    set((state) => ({
      clinicalEvents: state.clinicalEvents.map((event) =>
        event.id === id
          ? {
              ...event,
              [phase]: { ...event[phase], ...patch },
            }
          : event,
      ),
    })),
  reviewSeizure: (id, review) =>
    set((state) => ({
      clinicalEvents: state.clinicalEvents.map((event) =>
        event.id === id ? { ...event, confirmed: 'confirmed', doctorReview: review } : event,
      ),
    })),

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
      const nextAlert = normalizeAlert(alert)
      void window.epiphany?.addAlert(nextAlert)
      return {
        alerts: [...state.alerts.filter((item) => item.id !== nextAlert.id), nextAlert].slice(-10),
      }
    }),
  updateAlertHandling: (alertId, handlingStatus) => {
    set((state) => ({
      alerts: state.alerts.map((alert) => (alert.id === alertId ? { ...alert, handlingStatus, handledAt: Date.now() } : alert)),
    }))
    void window.epiphany?.updateAlertHandling(alertId, handlingStatus)
  },
  dismissAlert: (id) => {
    set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) }))
    void window.epiphany?.dismissAlert(id)
  },

  patients: demoPatients,
  selectedDoctorPatientId: demoPatients[0]?.id ?? null,
  setSelectedDoctorPatientId: (patientId) => set({ selectedDoctorPatientId: patientId }),

  settings: defaultSettings,
  monitoringMode: defaultSettings.monitoringMode,
  setMonitoringMode: (mode) =>
    set((state) => {
      const nextSettings = { ...state.settings, monitoringMode: mode }
      void window.epiphany?.updateSettings({ monitoringMode: mode })
      return { monitoringMode: mode, settings: nextSettings }
    }),
  updateSettings: (patch) => {
    set((state) => {
      const nextSettings = { ...state.settings, ...patch }
      return { settings: nextSettings, monitoringMode: nextSettings.monitoringMode }
    })
    void window.epiphany?.updateSettings(patch)
  },
  hydratePersistedState: (persisted) =>
    set((state) => {
      const nextSettings = { ...state.settings, ...(persisted.settings ?? {}) }
      return {
        events: Array.isArray(persisted.events) ? persisted.events.slice(0, 300).map(normalizeEvent) : state.events,
        alerts: Array.isArray(persisted.alerts) ? persisted.alerts.slice(-10).map(normalizeAlert) : state.alerts,
        settings: nextSettings,
        monitoringMode: nextSettings.monitoringMode,
        dataSource: createDataSource(nextSettings.dataSourceMode),
      }
    }),

  medicalHistories: demoMedicalHistory,
  upsertMedicalHistory: (history) =>
    set((state) => ({
      medicalHistories: {
        ...state.medicalHistories,
        [history.patientId]: { ...history, updatedAt: Date.now() },
      },
    })),

  chatMessages: demoChatMessages,
  sendChatMessage: (message) =>
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [message.patientId]: [...(state.chatMessages[message.patientId] ?? []), message],
      },
    })),

  chatChannels: demoChatChannels,
  toggleChatChannel: (patientId, status, reason) =>
    set((state) => {
      const current = state.chatChannels[patientId] ?? { patientId, doctorId: 'doc-1', status: 'closed' }
      return {
        chatChannels: {
          ...state.chatChannels,
          [patientId]: {
            ...current,
            status,
            reason,
            openedAt: status === 'open' ? Date.now() : current.openedAt,
            closedAt: status === 'open' ? undefined : Date.now(),
          },
        },
      }
    }),

  aiSummaries: {},
  generateAISummary: async (patientId, start, end) => {
    const state = get()
    const summary = generateSummaryDraft({
      patientId,
      periodStart: start,
      periodEnd: end,
      events: state.clinicalEvents.filter((event) => event.patientId === patientId && event.timestamp >= start && event.timestamp <= end),
      medicalHistory: state.medicalHistories[patientId],
    })
    set((current) => ({
      aiSummaries: {
        ...current.aiSummaries,
        [patientId]: [summary, ...(current.aiSummaries[patientId] ?? [])],
      },
    }))
    return summary
  },
  approveAISummary: (summaryId) =>
    set((state) => {
      const nextEntries = Object.entries(state.aiSummaries).map(([patientId, summaries]) => [
        patientId,
        summaries.map((summary) => (summary.id === summaryId ? { ...summary, draftStatus: 'doctor_approved' as const } : summary)),
      ])
      return { aiSummaries: Object.fromEntries(nextEntries) }
    }),

  videoClips: demoVideoClips,
  addVideoClip: (clip) => set((state) => ({ videoClips: [clip, ...state.videoClips].slice(0, 120) })),

  reviewFocusTimestamp: null,
  setReviewFocusTimestamp: (timestamp) => set({ reviewFocusTimestamp: timestamp }),
}))
