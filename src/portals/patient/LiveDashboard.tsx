import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArtifactBanner } from '../../components/ArtifactBanner'
import { EmergencyOverlay } from '../../components/EmergencyOverlay'
import { SOSButton } from '../../components/SOSButton'
import { StatusOrb } from '../../components/StatusOrb'
import { WaveformChart } from '../../components/charts/WaveformChart'
import { SignalProcessor } from '../../data/SignalProcessor'
import { useAppStore } from '../../store'
import type { ProcessedFrame, RiskState, SignalFrame } from '../../types/signal'

const processor = new SignalProcessor()
const MIN_PREICTAL_SECONDS = 30
const MAX_PREICTAL_SECONDS = 600

function nextId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function toRiskState(score: number): RiskState {
  if (score >= 85) return 'seizure'
  if (score >= 60) return 'warning'
  if (score >= 40) return 'recovery'
  return 'safe'
}

function transitionRiskState(prev: RiskState, score: number, sensitivity: number): RiskState {
  const delta = (sensitivity - 0.5) * 24
  const seizureEnter = 85 - delta
  const warningEnter = 60 - delta
  const recoveryEnter = 40 - delta
  const seizureExit = seizureEnter - 12
  const warningExit = warningEnter - 10
  const recoveryExit = recoveryEnter - 8

  if (prev === 'seizure') {
    if (score >= seizureExit) return 'seizure'
    if (score >= warningExit) return 'warning'
    return 'recovery'
  }
  if (prev === 'warning') return score >= seizureEnter ? 'seizure' : score >= warningExit ? 'warning' : 'recovery'
  if (prev === 'recovery') return score >= warningEnter ? 'warning' : score >= recoveryExit ? 'recovery' : 'safe'
  return toRiskState(score - delta)
}

