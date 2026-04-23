import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'
import type { RiskState } from '../../types/signal'

type RiskFilter = 'all' | 'safe' | 'warning' | 'seizure'
type SortKey = 'risk' | 'weekly' | 'adherence'

const riskRank: Record<RiskFilter, number> = { all: 0, safe: 1, warning: 2, seizure: 3 }

function riskLabel(level: RiskState): { label: string; className: string } {
  if (level === 'seizure') return { label: '🔴高危', className: 'bg-danger/15 text-danger' }
  if (level === 'warning') return { label: '🟡中危', className: 'bg-warn/15 text-warn' }
  return { label: '🟢低危', className: 'bg-safe/15 text-safe' }
}

export function PatientManagement(): JSX.Element {
  const patients = useAppStore((state) => state.patients)
  const requestPage = useAppStore((state) => state.requestPage)
  const setSelectedDoctorPatientId = useAppStore((state) => state.setSelectedDoctorPatientId)
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('risk')
  const [desc, setDesc] = useState(true)

  const filtered = useMemo(() => {
    const keyword = search.trim()
    const byRisk = patients.filter((patient) => riskFilter === 'all' || patient.riskLevel === riskFilter)
    const byKeyword = keyword ? byRisk.filter((patient) => patient.name.includes(keyword)) : byRisk
    const sorted = [...byKeyword].sort((a, b) => {
      const direction = desc ? -1 : 1
      if (sortKey === 'risk') return (riskRank[b.riskLevel as RiskFilter] - riskRank[a.riskLevel as RiskFilter]) * direction
      if (sortKey === 'weekly') return (b.weeklySeizures - a.weeklySeizures) * direction
      return (b.adherence - a.adherence) * direction
    })
    return sorted
  }, [desc, patients, riskFilter, search, sortKey])

  const toHeatmap = (patientId: string): void => {
    setSelectedDoctorPatientId(patientId)
    requestPage('heatmap')
  }

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">患者管理</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索患者姓名"
            className="rounded border border-border-default bg-bg-3 px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-1">
            {[
              ['all', '全部'],
              ['safe', '低危'],
              ['warning', '中危'],
              ['seizure', '高危'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={`rounded-full border px-2 py-1 text-xs ${
                  riskFilter === value ? 'border-accent bg-accent/20 text-text-primary' : 'border-border-default text-text-secondary'
                }`}
                onClick={() => setRiskFilter(value as RiskFilter)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="rounded border border-border-default px-2 py-1 text-xs text-text-secondary"
            onClick={() => setDesc((value) => !value)}
          >
            {desc ? '降序' : '升序'}
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-text-secondary">
          <tr>
            <th className="text-left">患者姓名</th>
            <th className="text-left">年龄</th>
            <th className="text-left">
              <button className="hover:text-text-primary" onClick={() => setSortKey('weekly')}>
                本周发作
              </button>
            </th>
            <th className="text-left">最近发作</th>
            <th className="text-left">
              <button className="hover:text-text-primary" onClick={() => setSortKey('risk')}>
                风险等级
              </button>
            </th>
            <th className="text-left">
              <button className="hover:text-text-primary" onClick={() => setSortKey('adherence')}>
                服药依从性
              </button>
            </th>
            <th className="text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((patient) => {
            const risk = riskLabel(patient.riskLevel)
            return (
              <tr key={patient.id} className="border-t border-border-subtle hover:bg-bg-3/30">
                <td>{patient.name}</td>
                <td>{patient.age}</td>
                <td>{patient.weeklySeizures}次</td>
                <td>{patient.lastSeizure}</td>
                <td>
                  <span className={`rounded px-2 py-0.5 text-xs ${risk.className}`}>{risk.label}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-3">
                      <div className="h-full bg-accent" style={{ width: `${patient.adherence}%` }} />
                    </div>
                    <span className="font-mono text-xs">{patient.adherence}%</span>
                  </div>
                </td>
                <td>
                  <button className="rounded border border-accent/60 px-2 py-0.5 text-xs text-accent" onClick={() => toHeatmap(patient.id)}>
                    查看
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
