import { useMemo } from 'react'
import { useAppStore } from '../../store'

export function RemoteMonitor(): JSX.Element {
  const patient = useAppStore((state) => state.patients[0])
  const riskScore = useAppStore((state) => state.riskScore)
  const alerts = useAppStore((state) => state.alerts)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const addEvent = useAppStore((state) => state.addEvent)
  const lastLocationUpdate = useMemo(() => alerts[0]?.timestamp ?? Date.now() - 23 * 1000, [alerts])
  const alertRows = useMemo(
    () =>
      alerts
        .slice()
        .reverse()
        .slice(0, 8)
        .map((alert) => ({
          id: alert.id,
          level: alert.type === 'error' || alert.type === 'sos' ? '红色' : alert.type === 'warning' ? '黄色' : '普通',
          badgeClass:
            alert.type === 'error' || alert.type === 'sos'
              ? 'bg-danger/20 text-danger'
              : alert.type === 'warning'
                ? 'bg-warn/20 text-warn'
                : 'bg-bg-3 text-text-secondary',
          time: new Date(alert.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          event: alert.title,
          duration: alert.riskState === 'seizure' ? '2m14s' : alert.riskState === 'warning' ? '58s' : '—',
          status: alert.handlingStatus === 'pending' ? '未处理' : '已处理',
        })),
    [alerts],
  )

  return (
    <div className="grid h-full grid-rows-[200px_300px_1fr] gap-4">
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-text-secondary">患者</div>
            <div className="mt-2 text-xl font-semibold">{patient.name}</div>
            <div className="text-sm text-text-secondary">{patient.age} 岁</div>
          </div>
          <div>
            <div className="text-sm text-text-secondary">当前风险</div>
            <div className="mt-2 text-2xl font-mono">{Math.round(riskScore)}</div>
          </div>
          <div>
            <div className="text-sm text-text-secondary">设备状态</div>
            <div className="mt-2">BLE 信号 ▮▮▮▯</div>
            <div className="text-xs text-text-secondary">GPS：上海市徐汇区</div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>患者位置可视化</span>
          <span>最后更新 {Math.max(0, Math.floor((Date.now() - lastLocationUpdate) / 1000))} 秒前</span>
        </div>
        <div className="mt-2 h-[240px] overflow-hidden rounded border border-border-subtle bg-bg-3">
          <svg viewBox="0 0 900 360" className="h-full w-full">
            <rect x="0" y="0" width="900" height="360" fill="#121821" />
            <g stroke="#26303b" strokeWidth="1">
              <path d="M40 300 C180 260, 220 180, 360 160 C510 140, 630 220, 860 210" fill="none" />
              <path d="M70 120 C220 110, 340 80, 520 100 C700 120, 790 180, 860 250" fill="none" />
              <path d="M120 60 L200 330 M280 40 L340 330 M470 40 L520 330 M700 40 L760 330" />
            </g>
            <g transform="translate(590,160)">
              <circle r="28" fill="rgba(10,132,255,0.2)" className="animate-pulse" />
              <path d="M0,-18 C9,-18 16,-11 16,-2 C16,9 0,24 0,24 C0,24 -16,9 -16,-2 C-16,-11 -9,-18 0,-18 Z" fill="var(--danger)" />
              <circle cy="-3" r="5" fill="#fff" />
              <text x="18" y="-12" fontSize="12" fill="#E6EDF3">
                患者位置
              </text>
              <text x="18" y="6" fontSize="11" fill="#8B949E">
                上海市徐汇区
              </text>
            </g>
          </svg>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <div className="mb-3 flex justify-end gap-2 text-xs">
          <button
            className="rounded border border-border-default px-2 py-1"
            onClick={() => {
              const now = Date.now()
              const alertId = `${now}-warn`
              const eventId = `${now}-warn-event`
              pushAlert({ id: alertId, type: 'warning', title: '黄色报警测试', message: '监测到预警信号', timestamp: now, handlingStatus: 'pending', linkedEventId: eventId, riskState: 'warning' })
              addEvent({ id: eventId, type: 'alert', title: '远程监控黄色报警测试', timestamp: now, riskState: 'warning', handlingStatus: 'pending', linkedAlertId: alertId })
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
              pushAlert({ id: alertId, type: 'error', title: '红色报警测试', message: '监测到发作事件', timestamp: now, sticky: true, handlingStatus: 'pending', linkedEventId: eventId, riskState: 'seizure' })
              addEvent({ id: eventId, type: 'alert', title: '远程监控红色报警测试', timestamp: now, riskState: 'seizure', handlingStatus: 'pending', linkedAlertId: alertId })
            }}
          >
            触发红色报警测试
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-text-secondary">
            <tr>
              <th className="text-left">级别</th>
              <th className="text-left">时间</th>
              <th className="text-left">事件</th>
              <th className="text-left">持续时长</th>
              <th className="text-left">状态</th>
            </tr>
          </thead>
          <tbody>
            {alertRows.length === 0 ? (
              <tr className="border-t border-border-subtle text-text-secondary">
                <td colSpan={5} className="py-3">
                  暂无报警记录
                </td>
              </tr>
            ) : (
              alertRows.map((row) => (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${row.badgeClass}`}>{row.level}</span>
                  </td>
                  <td>{row.time}</td>
                  <td>{row.event}</td>
                  <td>{row.duration}</td>
                  <td>{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
