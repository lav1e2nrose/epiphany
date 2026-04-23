import { BaseAdapter } from '../IDataSource'
import type { SignalFrame } from '../../types/signal'

type Phase = 'normal' | 'preictal' | 'seizure' | 'recovery'
interface MockConfig {
  cycleMinSec?: number
  cycleMaxSec?: number
  sampleIntervalMs?: number
  preictalSec?: number
  seizureSec?: number
  recoverySec?: number
}

export class MockAdapter extends BaseAdapter {
  readonly name = 'Mock Adapter'
  private timer: number | null = null
  private frameTick = 0
  private phase: Phase = 'normal'
  private phaseDuration = 0
  private normalFramesTarget = 1200
  private sampleIntervalMs = 16
  private cycleMinSec = 60
  private cycleMaxSec = 120
  private phaseFrames = {
    preictal: 360,
    seizure: 240,
    recovery: 480,
  }

  async connect(config?: Record<string, unknown>): Promise<void> {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.setStatus('connecting')
    this.frameTick = 0
    this.phase = 'normal'
    this.phaseDuration = 0
    this.applyConfig(config as MockConfig | undefined)
    const minFrames = Math.max(60, Math.round((this.cycleMinSec * 1000) / this.sampleIntervalMs))
    const maxFrames = Math.max(minFrames + 1, Math.round((this.cycleMaxSec * 1000) / this.sampleIntervalMs))
    this.normalFramesTarget = minFrames + Math.floor(Math.random() * (maxFrames - minFrames))
    this.setStatus('mock')

    this.timer = window.setInterval(() => {
      this.frameTick += 1
      this.phaseDuration += 1
      if (this.phase === 'normal' && this.phaseDuration > this.normalFramesTarget) this.switchPhase('preictal')
      if (this.phase === 'preictal' && this.phaseDuration > this.phaseFrames.preictal) this.switchPhase('seizure')
      if (this.phase === 'seizure' && this.phaseDuration > this.phaseFrames.seizure) this.switchPhase('recovery')
      if (this.phase === 'recovery' && this.phaseDuration > this.phaseFrames.recovery) this.switchPhase('normal')

      this.emitFrame(this.createFrame())
    }, this.sampleIntervalMs)
  }

  async disconnect(): Promise<void> {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.setStatus('disconnected')
  }

  private applyConfig(config?: MockConfig): void {
    this.cycleMinSec = this.toPositiveNumber(config?.cycleMinSec, 60)
    this.cycleMaxSec = Math.max(this.cycleMinSec + 5, this.toPositiveNumber(config?.cycleMaxSec, 120))
    this.sampleIntervalMs = Math.max(8, this.toPositiveNumber(config?.sampleIntervalMs, 16))
    this.phaseFrames = {
      preictal: Math.max(30, Math.round((this.toPositiveNumber(config?.preictalSec, 6) * 1000) / this.sampleIntervalMs)),
      seizure: Math.max(20, Math.round((this.toPositiveNumber(config?.seizureSec, 4) * 1000) / this.sampleIntervalMs)),
      recovery: Math.max(30, Math.round((this.toPositiveNumber(config?.recoverySec, 8) * 1000) / this.sampleIntervalMs)),
    }
  }

  private toPositiveNumber(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return fallback
    return value
  }

  private switchPhase(next: Phase): void {
    this.phase = next
    this.phaseDuration = 0
    if (next === 'normal') {
      const minFrames = Math.max(60, Math.round((this.cycleMinSec * 1000) / this.sampleIntervalMs))
      const maxFrames = Math.max(minFrames + 1, Math.round((this.cycleMaxSec * 1000) / this.sampleIntervalMs))
      this.normalFramesTarget = minFrames + Math.floor(Math.random() * (maxFrames - minFrames))
    }
  }

  private noise(scale = 1): number {
    return (Math.random() - 0.5) * scale
  }

  private wave(freq: number, amp: number): number {
    return Math.sin((this.frameTick / 60) * freq) * amp
  }

  private createFrame(): SignalFrame {
    const isPre = this.phase === 'preictal'
    const isSz = this.phase === 'seizure'
    const isRecovery = this.phase === 'recovery'

    const spikeBoost = isPre ? 20 : isSz ? 55 : isRecovery ? 10 : 0
    const emgBurst = isSz ? 70 : isPre ? 25 : 8
    const nirsDrop = isSz ? 12 : isPre ? 5 : isRecovery ? 2 : 0
    const movementBurst = isSz && this.phaseDuration % 48 < 12

    const eeg = Array.from({ length: 8 }, (_, index) => {
      const phaseShift = (index / 8) * Math.PI
      const base = Math.sin((this.frameTick / 30) * (8 + index * 0.2) + phaseShift) * 18
      const spike = Math.sin((this.frameTick / 6) * (isSz ? 22 : 10)) * spikeBoost
      return base + spike + this.noise(8)
    })

    return {
      timestamp: Date.now(),
      eeg,
      nirs: {
        hbo: 63 - nirsDrop + this.noise(0.5),
        hbr: 30 + nirsDrop * 0.8 + this.noise(0.5),
        spo2: Math.max(84, 98 - nirsDrop + this.noise(0.3)),
      },
      emg: [this.wave(12, emgBurst) + this.noise(9), this.wave(9, emgBurst * 0.8) + this.noise(9)],
      imu: {
        ax: this.noise(movementBurst ? 12 : isSz ? 9 : 2),
        ay: this.noise(movementBurst ? 12 : isSz ? 9 : 2),
        az: this.noise(movementBurst ? 12 : isSz ? 9 : 2) + 9.8,
      },
      batteryLevel: 80 + Math.sin(this.frameTick / 900) * 12,
    }
  }
}
