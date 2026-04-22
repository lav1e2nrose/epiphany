const rows = [
  { date: '2026-04-21', time: '03:42', place: '家中', severity: '高', duration: '2m14s', factor: '睡眠不足' },
  { date: '2026-04-20', time: '14:10', place: '学校', severity: '中', duration: '58s', factor: '漏服药' },
]

export function HistoryTrack(): JSX.Element {
  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-4">
      <h2 className="mb-3 font-semibold">历史轨迹</h2>
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
          {rows.map((row) => (
            <tr key={`${row.date}-${row.time}`} className="border-t border-border-subtle">
              <td>{row.date}</td>
              <td>{row.time}</td>
              <td>{row.place}</td>
              <td>{row.severity}</td>
              <td>{row.duration}</td>
              <td>{row.factor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
