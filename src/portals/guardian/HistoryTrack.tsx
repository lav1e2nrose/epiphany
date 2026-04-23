import { Fragment, useMemo, useState } from 'react'

const rows = [
  {
    date: '2026-04-21',
    time: '03:42',
    place: '家中',
    severity: '高',
    duration: '2m14s',
    factor: '睡眠不足',
    logs: ['漏服晚间药物', '前一晚睡眠 4.8h', '发作后 5 分钟内监护确认'],
  },
  {
    date: '2026-04-20',
    time: '14:10',
    place: '学校',
    severity: '中',
    duration: '58s',
    factor: '漏服药',
    logs: ['中午服药延迟 3h', '午休不足 20min', '事件标记已同步医生端'],
  },
]

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

export function HistoryTrack(): JSX.Element {
  const [sortBySeverity, setSortBySeverity] = useState(false)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const sortedRows = useMemo(() => {
    if (!sortBySeverity) return rows
    const rank: Record<string, number> = { 高: 3, 中: 2, 低: 1 }
    return [...rows].sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0))
  }, [sortBySeverity])

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">历史轨迹</h2>
        <button className="rounded border border-border-default px-2 py-1 text-xs" onClick={() => setSortBySeverity((value) => !value)}>
          {sortBySeverity ? '按时间排序' : '按严重程度排序'}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-text-secondary">
          <tr>
            <th className="text-left">日期</th>
            <th className="text-left">时间</th>
            <th className="text-left">地点</th>
            <th className="text-left">严重程度</th>
            <th className="text-left">持续时长</th>
            <th className="text-left">关联因素</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const key = `${row.date}-${row.time}`
            const expanded = expandedKey === key
            return (
              <Fragment key={key}>
                <tr className="border-t border-border-subtle cursor-pointer hover:bg-bg-3/30" onClick={() => setExpandedKey(expanded ? null : key)}>
                  <td>{row.date}</td>
                  <td>{row.time}</td>
                  <td>{row.place}</td>
                  <td>{row.severity}</td>
                  <td>{row.duration}</td>
                  <td>{row.factor}</td>
                </tr>
                {expanded && (
                  <tr className="border-t border-border-subtle bg-bg-3/30 text-xs text-text-secondary">
                    <td colSpan={6} className="p-2">
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <WaveThumbnail title="EEG 缩略" color="#39D0D8" seed={12} />
                          <WaveThumbnail title="NIRS 缩略" color="#A371F7" seed={22} />
                          <WaveThumbnail title="EMG 缩略" color="#F0883E" seed={32} />
                        </div>
                        <div>
                          关联日志：
                          <ul className="mt-1 list-inside list-disc space-y-0.5">
                            {row.logs.map((log) => (
                              <li key={log}>{log}</li>
                            ))}
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
    </div>
  )
}
