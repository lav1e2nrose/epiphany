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
  handlingStatus: HandlingStatus
  /** 关联的告警 ID（用于将事件与告警队列统一追踪） */
  linkedAlertId?: string
  /** 关联的事件 ID（用于将反馈与预警/告警统一追踪） */
  relatedEventId?: string
  /** 用户对预警结果的反馈（命中 / 误报） */
  feedbackResult?: FeedbackResult
  handledAt?: number
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
  feedbackResult?: FeedbackResult
  handledAt?: number
}
