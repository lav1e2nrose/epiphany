import { useMemo, useState } from 'react'
import { useAppStore } from '../store'

const FALLBACK_SERIAL_PORT = 'COM3'

export function SettingsPage(): JSX.Element {
  const settings = useAppStore((state) => state.settings)
  const setDataSourceMode = useAppStore((state) => state.setDataSourceMode)
  const setMonitoringMode = useAppStore((state) => state.setMonitoringMode)
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
              <input type="radio" checked={settings.dataSourceMode === mode} onChange={() => setDataSourceMode(mode)} />
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
              {(serialPorts.length > 0 ? serialPorts : [settings.serialPort || FALLBACK_SERIAL_PORT]).map((port) => <option key={port} value={port}>{port}</option>)}
            </select>
          </label>
          <label>波特率
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.baudRate} onChange={(event) => updateSettings({ baudRate: Number(event.target.value) })} />
          </label>
          <label>BLE 设备
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.bleDeviceId} onChange={(event) => updateSettings({ bleDeviceId: event.target.value })}>
              <option value="">未选择</option>
              {bleDevices.map((device) => <option key={device} value={device}>{device}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <button className="rounded border border-border-default px-3 py-1 disabled:opacity-50" onClick={() => void testConnection()} disabled={loading}>
            {loading ? '连接测试中...' : '测试连接'}
          </button>
          <button className="rounded border border-border-default px-3 py-1" onClick={() => void window.epiphany?.listSerialPorts().then((ports) => setSerialPorts(ports ?? []))}>刷新串口</button>
          <button className="rounded border border-border-default px-3 py-1" onClick={() => void window.epiphany?.scanBleDevices().then((devices) => setBleDevices(devices ?? []))}>扫描 BLE</button>
          <span className={`text-xs ${statusTone === 'ok' ? 'text-safe' : statusTone === 'warn' ? 'text-danger' : 'text-text-secondary'}`}>{status}</span>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4 text-sm">
        <h2 className="font-semibold">监测模式</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            ['daytime', '日间监测（默认）'],
            ['sleep', '睡眠监测（夜间算法+视频联动）'],
            ['inpatient', '院内监测（实时预警）'],
          ].map(([mode, label]) => (
            <label key={mode} className="rounded border border-border-default bg-bg-3 px-2 py-2 text-xs">
              <input
                type="radio"
                checked={settings.monitoringMode === mode}
                onChange={() => setMonitoringMode(mode as 'daytime' | 'sleep' | 'inpatient')}
              />{' '}
              {label}
            </label>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <label>睡眠监测开始
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.sleepStartHour} onChange={(event) => updateSettings({ sleepStartHour: event.target.value })} />
          </label>
          <label>睡眠监测结束
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.sleepEndHour} onChange={(event) => updateSettings({ sleepEndHour: event.target.value })} />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4 text-sm">
        <h2 className="font-semibold">视频联动</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <label>摄像头来源
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.cameraSource} onChange={(event) => updateSettings({ cameraSource: event.target.value as 'builtin' | 'usb' | 'ip' })}>
              <option value="builtin">内置摄像头</option>
              <option value="usb">USB 摄像头</option>
              <option value="ip">IP 摄像头</option>
            </select>
          </label>
          <label>IP 地址
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.cameraUrl} onChange={(event) => updateSettings({ cameraUrl: event.target.value })} />
          </label>
          <label>自动联动
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={String(settings.autoVideoLink)} onChange={(event) => updateSettings({ autoVideoLink: event.target.value === 'true' })}>
              <option value="true">开</option>
              <option value="false">关</option>
            </select>
          </label>
          <label>事件前预录（秒）
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.videoPreRecordSec} onChange={(event) => updateSettings({ videoPreRecordSec: Number(event.target.value) })} />
          </label>
          <label>事件后续录（分钟）
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.videoPostRecordMin} onChange={(event) => updateSettings({ videoPostRecordMin: Number(event.target.value) })} />
          </label>
          <label>本地保留天数
            <input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.localRetentionDays} onChange={(event) => updateSettings({ localRetentionDays: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4 text-sm">
        <h2 className="font-semibold">语音识别</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <label className="rounded border border-border-default bg-bg-3 px-2 py-2"><input type="radio" checked={settings.voiceInputEnabled} onChange={() => updateSettings({ voiceInputEnabled: true })} /> 启用语音输入</label>
          <label className="rounded border border-border-default bg-bg-3 px-2 py-2"><input type="radio" checked={!settings.voiceInputEnabled} onChange={() => updateSettings({ voiceInputEnabled: false })} /> 关闭语音输入</label>
          <label>识别语言
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.voiceLanguage} onChange={(event) => updateSettings({ voiceLanguage: event.target.value as 'zh-CN' })}>
              <option value="zh-CN">中文 (zh-CN)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4 text-sm">
        <h2 className="font-semibold">医患沟通</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <label className="rounded border border-border-default bg-bg-3 px-2 py-2"><input type="checkbox" checked={settings.chatDesktopNotify} onChange={(event) => updateSettings({ chatDesktopNotify: event.target.checked })} /> 桌面通知</label>
          <label className="rounded border border-border-default bg-bg-3 px-2 py-2"><input type="checkbox" checked={settings.chatBadgeNotify} onChange={(event) => updateSettings({ chatBadgeNotify: event.target.checked })} /> 应用角标</label>
          <label>默认通道策略
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.chatDefaultPolicy} onChange={(event) => updateSettings({ chatDefaultPolicy: event.target.value as 'auto_open' | 'manual_open' })}>
              <option value="auto_open">新患者自动开启</option>
              <option value="manual_open">手动开启</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4 text-sm">
        <h2 className="font-semibold">信号处理参数</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <label>带通低频<input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.bandpassLow} onChange={(event) => updateSettings({ bandpassLow: Number(event.target.value) })} /></label>
          <label>带通高频<input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.bandpassHigh} onChange={(event) => updateSettings({ bandpassHigh: Number(event.target.value) })} /></label>
          <label>EMG 阈值<input type="number" className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.emgThreshold} onChange={(event) => updateSettings({ emgThreshold: Number(event.target.value) })} /></label>
        </div>
      </section>
    </div>
  )
}
