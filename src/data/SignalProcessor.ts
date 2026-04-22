import type { ArtifactType, ProcessedFrame, SeizureFeatures, SignalFrame } from '../types/signal'

export class SignalProcessor {
  bandpassFilter(signal: number[], lowHz: number, highHz: number, sampleRate: number): number[] {
    const nyquist = sampleRate / 2
    const low = Math.max(0.001, lowHz / nyquist)
    const high = Math.min(0.999, highHz / nyquist)
    let prev = 0
    return signal.map((value) => {
      prev = prev + low * (value - prev)
      return prev * high
    })
  }

  notchFilter(signal: number[], freqHz: 50 | 60, sampleRate: number): number[] {
    const omega = (2 * Math.PI * freqHz) / sampleRate
    return signal.map((value, index) => value - Math.sin(index * omega) * 0.15 * value)
  }

  detectArtifacts(frame: SignalFrame): ArtifactType[] {
    const artifacts: ArtifactType[] = []
    const imuMag = frame.imu
      ? Math.sqrt(frame.imu.ax ** 2 + frame.imu.ay ** 2 + frame.imu.az ** 2)
      : 0
    const emgPower = frame.emg.reduce((sum, value) => sum + Math.abs(value), 0) / frame.emg.length
    const eegVariance = this.variance(frame.eeg)

    if (imuMag > 15 || emgPower > 120) artifacts.push('movement')
    if (eegVariance < 1) artifacts.push('electrode_pop')
    if (frame.eeg.some((v) => Math.abs(v) > 120)) artifacts.push('power_line')
    return artifacts
  }

  extractFeatures(windowFrames: SignalFrame[]): SeizureFeatures {
    const flatEeg = windowFrames.flatMap((f) => f.eeg)
    const spikes = flatEeg.filter((value) => Math.abs(value) > 50).length
    const nirsDropRate =
      windowFrames.length > 1
        ? (windowFrames[0].nirs.spo2 - windowFrames[windowFrames.length - 1].nirs.spo2) /
          windowFrames.length
        : 0
    const emgBurst = windowFrames.some((f) => f.emg.some((value) => Math.abs(value) > 80))

    return {
      spikeCount: spikes,
      bandpower: {
        delta: this.avgAbs(flatEeg, 0.2),
        theta: this.avgAbs(flatEeg, 0.35),
        alpha: this.avgAbs(flatEeg, 0.5),
        beta: this.avgAbs(flatEeg, 0.7),
        gamma: this.avgAbs(flatEeg, 0.9),
      },
      nirsDropRate,
      emgBurst,
      preIctalConfidence: Math.min(1, spikes / 200 + Math.max(0, nirsDropRate) * 0.1 + (emgBurst ? 0.2 : 0)),
    }
  }

  computeRiskScore(features: SeizureFeatures, history: ProcessedFrame[]): number {
    const historyBoost = history.slice(-20).reduce((sum, frame) => sum + frame.riskScore, 0) / 20 || 0
    const raw =
      features.preIctalConfidence * 60 +
      Math.min(20, features.spikeCount / 8) +
      Math.min(10, Math.max(0, features.nirsDropRate) * 8) +
      (features.emgBurst ? 12 : 0) +
      historyBoost * 0.2
    return Math.max(0, Math.min(100, raw))
  }

  private variance(values: number[]): number {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  }

  private avgAbs(values: number[], weight: number): number {
    if (values.length === 0) return 0
    return (values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length) * weight
  }
}