export function LiveDashboard(): JSX.Element {
  const dataSource = useAppStore((state) => state.dataSource)
  const settings = useAppStore((state) => state.settings)
  const dataSourceMode = settings.dataSourceMode
  const websocketUrl = settings.websocketUrl
  const serialPort = settings.serialPort
  const baudRate = settings.baudRate
  const bleDeviceId = settings.bleDeviceId
  const bandpassLow = settings.bandpassLow
  const bandpassHigh = settings.bandpassHigh
  const notchHz = settings.notchHz
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus)
  const pushFrame = useAppStore((state) => state.pushFrame)
  const frameBuffer = useAppStore((state) => state.frameBuffer)
  const riskState = useAppStore((state) => state.riskState)
  const riskScore = useAppStore((state) => state.riskScore)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const addEvent = useAppStore((state) => state.addEvent)
  const [emergencyVisible, setEmergencyVisible] = useState(false)
  const historyRef = useRef<ProcessedFrame[]>(frameBuffer)
  const riskRef = useRef<RiskState>('safe')
  const lastAlertTsRef = useRef(0)

  useEffect(
    () =>
      useAppStore.subscribe((state) => {
        historyRef.current = state.frameBuffer
      }),
    [],
  )

  useEffect(() => {
    const cache: SignalFrame[] = []
    const unsubscribeFrame = dataSource.onFrame((frame) => {
      cache.push(frame)
      const windowed = cache.slice(-320)
      const filteredEeg = processor.notchFilter(
        processor.bandpassFilter(frame.eeg, bandpassLow, bandpassHigh, 256),
        notchHz,
        256,
      )
      const filteredFrame: SignalFrame = {
        ...frame,
        eeg: filteredEeg,
      }
      const features = processor.extractFeatures(windowed)
      const artifacts = processor.detectArtifacts(filteredFrame)
      const score = processor.computeRiskScore(features, historyRef.current)
      const stableRiskState = transitionRiskState(riskRef.current, score, settings.sensitivity)
      riskRef.current = stableRiskState
      const processed: ProcessedFrame = {
        ...filteredFrame,
        features,
        artifacts,
        riskScore: score,
        riskState: stableRiskState,
      }
      pushFrame(processed)

      if (stableRiskState === 'warning' || stableRiskState === 'seizure') {
        const now = Date.now()
        if (now - lastAlertTsRef.current > 12000) {
          lastAlertTsRef.current = now
          const alertId = nextId(stableRiskState === 'seizure' ? 'seizure-alert' : 'warning-alert')
          const eventId = nextId('alert-event')
          pushAlert({
            id: alertId,
            type: stableRiskState === 'seizure' ? 'error' : 'warning',
            title: stableRiskState === 'seizure' ? '发作高风险告警' : '监测到预警信号',
            message: `当前风险分 ${Math.round(score)}`,
            timestamp: now,
            handlingStatus: 'pending',
            riskState: stableRiskState,
            linkedEventId: eventId,
          })
          addEvent({
            id: eventId,
            type: 'alert',
            title: stableRiskState === 'seizure' ? '高风险发作告警' : '发作预警',
            timestamp: now,
            riskState: stableRiskState,
            handlingStatus: 'pending',
            linkedAlertId: alertId,
          })
        }
      }
    })
    const unsubscribeStatus = dataSource.onStatusChange(setConnectionStatus)
    const unsubscribeError = dataSource.onError(() => setConnectionStatus('error'))

    const config: Record<string, unknown> = {}
    if (dataSourceMode === 'websocket') config.url = websocketUrl
    if (dataSourceMode === 'serial') {
      config.port = serialPort
      config.baudRate = baudRate
    }
    if (dataSourceMode === 'ble' && bleDeviceId) config.deviceId = bleDeviceId
    if (dataSourceMode === 'mock') {
      const preictalSec = Math.max(MIN_PREICTAL_SECONDS, Math.min(MAX_PREICTAL_SECONDS, settings.warningLeadMinutes * 60))
      config.sampleIntervalMs = 16
      config.preictalSec = preictalSec
      config.seizureSec = 8
      config.recoverySec = 16
      config.cycleMinSec = preictalSec + 40
      config.cycleMaxSec = preictalSec + 120
    }

    setConnectionStatus('connecting')
    void dataSource.connect(config).catch(() => setConnectionStatus('error'))

    return () => {
      unsubscribeFrame()
      unsubscribeStatus()
      unsubscribeError()
      void dataSource.disconnect()
    }
  }, [
    addEvent,
    bandpassHigh,
    bandpassLow,
    baudRate,
    bleDeviceId,
    dataSource,
    dataSourceMode,
    notchHz,
    pushAlert,
    pushFrame,
    serialPort,
    setConnectionStatus,
    settings.sensitivity,
    settings.warningLeadMinutes,
    websocketUrl,
  ])

  const latest = frameBuffer.at(-1)
  const hasMovementArtifact = Boolean(latest?.artifacts.includes('movement'))
  const confidence = latest?.features.preIctalConfidence ?? 0
  const submitFeedback = useCallback(
    (feedbackResult: 'true_positive' | 'false_positive'): void => {
      addEvent({
        id: nextId(`feedback-${feedbackResult}`),
        type: 'feedback',
        title: feedbackResult === 'true_positive' ? '确认为发作' : '误报反馈',
        timestamp: Date.now(),
        feedbackResult,
        handlingStatus: 'resolved',
      })
    },
    [addEvent],
  )

  const seizureModal = useMemo(() => {
    if (riskState !== 'warning' && riskState !== 'seizure') return null
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm">
        <div className="w-[460px] rounded-lg border border-border-default bg-bg-2 p-5">
          <h3 className="text-lg font-semibold">监测到异常脑电特征</h3>
          <p className="mt-2 text-sm text-text-secondary">Pre-ictal 置信度 {(confidence * 100).toFixed(0)}%</p>
          <p className="mt-1 text-sm text-text-secondary">预计 5-10 分钟内可能发作，请寻找安全位置。</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-md border border-border-default px-3 py-1.5" onClick={() => submitFeedback('true_positive')}>确实发作了</button>
            <button className="rounded-md border border-border-default px-3 py-1.5" onClick={() => submitFeedback('false_positive')}>这是误报</button>
          </div>
        </div>
      </div>
    )
  }, [confidence, riskState, submitFeedback])

  return (
    <div className="grid h-full grid-cols-[300px_1fr_260px] gap-4">
      <div className="space-y-4">
        <StatusOrb score={riskScore} state={riskState} confidence={confidence} />
        <div className="flex items-center justify-center rounded-lg border border-border-default bg-bg-2 p-4">
          <SOSButton
            holdDuration={3000}
            onTrigger={() => {
              const eventId = nextId('sos-event')
              const alertId = nextId('sos-alert')
              pushAlert({
                id: alertId,
                type: 'sos',
                title: 'SOS 已触发',
                message: '紧急联系人已通知',
                timestamp: Date.now(),
                sticky: true,
                handlingStatus: 'pending',
                linkedEventId: eventId,
              })
              addEvent({
                id: eventId,
                type: 'sos',
                title: '患者触发 SOS',
                timestamp: Date.now(),
                riskState: 'emergency',
                handlingStatus: 'pending',
                linkedAlertId: alertId,
              })
              setEmergencyVisible(true)
            }}
          />
        </div>
      </div>
      <div className="space-y-3">
        <ArtifactBanner visible={hasMovementArtifact} message="监测到较强肢体活动干扰 · 预警精度暂时受限 · 建议保持平稳" />
        <WaveformChart title="EEG" unit="μV" frames={frameBuffer} selector={(f) => f.eeg[0] ?? 0} color="#39D0D8" />
        <WaveformChart title="NIRS" unit="%" frames={frameBuffer} selector={(f) => f.nirs.spo2} color="#A371F7" />
        <WaveformChart title="EMG" unit="μV" frames={frameBuffer} selector={(f) => f.emg[0] ?? 0} color="#F0883E" />
      </div>
      <div className="space-y-3">
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">今日发作次数</div>
          <div className="mt-2 font-mono text-3xl">3</div>
        </div>
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">上次事件</div>
          <div className="mt-2 text-sm">03:42 · 持续 2m14s</div>
        </div>
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">服药依从性</div>
          <div className="mt-2 text-2xl font-mono">87%</div>
        </div>
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">下次服药倒计时</div>
          <div className="mt-2 font-mono text-xl text-warn">00:48:12</div>
        </div>
      </div>
      {seizureModal}
      <EmergencyOverlay visible={emergencyVisible} onClose={() => setEmergencyVisible(false)} />
    </div>
  )
}
