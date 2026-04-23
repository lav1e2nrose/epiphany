import { useMemo } from 'react'
import { SeizureHeatmap } from '../../components/charts/SeizureHeatmap'
import { useAppStore } from '../../store'
import type { HeatmapCell } from '../../types/signal'

function buildCells(): HeatmapCell[] {
  const cells: HeatmapCell[] = []
  const now = new Date()
  for (let day = 0; day < 28; day += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - day)
    const key = date.toISOString().slice(0, 10)
    for (let hour = 0; hour < 24; hour += 1) {
      const seizureLevel = Math.random() > 0.94 ? Math.ceil(Math.random() * 4) : 0
      const intensity = seizureLevel > 0 ? 0 : Math.random() > 0.84 ? Math.ceil(Math.random() * 4) : 0
      cells.push({
        date: key,
        hour,
        intensity,
        seizureLevel,
        events: seizureLevel || intensity ? [{ type: seizureLevel ? 'seizure' : 'subclinical', durationSec: 30 + Math.round(Math.random() * 200), peakIntensity: Math.max(seizureLevel, intensity), factors: ['漏服药'] }] : [],
        missedMed: Math.random() > 0.85,
        sleepDeprived: Math.random() > 0.8,
      })
    }
  }
  return cells
}

export function SeizureHeatmapPage(): JSX.Element {
  const cells = useMemo(() => buildCells(), [])
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
    <div className="grid h-full grid-rows-[1fr_auto] gap-3">
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
        <div className="mt-1 text-xs">点击任意热力格可联动跳转波形回溯时间窗。</div>
      </div>
    </div>
  )
}
