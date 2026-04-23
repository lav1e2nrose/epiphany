import { Fragment, useMemo, useState } from 'react'

const rows = [
  { date: '2026-04-21', time: '03:42', place: '家中', severity: '高', duration: '2m14s', factor: '睡眠不足' },
  { date: '2026-04-20', time: '14:10', place: '学校', severity: '中', duration: '58s', factor: '漏服药' },
]

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
                      详情：发作后 5 分钟内完成监护确认；关联建议已同步到报警系统。
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
