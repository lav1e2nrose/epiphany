import type { RiskState } from './signal'

export type Portal = 'patient' | 'guardian' | 'doctor'
export type MonitoringMode = 'daytime' | 'sleep' | 'inpatient'

export interface User {
  id: string
  name: string
  role: Portal
}

export interface Patient {
  id: string
  name: string
  age: number
  weeklySeizures: number
  lastSeizure: string
  riskLevel: RiskState
  adherence: number
}

export interface AppSettings {
  dataSourceMode: 'mock' | 'websocket' | 'serial' | 'ble'
  websocketUrl: string
  serialPort: string
  baudRate: number
  bleDeviceId: string

  notchHz: 50 | 60
  bandpassLow: number
  bandpassHigh: number
  emgThreshold: number
  sensitivity: number

  caregiverPhone: string
  alertSound: boolean
  warningLeadMinutes: number

  monitoringMode: MonitoringMode
  sleepStartHour: string
  sleepEndHour: string

  cameraSource: 'builtin' | 'usb' | 'ip'
  cameraUrl: string
  autoVideoLink: boolean
  videoPreRecordSec: number
  videoPostRecordMin: number
  faceBlurEnabled: boolean
  localRetentionDays: number

  voiceInputEnabled: boolean
  voiceLanguage: 'zh-CN'
  voiceHoldToRecord: boolean

  chatDesktopNotify: boolean
  chatBadgeNotify: boolean
  quietHoursStart: string
  quietHoursEnd: string
  chatDefaultPolicy: 'auto_open' | 'manual_open'
}
