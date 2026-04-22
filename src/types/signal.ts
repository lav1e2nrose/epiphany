export interface SignalFrame {
  timestamp: number
  eeg: number[]
  nirs: {
    hbo: number
    hbr: number
    spo2: number
  }
  emg: number[]
  imu?: {
    ax: number
    ay: number
    az: number
  }
  batteryLevel: number
}

export type RiskState = 'safe' | 'warning' | 'seizure' | 'recovery' | 'emergency'
export type ArtifactType = 'chewing' | 'movement' | 'electrode_pop' | 'power_line'

export interface SeizureFeatures {
  spikeCount: number
  bandpower: {
    delta: number
    theta: number
    alpha: number
    beta: number
    gamma: number
  }
  nirsDropRate: number
  emgBurst: boolean
  preIctalConfidence: number
}

export interface ProcessedFrame extends SignalFrame {
  riskScore: number
  riskState: RiskState
  artifacts: ArtifactType[]
  features: SeizureFeatures
}

export interface HeatEvent {
  type: 'subclinical' | 'seizure'
  durationSec: number
  peakIntensity: number
  factors: string[]
}

export interface HeatmapCell {
  date: string
  hour: number
  intensity: number
  seizureLevel: number
  events: HeatEvent[]
  missedMed: boolean
  sleepDeprived: boolean
}
