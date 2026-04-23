import type { RiskState } from './signal'

export type EventType = 'system' | 'medication' | 'manual' | 'alert' | 'feedback' | 'sos'
export type HandlingStatus = 'pending' | 'acknowledged' | 'resolved'
export type FeedbackResult = 'true_positive' | 'false_positive'

export interface SeizureEvent {
  id: string
  type: EventType
  title: string
  timestamp: number
  durationSec?: number
  riskState?: RiskState
  details?: string
  handlingStatus?: HandlingStatus
  linkedAlertId?: string
  feedbackResult?: FeedbackResult
}

export interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success' | 'sos'
  title: string
  message: string
  timestamp: number
  sticky?: boolean
  handlingStatus?: HandlingStatus
  linkedEventId?: string
  riskState?: RiskState
}
