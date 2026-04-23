import { useState } from 'react'
import { useAppStore } from '../../store'

export function LifeLog(): JSX.Element {
  const [sleepHours, setSleepHours] = useState(7.5)
  const [stress, setStress] = useState(3)
  const addEvent = useAppStore((state) => state.addEvent)

  return (
    <div className="grid h-full grid-cols-[1fr_360px] gap-4">
      <div className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="text-lg font-semibold">生活日志时间轴</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div>🔴 系统检测事件 · EEG异常 · 03:42 · 持续2m14s</div>
          <div>🟢 手动打卡 · 服药记录 · 08:00</div>
          <div>⚪ 普通日志 · 睡眠 7.5h</div>
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-bg-2 p-4">
        <h3 className="font-semibold">快速记录</h3>
        <div className="mt-3 space-y-3 text-sm">
          <div>睡眠时长 {sleepHours.toFixed(1)}h</div>
          <input type="range" min={0} max={12} step={0.1} value={sleepHours} onChange={(event) => setSleepHours(Number(event.target.value))} className="w-full" />

          <div>情绪压力 {stress}</div>
          <input type="range" min={1} max={5} step={1} value={stress} onChange={(event) => setStress(Number(event.target.value))} className="w-full" />

          <button
            className="w-full rounded-md bg-accent px-3 py-2 text-sm"
            onClick={() =>
              addEvent({
                id: `${Date.now()}`,
                type: 'manual',
                title: '生活日志已保存',
                timestamp: Date.now(),
                details: `睡眠 ${sleepHours.toFixed(1)}h / 压力 ${stress}`,
                handlingStatus: 'resolved',
              })
            }
          >
            保存记录
          </button>
        </div>
      </div>
    </div>
  )
}
