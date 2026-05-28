import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'

export function SeizureReview(): JSX.Element {
  const patientId = useAppStore((state) => state.currentUser?.id ?? 'p1')
  const events = useAppStore((state) => state.clinicalEvents.filter((event) => event.patientId === patientId))
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null)

  const active = useMemo(() => events.find((event) => event.id === activeId) ?? null, [activeId, events])

  return (
    <div className="grid h-full grid-cols-[1fr_360px] gap-3 overflow-auto">
      <section className="rounded-md border border-border-default bg-bg-2 p-3">
        <h2 className="font-semibold">发作回顾</h2>
        <div className="mt-3 space-y-2 text-sm">
          {events.map((event) => (
            <button key={event.id} className={`flex w-full items-center justify-between rounded border px-2 py-2 text-left ${activeId === event.id ? 'border-accent bg-accent/10' : 'border-border-default bg-bg-3/50'}`} onClick={() => setActiveId(event.id)}>
              <span>{new Date(event.timestamp).toLocaleString('zh-CN')}</span>
              <span>{event.ictal.seizureType}</span>
              <span>{event.confirmed === 'confirmed' ? '✓ 已复核' : '⏱ 待复核'}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <h3 className="font-semibold">事件详情</h3>
        {active ? (
          <div className="mt-2 space-y-2 text-xs">
            <div className="rounded border border-border-default bg-bg-3 p-2"><b>发作前：</b>{active.pre.triggers[0]?.category ?? '未填'} · {active.pre.aura[0]?.description ?? '无'}</div>
            <div className="rounded border border-border-default bg-bg-3 p-2"><b>发作中：</b>{active.ictal.symptoms.join(' / ') || '无'}</div>
            <div className="rounded border border-border-default bg-bg-3 p-2"><b>发作后：</b>{active.post.state} · {active.post.recoveryDurationMin} 分钟</div>
            <div className="rounded border border-border-default bg-bg-3 p-2">简化波形缩略：[Waveform Preview 示意图]</div>
            <div className="rounded border border-border-default bg-bg-3 p-2">医生备注：{active.doctorReview?.annotation ?? '暂无'}</div>
          </div>
        ) : <div className="mt-2 text-text-secondary">暂无事件</div>}
      </section>
    </div>
  )
}
