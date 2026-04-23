import { useAppStore } from '../../store'

export function AlertSystem(): JSX.Element {
  const alerts = useAppStore((state) => state.alerts)
  const events = useAppStore((state) => state.events)
  const dismissAlert = useAppStore((state) => state.dismissAlert)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const addEvent = useAppStore((state) => state.addEvent)
  const settings = useAppStore((state) => state.settings)

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">报警策略</h2>
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between">报警音效 <span>{settings.alertSound ? '开' : '关'}</span></div>
          <div className="flex items-center justify-between">预警提前量（分钟） <span>{settings.warningLeadMinutes}</span></div>
          <div className="flex items-center justify-between">监护人手机号 <span>{settings.caregiverPhone || '未设置'}</span></div>
          <div className="text-xs text-text-muted">以上策略可在 Settings 页面统一配置</div>
        </div>
        <div className="mt-4 flex gap-2 text-xs">
          <button
            className="rounded border border-border-default px-2 py-1"
            onClick={() => {
              const now = Date.now()
              const alertId = `${now}-warn`
              const eventId = `${now}-warn-event`
              pushAlert({ id: alertId, type: 'warning', title: '黄色报警测试', message: '监测到预警信号', timestamp: now, handlingStatus: 'pending', linkedEventId: eventId })
              addEvent({ id: eventId, type: 'alert', title: '监护人端黄色报警测试', timestamp: now, riskState: 'warning', handlingStatus: 'pending', linkedAlertId: alertId })
            }}
          >
            触发黄色报警测试
          </button>
          <button
            className="rounded border border-danger/70 px-2 py-1 text-danger"
            onClick={() => {
              const now = Date.now()
              const alertId = `${now}-danger`
              const eventId = `${now}-danger-event`
              pushAlert({ id: alertId, type: 'error', title: '红色报警测试', message: '监测到发作事件，建议立即处理', timestamp: now, sticky: true, handlingStatus: 'pending', linkedEventId: eventId, riskState: 'seizure' })
              addEvent({ id: eventId, type: 'alert', title: '监护人端红色报警测试', timestamp: now, riskState: 'seizure', handlingStatus: 'pending', linkedAlertId: alertId })
            }}
          >
            触发红色报警测试
          </button>
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
                <div className="text-xs">{new Date(alert.timestamp).toLocaleString()} · {alert.type.toUpperCase()} · {(alert.handlingStatus ?? 'pending').toUpperCase()}</div>
              </div>
              <button className="text-xs hover:text-text-primary" onClick={() => dismissAlert(alert.id)}>关闭</button>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded border border-border-subtle bg-bg-3/40 p-2 text-xs text-text-secondary">
          最近处理日志：{events.filter((item) => item.type === 'alert' || item.type === 'sos' || item.type === 'feedback').length} 条
        </div>
      </section>
    </div>
  )
}
