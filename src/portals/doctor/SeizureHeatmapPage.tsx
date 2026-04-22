import { useMemo } from 'react'
import { SeizureHeatmap } from '../../components/charts/SeizureHeatmap'
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

  return (
    <div className="grid h-full grid-rows-[1fr_auto] gap-3">
      <SeizureHeatmap cells={cells} />
      <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
        <div>⚠ 系统检测到以下模式</div>
        <div className="mt-2">🌙 睡眠型癫痫倾向 — 凌晨 02:00–05:00 发作概率高 63%</div>
        <div>📋 服药相关性 — 漏服后 18–24h 内发作概率提升 2.3 倍</div>
      </div>
    </div>
  )
}
