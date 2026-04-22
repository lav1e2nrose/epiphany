import { useAppStore } from '../../store'

export function AlertSystem(): JSX.Element {
  const alerts = useAppStore((state) => state.alerts)
  const dismissAlert = useAppStore((state) => state.dismissAlert)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const settings = useAppStore((state) => state.settings)
  const updateSettings = useAppStore((state) => state.updateSettings)

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">报警策略</h2>
        <div className="mt-3 space-y-3 text-sm">
          <label className="flex items-center justify-between">报警音效
            <input type="checkbox" checked={settings.alertSound} onChange={(event) => updateSettings({ alertSound: event.target.checked })} />
          </label>
          <label className="flex items-center justify-between">预警提前量（分钟）
            <input type="number" className="w-20 rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.warningLeadMinutes} onChange={(event) => updateSettings({ warningLeadMinutes: Number(event.target.value) })} />
          </label>
          <label className="flex items-center justify-between">监护人手机号
            <input className="w-36 rounded border border-border-default bg-bg-3 px-2 py-1" value={settings.caregiverPhone} onChange={(event) => updateSettings({ caregiverPhone: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 flex gap-2 text-xs">
          <button className="rounded border border-border-default px-2 py-1" onClick={() => pushAlert({ id: `${Date.now()}-warn`, type: 'warning', title: '黄色报警测试', message: '监测到预警信号', timestamp: Date.now() })}>触发黄色报警测试</button>
          <button className="rounded border border-danger/70 px-2 py-1 text-danger" onClick={() => pushAlert({ id: `${Date.now()}-danger`, type: 'error', title: '红色报警测试', message: '监测到发作事件，建议立即处理', timestamp: Date.now(), sticky: true })}>触发红色报警测试</button>
        </div>
      </section>
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">报警队列</h2>
        <div className="mt-3 space-y-2 text-sm text-text-secondary">
          {alerts.length === 0 && <div>暂无报警</div>}
          {[...alerts].reverse().slice(0, 12).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between rounded border border-border-subtle px-2 py-1">
              <div>
                <div className="text-text-primary">{alert.title}</div>
                <div className="text-xs">{new Date(alert.timestamp).toLocaleString()} · {alert.type.toUpperCase()}</div>
              </div>
              <button className="text-xs hover:text-text-primary" onClick={() => dismissAlert(alert.id)}>关闭</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
