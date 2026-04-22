import type { SignalFrame } from '../types/signal'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'mock'

export interface IDataSource {
  readonly name: string
  readonly status: ConnectionStatus
  connect(config?: Record<string, unknown>): Promise<void>
  disconnect(): Promise<void>
  onFrame(callback: (frame: SignalFrame) => void): () => void
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void
  onError(callback: (error: Error) => void): () => void
}

export abstract class BaseAdapter implements IDataSource {
  abstract readonly name: string
  protected frameListeners = new Set<(frame: SignalFrame) => void>()
  protected statusListeners = new Set<(status: ConnectionStatus) => void>()
  protected errorListeners = new Set<(error: Error) => void>()
  status: ConnectionStatus = 'disconnected'

  abstract connect(config?: Record<string, unknown>): Promise<void>
  abstract disconnect(): Promise<void>

  onFrame(callback: (frame: SignalFrame) => void): () => void {
    this.frameListeners.add(callback)
    return () => this.frameListeners.delete(callback)
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback)
    return () => this.statusListeners.delete(callback)
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorListeners.add(callback)
    return () => this.errorListeners.delete(callback)
  }

  protected emitFrame(frame: SignalFrame): void {
    this.frameListeners.forEach((listener) => listener(frame))
  }

  protected setStatus(status: ConnectionStatus): void {
    this.status = status
    this.statusListeners.forEach((listener) => listener(status))
  }

  protected emitError(error: Error): void {
    this.errorListeners.forEach((listener) => listener(error))
    this.setStatus('error')
  }
}
