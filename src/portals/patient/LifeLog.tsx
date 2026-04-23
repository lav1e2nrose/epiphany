import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'
import type { SeizureEvent } from '../../types/events'

const triggerOptions = ['闪光', '饮酒', '睡眠不足', '强压力', '发热', '其他']
const moodEmoji = ['😌', '🙂', '😐', '😟', '😰']

function nextId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function toTimelineText(event: SeizureEvent): { icon: string; color: string; text: string } {
  if (event.type === 'alert' || event.type === 'sos') {
    const durationText = event.durationSec ? ` · 持续${event.durationSec}s` : ''
    return {
      icon: '🔴',
      color: 'text-danger',
      text: `系统检测事件 · ${event.title} · ${new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}${durationText}`,
    }
  }
  if (event.type === 'medication') {
    return {
      icon: '🟢',
      color: 'text-safe',
      text: `手动打卡 · 服药记录 · ${new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
    }
  }
  return {
    icon: '⚪',
    color: 'text-text-secondary',
    text: event.details ? `普通日志 · ${event.details}` : `普通日志 · ${event.title}`,
  }
}

export function LifeLog(): JSX.Element {
  const events = useAppStore((state) => state.events)
  const [sleepHours, setSleepHours] = useState(7.5)
  const [stress, setStress] = useState(3)
  const [medication, setMedication] = useState({ morning: true, noon: true, evening: false })
  const [triggers, setTriggers] = useState<string[]>([])
  const [note, setNote] = useState('')
  const addEvent = useAppStore((state) => state.addEvent)
  const timeline = useMemo(() => events.slice(0, 14).map(toTimelineText), [events])

  const saveLog = (): void => {
    const now = Date.now()
    const detail = `服药(早${medication.morning ? '✓' : '○'}/中${medication.noon ? '✓' : '○'}/晚${medication.evening ? '✓' : '○'}) · 睡眠${sleepHours.toFixed(1)}h · 情绪${stress} · 诱因${triggers.join('/') || '无'} · 备注${note || '无'}`
    addEvent({
      id: nextId('life-log'),
      type: 'manual',
      title: '生活日志已保存',
      timestamp: now,
      details: detail,
      handlingStatus: 'resolved',
    })
    addEvent({
      id: nextId('med-log'),
      type: 'medication',
      title: '服药记录已更新',
      timestamp: now,
      details: `早${medication.morning ? '✓' : '○'} 中${medication.noon ? '✓' : '○'} 晚${medication.evening ? '✓' : '○'}`,
      handlingStatus: 'resolved',
    })
  }

  return (
    <div className="grid h-full grid-cols-[1fr_360px] gap-4">
      <div className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="text-lg font-semibold">生活日志时间轴</h2>
        <div className="mt-4 space-y-3 text-sm">
          {timeline.length === 0 ? (
            <div className="text-text-secondary">暂无日志，右侧保存后自动回写。</div>
          ) : (
            timeline.map((item, index) => (
              <div key={`${item.text}-${index}`} className={item.color}>
                {item.icon} {item.text}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-md border border-border-default bg-bg-2 p-4">
        <h3 className="font-semibold">快速记录</h3>
        <div className="mt-3 space-y-3 text-sm">
          <div className="space-y-2">
            <div>服药记录</div>
            <div className="flex gap-2">
              {[
                ['morning', '早'],
                ['noon', '中'],
                ['evening', '晚'],
              ].map(([key, label]) => {
                const selected = medication[key as keyof typeof medication]
                return (
                  <button
                    key={key}
                    className={`rounded border px-3 py-1 ${selected ? 'border-accent bg-accent/20 text-text-primary' : 'border-border-default text-text-secondary'}`}
                    onClick={() => setMedication((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  >
                    {label} {selected ? '✓' : '○'}
                  </button>
                )
              })}
            </div>
          </div>

          <div>睡眠时长 {sleepHours.toFixed(1)}h</div>
          <input type="range" min={0} max={12} step={0.1} value={sleepHours} onChange={(event) => setSleepHours(Number(event.target.value))} className="w-full" />

          <div>情绪压力 {stress}</div>
          <div className="flex justify-between">
            {moodEmoji.map((emoji, idx) => {
              const level = idx + 1
              const active = stress === level
              return (
                <button key={emoji} className={`rounded px-2 py-1 text-xl ${active ? 'bg-accent/20 ring-1 ring-accent' : ''}`} onClick={() => setStress(level)}>
                  {emoji}
                </button>
              )
            })}
          </div>

          <div>诱发因素</div>
          <div className="flex flex-wrap gap-2">
            {triggerOptions.map((option) => {
              const active = triggers.includes(option)
              return (
                <button
                  key={option}
                  className={`rounded-full border px-3 py-1 ${active ? 'border-accent bg-accent/20 text-text-primary' : 'border-border-default text-text-secondary'}`}
                  onClick={() =>
                    setTriggers((prev) =>
                      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option],
                    )
                  }
                >
                  {option}
                </button>
              )
            })}
          </div>

          <div>备注</div>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="输入备注"
            className="w-full rounded border border-border-default bg-bg-3 px-2 py-1.5 text-sm outline-none focus:border-accent"
          />

          <button
            className="w-full rounded-md bg-accent px-3 py-2 text-sm"
            onClick={saveLog}
          >
            保存记录
          </button>
        </div>
      </div>
    </div>
  )
}
