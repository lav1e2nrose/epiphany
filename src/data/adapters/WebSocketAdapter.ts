import { BaseAdapter } from '../IDataSource'
import type { SignalFrame } from '../../types/signal'

export class WebSocketAdapter extends BaseAdapter {
  readonly name = 'WebSocket Adapter'
  private socket: WebSocket | null = null
  private reconnectCount = 0
  private heartbeat: number | null = null

  async connect(config?: Record<string, unknown>): Promise<void> {
    const endpoint = typeof config?.url === 'string' ? config.url : 'ws://localhost:8080/stream'
    this.setStatus('connecting')

    await new Promise<void>((resolve, reject) => {
      this.socket = new WebSocket(endpoint)

      this.socket.onopen = () => {
        this.reconnectCount = 0
        this.setStatus('connected')
        this.heartbeat = window.setInterval(() => this.socket?.send('ping'), 5000)
        resolve()
      }

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as SignalFrame
          this.emitFrame(parsed)
        } catch {
          this.emitError(new Error('Invalid websocket frame payload'))
        }
      }

      this.socket.onerror = () => reject(new Error('WebSocket connection failed'))
      this.socket.onclose = () => this.scheduleReconnect(endpoint)
    })
  }

  async disconnect(): Promise<void> {
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat)
    this.heartbeat = null
    this.socket?.close()
    this.socket = null
    this.setStatus('disconnected')
  }

  private scheduleReconnect(endpoint: string): void {
    if (this.status === 'disconnected') return
    const delay = Math.min(20000, 1000 * 2 ** this.reconnectCount)
    this.reconnectCount += 1
    window.setTimeout(() => {
      this.connect({ url: endpoint }).catch((error: unknown) => {
        const normalized = error instanceof Error ? error : new Error('WebSocket reconnect failed')
        this.emitError(normalized)
      })
    }, delay)
  }
}
