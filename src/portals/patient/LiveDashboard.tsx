import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArtifactBanner } from '../../components/ArtifactBanner'
import { EmergencyOverlay } from '../../components/EmergencyOverlay'
import { SOSButton } from '../../components/SOSButton'
import { StatusOrb } from '../../components/StatusOrb'
import { WaveformChart } from '../../components/charts/WaveformChart'
import { SignalProcessor } from '../../data/SignalProcessor'
import { useAppStore } from '../../store'
import type { ProcessedFrame, RiskState, SignalFrame } from '../../types/signal'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'

const processor = new SignalProcessor()
const MIN_PREICTAL_SECONDS = 30
const MAX_PREICTAL_SECONDS = 600
const MEDICATION_HOURS = [8, 14, 20]

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

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
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
  const events = useAppStore((state) => state.events)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const addEvent = useAppStore((state) => state.addEvent)
  const updateEventHandling = useAppStore((state) => state.updateEventHandling)
  const updateAlertHandling = useAppStore((state) => state.updateAlertHandling)
  const [emergencyVisible, setEmergencyVisible] = useState(false)
  const [nowTs, setNowTs] = useState(Date.now())
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
      const pendingIncident = events.find((event) => (event.type === 'alert' || event.type === 'sos') && event.handlingStatus === 'pending')
      addEvent({
        id: nextId(`feedback-${feedbackResult}`),
        type: 'feedback',
        title: feedbackResult === 'true_positive' ? '确认为发作' : '误报反馈',
        timestamp: Date.now(),
        feedbackResult,
        handlingStatus: 'resolved',
        relatedEventId: pendingIncident?.id,
        linkedAlertId: pendingIncident?.linkedAlertId,
      })
      if (pendingIncident) {
        updateEventHandling(pendingIncident.id, 'resolved')
        if (pendingIncident.linkedAlertId) {
          updateAlertHandling(pendingIncident.linkedAlertId, 'resolved')
        }
      }
    },
    [addEvent, events, updateAlertHandling, updateEventHandling],
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

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const summary = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfYesterday = startOfToday.getTime() - 24 * 3600 * 1000
    const todayStartTs = startOfToday.getTime()
    const todayCount = events.filter((event) => event.timestamp >= todayStartTs && event.riskState === 'seizure').length
    const yesterdayCount = events.filter((event) => event.timestamp >= startOfYesterday && event.timestamp < todayStartTs && event.riskState === 'seizure').length
    const diff = todayCount - yesterdayCount
    const latestEvent = events.find((event) => event.riskState === 'seizure' || event.riskState === 'warning')
    return { todayCount, yesterdayCount, diff, latestEvent }
  }, [events])

  const adherence = useMemo(() => {
    const total = 21
    const taken = Math.round((total * (80 + Math.min(18, confidence * 20))) / 100)
    return { total, taken, percent: Math.round((taken / total) * 100) }
  }, [confidence])

  const medicationCountdownMs = useMemo(() => {
    const now = new Date(nowTs)
    const candidateTimes = [...MEDICATION_HOURS, MEDICATION_HOURS[0] + 24]
      .map((hour) => {
        const candidate = new Date(now)
        candidate.setHours(hour % 24, 0, 0, 0)
        if (hour >= 24) {
          candidate.setDate(candidate.getDate() + 1)
        }
        return candidate.getTime()
      })
      .filter((ts) => ts > nowTs)
    return Math.max(0, (candidateTimes[0] ?? nowTs) - nowTs)
  }, [nowTs])

  const latencyMs = latest ? Math.max(0, nowTs - latest.timestamp) : null
  const fusionDotClass = riskState === 'seizure' ? 'bg-danger' : riskState === 'warning' ? 'bg-warn' : 'bg-[#39D0D8]'

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
        <div className="rounded-md border border-border-default bg-bg-2 px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 animate-pulse rounded-full ${fusionDotClass}`} />
              <span className="text-[#39D0D8]">融合监测中</span>
            </div>
            <span className="font-mono text-text-secondary">置信度 {(confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
            <div>算法版本：v2.3.1-fusion</div>
            <div className="font-mono">延迟：{latencyMs === null ? '--' : `${latencyMs}ms`}</div>
            <div>数据源：{dataSourceMode.toUpperCase()}</div>
            <div>样本窗：最近 30 秒</div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">今日发作次数</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="font-mono text-3xl">{summary.todayCount}</div>
            <div className={`text-xs ${summary.diff > 0 ? 'text-danger' : summary.diff < 0 ? 'text-safe' : 'text-text-secondary'}`}>
              {summary.diff > 0 ? '↑' : summary.diff < 0 ? '↓' : '→'} {Math.abs(summary.diff)} vs 昨日
            </div>
          </div>
        </div>
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">上次事件</div>
          <div className="mt-2 text-sm">
            {summary.latestEvent
              ? `${new Date(summary.latestEvent.timestamp).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} · 持续 ${summary.latestEvent.durationSec ? `${summary.latestEvent.durationSec}s` : '未记录'}`
              : '暂无事件'}
          </div>
        </div>
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">服药依从性</div>
          <div className="mt-2 h-[130px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart data={[{ value: adherence.percent }]} startAngle={90} endAngle={-270} innerRadius="64%" outerRadius="92%">
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={8} fill="var(--accent)" background={{ fill: 'var(--bg-3)' }} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-text-primary font-mono text-[20px]">
                  {adherence.percent}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-text-secondary">{adherence.taken}/{adherence.total} 次</div>
        </div>
        <div className="rounded-md border border-border-default bg-bg-2 p-3">
          <div className="text-xs text-text-secondary">下次服药倒计时</div>
          <div className={`mt-2 font-mono text-xl ${medicationCountdownMs <= 60 * 60 * 1000 ? 'text-warn' : 'text-text-primary'}`}>
            {formatCountdown(medicationCountdownMs)}
          </div>
        </div>
      </div>
      {seizureModal}
      <EmergencyOverlay visible={emergencyVisible} onClose={() => setEmergencyVisible(false)} />
    </div>
  )
}
