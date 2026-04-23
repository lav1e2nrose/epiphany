import { useMemo, useState } from 'react'
import { useAppStore } from '../store'

const FALLBACK_SERIAL_PORT = 'COM3'

export function SettingsPage(): JSX.Element {
  const settings = useAppStore((state) => state.settings)
  const setDataSourceMode = useAppStore((state) => state.setDataSourceMode)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const [status, setStatus] = useState('')
  const [statusTone, setStatusTone] = useState<'idle' | 'ok' | 'warn'>('idle')
  const [loading, setLoading] = useState(false)
  const [serialPorts, setSerialPorts] = useState<string[]>([])
  const [bleDevices, setBleDevices] = useState<string[]>([])

  const testConnection = async (): Promise<void> => {
    setLoading(true)
    setStatus('连接中...')
    setStatusTone('idle')
    try {
      if (window.epiphany?.testConnection) {
        const response = await window.epiphany.testConnection({
          mode: settings.dataSourceMode,
          websocketUrl: settings.websocketUrl,
          serialPort: settings.serialPort,
          bleDeviceId: settings.bleDeviceId,
        })
        if (!response.ok) throw new Error(response.message)
        setStatus(`连接成功 ✓ ${response.message}`)
        setStatusTone('ok')
      } else {
        setStatus('连接成功 ✓ 浏览器模式（未接入 Electron 测试接口）')
        setStatusTone('warn')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '连接失败'
      setStatus(`连接失败 ✕ ${message}`)
      setStatusTone('warn')
    } finally {
      setLoading(false)
    }
  }

  const modeText = useMemo(
    () => ({
      mock: 'Mock 模式（演示）',
      websocket: 'WebSocket',
      serial: '串口',
      ble: 'BLE 蓝牙',
    }),
    [],
  )

  return (
    <div className="grid h-full gap-3 overflow-auto">
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">数据源配置</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(Object.keys(modeText) as Array<keyof typeof modeText>).map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                checked={settings.dataSourceMode === mode}
                onChange={() => setDataSourceMode(mode)}
              />
              {modeText[mode]}
            </label>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label>WebSocket
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.websocketUrl} onChange={(event) => updateSettings({ websocketUrl: event.target.value })} />
          </label>
          <label>串口
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.serialPort} onChange={(event) => updateSettings({ serialPort: event.target.value })}>
              {(serialPorts.length > 0 ? serialPorts : [settings.serialPort || FALLBACK_SERIAL_PORT]).map((port) => (
                <option key={port} value={port}>{port}</option>
              ))}
            </select>
          </label>
          <label>波特率
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.baudRate} onChange={(event) => updateSettings({ baudRate: Number(event.target.value) })} />
          </label>
          <label>BLE 设备
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.bleDeviceId} onChange={(event) => updateSettings({ bleDeviceId: event.target.value })}>
              <option value="">未选择</option>
              {bleDevices.map((device) => (
                <option key={device} value={device}>{device}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <button className="rounded border border-border-default px-3 py-1 disabled:opacity-50" onClick={() => void testConnection()} disabled={loading}>
            {loading ? '连接测试中...' : '测试连接'}
          </button>
          <button
            className="rounded border border-border-default px-3 py-1"
            onClick={() =>
              void window.epiphany
                ?.listSerialPorts()
                .then((ports) => {
                  setSerialPorts(ports ?? [])
                  setStatus('串口列表已刷新')
                  setStatusTone('ok')
                })
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : '串口扫描失败'
                  setStatus(`串口扫描失败 ✕ ${message}`)
                  setStatusTone('warn')
                })
            }
          >
            刷新串口
          </button>
          <button
            className="rounded border border-border-default px-3 py-1"
            onClick={() =>
              void window.epiphany
                ?.scanBleDevices()
                .then((devices) => {
                  setBleDevices(devices ?? [])
                  setStatus('BLE 设备扫描完成')
                  setStatusTone('ok')
                })
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : 'BLE 扫描失败'
                  setStatus(`BLE 扫描失败 ✕ ${message}`)
                  setStatusTone('warn')
                })
            }
          >
            扫描 BLE
          </button>
          <span className={`text-xs ${statusTone === 'ok' ? 'text-safe' : statusTone === 'warn' ? 'text-danger' : 'text-text-secondary'}`}>{status}</span>
        </div>
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
          <label>陷波
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.notchHz} onChange={(event) => updateSettings({ notchHz: Number(event.target.value) as 50 | 60 })}>
              <option value={50}>50Hz</option>
              <option value={60}>60Hz</option>
            </select>
          </label>
          <label>预警灵敏度
            <input type="range" min={0} max={1} step={0.05} className="mt-3 w-full" value={settings.sensitivity} onChange={(event) => updateSettings({ sensitivity: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">通知配置</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <label>监护人手机号
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.caregiverPhone} onChange={(event) => updateSettings({ caregiverPhone: event.target.value })} />
          </label>
          <label>报警音效
            <div className="mt-2 flex gap-3">
              <label className="flex items-center gap-1">
                <input type="radio" checked={settings.alertSound} onChange={() => updateSettings({ alertSound: true })} />
                开
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={!settings.alertSound} onChange={() => updateSettings({ alertSound: false })} />
                关
              </label>
            </div>
          </label>
          <label>预警提前量（分钟）
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.warningLeadMinutes} onChange={(event) => updateSettings({ warningLeadMinutes: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4 text-sm text-text-secondary">
        应用版本 v1.0.0 · 算法版本 EpiNet-v2.3.1 · 数据格式 SignalFrame v1
      </section>
    </div>
  )
}
