import type { ArtifactType, ProcessedFrame, SeizureFeatures, SignalFrame } from '../types/signal'

export class SignalProcessor {
  bandpassFilter(signal: number[], lowHz: number, highHz: number, sampleRate: number): number[] {
    const nyquist = sampleRate / 2
    const low = Math.max(0.001, lowHz / nyquist)
    const high = Math.min(0.999, highHz / nyquist)
    let prevLow = 0
    let prevHigh = 0
    return signal.map((value) => {
      // 一阶低通 + 高通串联形成轻量带通, 优先保证实时性与低延迟。
      prevLow = prevLow + high * (value - prevLow)
      prevHigh = prevHigh + low * (prevLow - prevHigh)
      return prevLow - prevHigh
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
    if (eegVariance < 1.2) artifacts.push('electrode_pop')
    if (frame.eeg.some((v) => Math.abs(v) > 120)) artifacts.push('power_line')
    return artifacts
  }

  extractFeatures(windowFrames: SignalFrame[]): SeizureFeatures {
    const flatEeg = windowFrames.flatMap((f) => f.eeg)
    const spikes = flatEeg.filter((value) => Math.abs(value) > 50).length
    const total = Math.max(1, flatEeg.length)
    const spikeRatio = spikes / total
    const nirsDropRate =
      windowFrames.length > 1
        ? (windowFrames[0].nirs.spo2 - windowFrames[windowFrames.length - 1].nirs.spo2) /
          windowFrames.length
        : 0
    const emgBurst = windowFrames.some((f) => f.emg.some((value) => Math.abs(value) > 80))
    const accel = windowFrames
      .map((f) => (f.imu ? Math.sqrt(f.imu.ax ** 2 + f.imu.ay ** 2 + f.imu.az ** 2) : 0))
      .reduce((sum, v) => sum + v, 0) / Math.max(1, windowFrames.length)
    const movementPenalty = accel > 14 ? 0.08 : 0

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
      // 置信度融合：尖波密度 + NIRS 下滑 + EMG 爆发, 并扣除运动伪迹造成的误报权重。
      preIctalConfidence: Math.max(
        0,
        Math.min(1, spikeRatio * 8 + Math.max(0, nirsDropRate) * 0.22 + (emgBurst ? 0.18 : 0) - movementPenalty),
      ),
    }
  }

  computeRiskScore(features: SeizureFeatures, history: ProcessedFrame[]): number {
    const recent = history.slice(-40)
    const historyBoost =
      recent.length > 0 ? recent.reduce((sum, frame) => sum + frame.riskScore, 0) / recent.length : 0
    const trendBoost = recent.length > 1 ? Math.max(0, recent[recent.length - 1].riskScore - recent[0].riskScore) * 0.1 : 0
    const raw =
      features.preIctalConfidence * 62 +
      Math.min(16, features.spikeCount / 10) +
      Math.min(12, Math.max(0, features.nirsDropRate) * 11) +
      (features.emgBurst ? 8 : 0) +
      historyBoost * 0.2 +
      trendBoost
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
