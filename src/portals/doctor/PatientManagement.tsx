import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'

export function PatientManagement(): JSX.Element {
  const patients = useAppStore((state) => state.patients)
  const requestPage = useAppStore((state) => state.requestPage)
  const setReviewFocusTimestamp = useAppStore((state) => state.setReviewFocusTimestamp)
  const [riskFilter, setRiskFilter] = useState<'all' | 'safe' | 'warning' | 'seizure'>('all')

  const filtered = useMemo(
    () => patients.filter((patient) => riskFilter === 'all' || patient.riskLevel === riskFilter),
    [patients, riskFilter],
  )

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">患者管理</h2>
        <select className="rounded border border-border-default bg-bg-3 px-2 py-1 text-sm" value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as 'all' | 'safe' | 'warning' | 'seizure')}>
          <option value="all">全部风险</option>
          <option value="safe">低危</option>
          <option value="warning">中危</option>
          <option value="seizure">高危</option>
        </select>
      </div>
      <table className="w-full text-sm">
        <thead className="text-text-secondary">
          <tr>
            <th className="text-left">患者姓名</th>
            <th className="text-left">年龄</th>
            <th className="text-left">本周发作</th>
            <th className="text-left">最近发作</th>
            <th className="text-left">风险等级</th>
            <th className="text-left">服药依从性</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((patient) => (
            <tr
              key={patient.id}
              className="border-t border-border-subtle cursor-pointer hover:bg-bg-3/30"
              onClick={() => {
                setReviewFocusTimestamp(Date.now())
                requestPage('review')
              }}
            >
              <td>{patient.name}</td>
              <td>{patient.age}</td>
              <td>{patient.weeklySeizures}次</td>
              <td>{patient.lastSeizure}</td>
              <td>{patient.riskLevel}</td>
              <td>{patient.adherence}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
