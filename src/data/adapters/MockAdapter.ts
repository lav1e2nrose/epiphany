import { BaseAdapter } from '../IDataSource'
import type { SignalFrame } from '../../types/signal'

type Phase = 'normal' | 'preictal' | 'seizure' | 'recovery'

export class MockAdapter extends BaseAdapter {
  readonly name = 'Mock Adapter'
  private timer: number | null = null
  private frameTick = 0
  private phase: Phase = 'normal'
  private phaseDuration = 0

  async connect(): Promise<void> {
    this.setStatus('connecting')
    this.frameTick = 0
    this.phase = 'normal'
    this.phaseDuration = 0
    this.setStatus('mock')

    this.timer = window.setInterval(() => {
      this.frameTick += 1
      this.phaseDuration += 1
      if (this.phase === 'normal' && this.phaseDuration > 1200) this.switchPhase('preictal')
      if (this.phase === 'preictal' && this.phaseDuration > 360) this.switchPhase('seizure')
      if (this.phase === 'seizure' && this.phaseDuration > 240) this.switchPhase('recovery')
      if (this.phase === 'recovery' && this.phaseDuration > 480) this.switchPhase('normal')

      this.emitFrame(this.createFrame())
    }, 16)
  }

  async disconnect(): Promise<void> {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.setStatus('disconnected')
  }

  private switchPhase(next: Phase): void {
    this.phase = next
    this.phaseDuration = 0
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
        ax: this.noise(isSz ? 9 : 2),
        ay: this.noise(isSz ? 9 : 2),
        az: this.noise(isSz ? 9 : 2) + 9.8,
      },
      batteryLevel: 80 + Math.sin(this.frameTick / 900) * 12,
    }
  }
}
