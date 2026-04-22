import { BaseAdapter } from '../IDataSource'
import type { SignalFrame } from '../../types/signal'

export class SerialAdapter extends BaseAdapter {
  readonly name = 'Serial Adapter'

  async connect(config?: Record<string, unknown>): Promise<void> {
    this.setStatus('connecting')
    const port = typeof config?.port === 'string' ? config.port : ''
    if (!port) {
      this.emitError(new Error('Serial port is required'))
      return
    }
    this.setStatus('connected')
  }

  async disconnect(): Promise<void> {
    this.setStatus('disconnected')
  }

  parseFrame(buffer: Uint8Array): SignalFrame {
    const seed = buffer[0] ?? 0
    return {
      timestamp: Date.now(),
      eeg: Array.from({ length: 8 }, (_, idx) => seed + idx),
      nirs: { hbo: 60, hbr: 30, spo2: 98 },
      emg: [seed, seed],
      batteryLevel: 100,
    }
  }
}
