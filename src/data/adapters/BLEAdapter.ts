import { BaseAdapter } from '../IDataSource'

export class BLEAdapter extends BaseAdapter {
  readonly name = 'BLE Adapter'

  async connect(config?: Record<string, unknown>): Promise<void> {
    this.setStatus('connecting')
    const deviceId = typeof config?.deviceId === 'string' ? config.deviceId : ''
    if (!deviceId) {
      this.emitError(new Error('BLE deviceId is required'))
      return
    }
    this.setStatus('connected')
  }

  async disconnect(): Promise<void> {
    this.setStatus('disconnected')
  }
}
