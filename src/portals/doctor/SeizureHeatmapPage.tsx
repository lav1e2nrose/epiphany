import { useMemo } from 'react'
import { SeizureHeatmap } from '../../components/charts/SeizureHeatmap'
import { useAppStore } from '../../store'
import type { HeatmapCell } from '../../types/signal'

function hashSeed(text: string): number {
  return text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 13
}

function buildCells(seedText: string): HeatmapCell[] {
  let seed = hashSeed(seedText)
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const cells: HeatmapCell[] = []
  const now = new Date()
  for (let day = 0; day < 28; day += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - day)
    const key = date.toISOString().slice(0, 10)
    for (let hour = 0; hour < 24; hour += 1) {
      const seizureLevel = rand() > 0.94 ? Math.ceil(rand() * 4) : 0
      const intensity = seizureLevel > 0 ? 0 : rand() > 0.84 ? Math.ceil(rand() * 4) : 0
      cells.push({
        date: key,
        hour,
        intensity,
        seizureLevel,
        events:
          seizureLevel || intensity
            ? [
                {
                  type: seizureLevel ? 'seizure' : 'subclinical',
                  durationSec: 30 + Math.round(rand() * 200),
                  peakIntensity: Math.max(seizureLevel, intensity),
                  factors: [rand() > 0.5 ? '漏服药' : '睡眠不足', rand() > 0.75 ? '强压力' : ''].filter(Boolean),
                },
              ]
            : [],
        missedMed: rand() > 0.85,
        sleepDeprived: rand() > 0.8,
      })
    }
  }
  return cells
}

export function SeizureHeatmapPage(): JSX.Element {
  const patients = useAppStore((state) => state.patients)
  const selectedDoctorPatientId = useAppStore((state) => state.selectedDoctorPatientId)
  const setSelectedDoctorPatientId = useAppStore((state) => state.setSelectedDoctorPatientId)
  const selectedPatient =
    patients.find((patient) => patient.id === selectedDoctorPatientId) ?? patients[0]
  const cells = useMemo(() => buildCells(selectedPatient?.id ?? 'default-patient'), [selectedPatient?.id])
  const setReviewFocusTimestamp = useAppStore((state) => state.setReviewFocusTimestamp)
  const requestPage = useAppStore((state) => state.requestPage)
  const pattern = useMemo(() => {
    const total = Math.max(1, cells.filter((cell) => cell.seizureLevel > 0).length)
    const nightCount = cells.filter((cell) => cell.seizureLevel > 0 && cell.hour >= 2 && cell.hour <= 5).length
    const medCount = cells.filter((cell) => cell.seizureLevel > 0 && cell.missedMed).length
    return {
      nightRate: Math.round((nightCount / total) * 100),
      medRate: Math.round((medCount / total) * 100),
    }
  }, [cells])

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-default bg-bg-2 px-3 py-2 text-sm">
        <div>
          当前患者：<span className="font-semibold">{selectedPatient?.name ?? '未选择'}</span>
          <span className="ml-2 text-text-secondary">({selectedPatient?.age ?? '--'} 岁)</span>
        </div>
        <select
          value={selectedPatient?.id}
          onChange={(event) => setSelectedDoctorPatientId(event.target.value)}
          className="rounded border border-border-default bg-bg-3 px-2 py-1 text-xs"
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
            </option>
          ))}
        </select>
      </div>
      <SeizureHeatmap
        cells={cells}
        onCellClick={(cell) => {
          const [year, month, day] = cell.date.split('-').map((value) => Number(value))
          const focusTs = new Date(year, month - 1, day, cell.hour, 0, 0).getTime()
          setReviewFocusTimestamp(focusTs)
          requestPage('review')
        }}
      />
      <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
        <div>⚠ 系统检测到以下模式</div>
        <div className="mt-2">🌙 睡眠型癫痫倾向 — 凌晨 02:00–05:00 发作占比 {pattern.nightRate}%</div>
        <div>📋 服药相关性 — 发作事件中漏服药标记占比 {pattern.medRate}%</div>
        <div className="mt-1 text-xs">点击任意热力格可联动跳转波形回溯时间窗，并保留当前患者上下文。</div>
      </div>
    </div>
  )
}
