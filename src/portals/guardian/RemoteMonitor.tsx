import { useAppStore } from '../../store'

export function RemoteMonitor(): JSX.Element {
  const patient = useAppStore((state) => state.patients[0])
  const riskScore = useAppStore((state) => state.riskScore)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const addEvent = useAppStore((state) => state.addEvent)

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
        <div className="text-sm text-text-secondary">地图占位区（Mock）</div>
        <div className="mt-2 h-[240px] rounded border border-border-subtle bg-bg-3" />
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
              <th className="text-left">时间</th>
              <th className="text-left">事件</th>
              <th className="text-left">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10:24</td>
              <td>预警升高</td>
              <td>未处理</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  )
}
