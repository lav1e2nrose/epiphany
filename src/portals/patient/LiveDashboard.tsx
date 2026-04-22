import { useEffect, useMemo, useRef, useState } from 'react'
import { ArtifactBanner } from '../../components/ArtifactBanner'
import { EmergencyOverlay } from '../../components/EmergencyOverlay'
import { SOSButton } from '../../components/SOSButton'
import { StatusOrb } from '../../components/StatusOrb'
import { WaveformChart } from '../../components/charts/WaveformChart'
import { SignalProcessor } from '../../data/SignalProcessor'
import { useAppStore } from '../../store'
import type { ProcessedFrame, RiskState, SignalFrame } from '../../types/signal'

const processor = new SignalProcessor()

function toRiskState(score: number): RiskState {
  if (score >= 85) return 'seizure'
  if (score >= 60) return 'warning'
  if (score >= 40) return 'recovery'
  return 'safe'
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
      const processed: ProcessedFrame = {
        ...filteredFrame,
        features,
        artifacts,
        riskScore: score,
        riskState: toRiskState(score),
      }
      pushFrame(processed)
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

    setConnectionStatus('connecting')
    void dataSource.connect(config).catch(() => setConnectionStatus('error'))

    return () => {
      unsubscribeFrame()
      unsubscribeStatus()
      unsubscribeError()
      void dataSource.disconnect()
    }
  }, [bandpassHigh, bandpassLow, baudRate, bleDeviceId, dataSource, dataSourceMode, notchHz, pushFrame, serialPort, setConnectionStatus, websocketUrl])

  useEffect(() => {
    if (riskState === 'warning' || riskState === 'seizure') {
      pushAlert({
        id: `${Date.now()}`,
        type: riskState === 'seizure' ? 'error' : 'warning',
        title: '监测到异常脑电特征',
        message: `当前风险分 ${Math.round(riskScore)}`,
        timestamp: Date.now(),
      })
    }
  }, [pushAlert, riskScore, riskState])

  const latest = frameBuffer.at(-1)
  const hasMovementArtifact = Boolean(latest?.artifacts.includes('movement'))
  const confidence = latest?.features.preIctalConfidence ?? 0

  const seizureModal = useMemo(() => {
    if (riskState !== 'warning' && riskState !== 'seizure') return null
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm">
        <div className="w-[460px] rounded-lg border border-border-default bg-bg-2 p-5">
          <h3 className="text-lg font-semibold">监测到异常脑电特征</h3>
          <p className="mt-2 text-sm text-text-secondary">Pre-ictal 置信度 {(confidence * 100).toFixed(0)}%</p>
          <p className="mt-1 text-sm text-text-secondary">预计 5-10 分钟内可能发作，请寻找安全位置。</p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-md border border-border-default px-3 py-1.5" onClick={() => addEvent({ id: `${Date.now()}-true`, type: 'feedback', title: '确认为发作', timestamp: Date.now() })}>确实发作了</button>
            <button className="rounded-md border border-border-default px-3 py-1.5" onClick={() => addEvent({ id: `${Date.now()}-false`, type: 'feedback', title: '误报反馈', timestamp: Date.now() })}>这是误报</button>
          </div>
        </div>
      </div>
    )
  }, [addEvent, confidence, riskState])

  return (
    <div className="grid h-full grid-cols-[300px_1fr_260px] gap-4">
      <div className="space-y-4">
        <StatusOrb score={riskScore} state={riskState} confidence={confidence} />
        <div className="flex items-center justify-center rounded-lg border border-border-default bg-bg-2 p-4">
          <SOSButton
            holdDuration={3000}
            onTrigger={() => {
              pushAlert({ id: `${Date.now()}-sos`, type: 'sos', title: 'SOS 已触发', message: '紧急联系人已通知', timestamp: Date.now(), sticky: true })
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
