import { Fragment, useMemo, useState } from 'react'
import { useAppStore } from '../../store'
import type { SeizureEvent } from '../../types/events'

function buildWavePoints(seed: number): string {
  const points: string[] = []
  for (let x = 0; x <= 120; x += 6) {
    const y = 18 + Math.sin((x + seed) / 10) * 7 + Math.sin((x + seed) / 4) * 2.5
    points.push(`${x},${y.toFixed(2)}`)
  }
  return points.join(' ')
}

function WaveThumbnail({ title, color, seed }: { title: string; color: string; seed: number }): JSX.Element {
  return (
    <div className="rounded border border-border-default bg-bg-2 p-2">
      <div className="mb-1 text-[11px] text-text-secondary">{title}</div>
      <svg viewBox="0 0 120 36" className="h-10 w-full rounded bg-bg-3">
        <polyline fill="none" stroke={color} strokeWidth="1.6" points={buildWavePoints(seed)} />
      </svg>
    </div>
  )
}

function severityLabel(event: SeizureEvent): string {
  if (event.riskState === 'seizure' || event.riskState === 'emergency') return '高'
  if (event.riskState === 'warning') return '中'
  return '低'
}

function severityClass(event: SeizureEvent): string {
  if (event.riskState === 'seizure' || event.riskState === 'emergency') return 'text-danger'
  if (event.riskState === 'warning') return 'text-warn'
  return 'text-safe'
}

export function HistoryTrack(): JSX.Element {
  const events = useAppStore((state) => state.events)
  const [sortBySeverity, setSortBySeverity] = useState(false)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const rows = useMemo(() => {
    const filtered = events.filter(
      (e) => (e.type === 'alert' || e.type === 'sos') && (e.riskState === 'seizure' || e.riskState === 'warning' || e.riskState === 'emergency'),
    )
    if (!sortBySeverity) return [...filtered].sort((a, b) => b.timestamp - a.timestamp)
    const rank: Record<string, number> = { 高: 3, 中: 2, 低: 1 }
    return [...filtered].sort((a, b) => (rank[severityLabel(b)] ?? 0) - (rank[severityLabel(a)] ?? 0))
  }, [events, sortBySeverity])

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">历史轨迹</h2>
        <button className="rounded border border-border-default px-2 py-1 text-xs" onClick={() => setSortBySeverity((v) => !v)}>
          {sortBySeverity ? '按时间排序' : '按严重程度排序'}
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-secondary">暂无事件记录</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-text-secondary">
            <tr>
              <th className="text-left">日期</th>
              <th className="text-left">时间</th>
              <th className="text-left">严重程度</th>
              <th className="text-left">持续时长</th>
              <th className="text-left">处理状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => {
              const d = new Date(event.timestamp)
              const dateStr = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
              const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
              const expanded = expandedKey === event.id
              const seedBase = event.timestamp % 100
              return (
                <Fragment key={event.id}>
                  <tr
                    className="cursor-pointer border-t border-border-subtle hover:bg-bg-3/30"
                    onClick={() => setExpandedKey(expanded ? null : event.id)}
                  >
                    <td>{dateStr}</td>
                    <td>{timeStr}</td>
                    <td className={severityClass(event)}>{severityLabel(event)}</td>
                    <td>{event.durationSec ? `${event.durationSec}s` : '未记录'}</td>
                    <td className="text-text-secondary">{event.handlingStatus === 'resolved' ? '已处理' : event.handlingStatus === 'acknowledged' ? '已确认' : '待处理'}</td>
                  </tr>
                  {expanded && (
                    <tr className="border-t border-border-subtle bg-bg-3/30 text-xs text-text-secondary">
                      <td colSpan={5} className="p-2">
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <WaveThumbnail title="EEG 缩略" color="#39D0D8" seed={seedBase} />
                            <WaveThumbnail title="NIRS 缩略" color="#A371F7" seed={seedBase + 10} />
                            <WaveThumbnail title="EMG 缩略" color="#F0883E" seed={seedBase + 20} />
                          </div>
                          <div>
                            事件详情：
                            <ul className="mt-1 list-inside list-disc space-y-0.5">
                              <li>{event.title}</li>
                              {event.details && <li>{event.details}</li>}
                              {event.feedbackResult && (
                                <li>{event.feedbackResult === 'true_positive' ? '已确认为发作' : '标记为误报'}</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
