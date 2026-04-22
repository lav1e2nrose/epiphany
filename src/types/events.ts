import type { RiskState } from './signal'

export type EventType = 'system' | 'medication' | 'manual' | 'alert' | 'feedback' | 'sos'

export interface SeizureEvent {
  id: string
  type: EventType
  title: string
  timestamp: number
  durationSec?: number
  riskState?: RiskState
  details?: string
  resolved?: boolean
}

export interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success' | 'sos'
  title: string
  message: string
  timestamp: number
  sticky?: boolean
}
