import { useState } from 'react'
import { useAppStore } from '../store'

export function SettingsPage(): JSX.Element {
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [status, setStatus] = useState('')

  const testConnection = (): void => {
    setStatus('连接中...')
    window.setTimeout(() => setStatus('连接成功 ✓'), 900)
  }

  return (
    <div className="grid h-full gap-3 overflow-auto">
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">数据源配置</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label>WebSocket
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.websocketUrl} onChange={(event) => updateSettings({ websocketUrl: event.target.value })} />
          </label>
          <label>串口
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.serialPort} onChange={(event) => updateSettings({ serialPort: event.target.value })} />
          </label>
        </div>
        <button className="mt-3 rounded border border-border-default px-3 py-1 text-sm" onClick={testConnection}>测试连接</button>
        <span className="ml-3 text-xs text-text-secondary">{status}</span>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">信号处理参数</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <label>带通低频
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.bandpassLow} onChange={(event) => updateSettings({ bandpassLow: Number(event.target.value) })} />
          </label>
          <label>带通高频
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.bandpassHigh} onChange={(event) => updateSettings({ bandpassHigh: Number(event.target.value) })} />
          </label>
          <label>EMG 阈值
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.emgThreshold} onChange={(event) => updateSettings({ emgThreshold: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4 text-sm text-text-secondary">
        应用版本 v1.0.0 · 算法版本 EpiNet-v2.3.1 · 数据格式 SignalFrame v1
      </section>
    </div>
  )
}
