import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { HeatmapCell } from '../../types/signal'

interface Props {
  cells: HeatmapCell[]
  onCellClick?: (cell: HeatmapCell) => void
}

interface TooltipPos {
  x: number
  y: number
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

function colorByCell(cell: HeatmapCell): string {
  if (cell.seizureLevel > 0) {
    const shades = ['var(--heat-s1)', 'var(--heat-s2)', 'var(--heat-s3)', 'var(--heat-s4)']
    return shades[Math.max(0, Math.min(3, cell.seizureLevel - 1))]
  }
  if (cell.intensity > 0) {
    const shades = ['var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']
    return shades[Math.max(0, Math.min(3, cell.intensity - 1))]
  }
  return 'var(--heat-0)'
}

function formatDateLabel(dateStr: string): string {
  // dateStr: 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-').map(Number)
  const weekday = WEEKDAY_ZH[new Date(year, month - 1, day).getDay()]
  return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')} 周${weekday}`
}

export function SeizureHeatmap({ cells, onCellClick }: Props): JSX.Element {
  const ref = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<HeatmapCell | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ x: 0, y: 0 })
  const [selected, setSelected] = useState<HeatmapCell | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(960)
  const grouped = useMemo(() => d3.groups(cells, (cell) => cell.date), [cells])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const width = Math.max(640, Math.floor(entries[0]?.contentRect.width ?? 960))
      setCanvasWidth(width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const width = canvasWidth
    const dateLabelWidth = 96
    const axisHeight = 22   // top hour-axis row
    const rowHeight = 28
    const colWidth = (width - dateLabelWidth) / 24
    const totalHeight = axisHeight + grouped.length * rowHeight + 4

    svg.attr('viewBox', `0 0 ${width} ${totalHeight}`)

    // ── Hour axis (0:00 – 23:00) ──────────────────────────────────────────
    for (let h = 0; h < 24; h++) {
      svg
        .append('text')
        .attr('x', dateLabelWidth + h * colWidth + colWidth / 2)
        .attr('y', axisHeight - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#484F58')
        .attr('font-size', 9)
        .text(h === 0 ? '0:00' : h % 3 === 0 ? `${h}:00` : '')
    }

    // ── Rows ─────────────────────────────────────────────────────────────
    grouped.forEach(([date, row], rowIndex) => {
      const y0 = axisHeight + rowIndex * rowHeight

      // Date label with weekday
      svg
        .append('text')
        .attr('x', 0)
        .attr('y', y0 + 17)
        .attr('fill', '#8B949E')
        .attr('font-size', 10)
        .text(formatDateLabel(date))

      row.forEach((cell) => {
        const key = `${cell.date}-${cell.hour}`
        const isSelected = selected != null && `${selected.date}-${selected.hour}` === key
        const cellX = dateLabelWidth + cell.hour * colWidth
        const group = svg
          .append('g')
          .attr('role', 'button')
          .style('cursor', 'pointer')
          .on('mousemove', (event: MouseEvent) => {
            const rect = (ref.current as SVGSVGElement).getBoundingClientRect()
            setTooltipPos({ x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12 })
            setHovered(cell)
          })
          .on('mouseleave', () => setHovered(null))
          .on('click', () => {
            setSelected(cell)
            onCellClick?.(cell)
          })

        group
          .append('rect')
          .attr('x', cellX)
          .attr('y', y0)
          .attr('width', colWidth - 1)
          .attr('height', rowHeight - 1)
          .attr('fill', colorByCell(cell))
          .attr('stroke', isSelected ? 'var(--accent)' : 'transparent')
          .attr('stroke-width', isSelected ? 1.8 : 0)

        if (cell.events.length > 0) {
          if (cell.sleepDeprived) {
            group
              .append('text')
              .attr('x', cellX + 2)
              .attr('y', y0 + 11)
              .attr('font-size', 8)
              .attr('fill', '#E6EDF3')
              .text('😴')
          }
          if (cell.missedMed) {
            group
              .append('text')
              .attr('x', cellX + colWidth - 12)
              .attr('y', y0 + 11)
              .attr('font-size', 8)
              .attr('fill', '#E6EDF3')
              .text('💊')
          }
        }
      })
    })
  }, [canvasWidth, grouped, onCellClick, selected])

  return (
    <div ref={containerRef} className="relative min-h-0 overflow-auto">
      <svg ref={ref} className="min-w-[640px] w-full rounded-md border border-border-default bg-bg-2 p-2" style={{ height: 'auto', display: 'block' }} />
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-md border border-border-default bg-bg-1/97 p-2.5 text-xs shadow-lg"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="font-semibold text-text-primary">
            {formatDateLabel(hovered.date)}&nbsp;
            {hovered.hour.toString().padStart(2, '0')}:00–{(hovered.hour + 1).toString().padStart(2, '0')}:00
          </div>
          <div className="mt-1.5 space-y-0.5 text-text-secondary">
            <div>事件类型：{hovered.events.map((e) => (e.type === 'seizure' ? '发作' : '亚临床')).join(' / ') || '无'}</div>
            <div>持续时长：{hovered.events.map((e) => `${e.durationSec}s`).join(' / ') || '—'}</div>
            <div>峰值强度：{hovered.events.map((e) => e.peakIntensity).join(' / ') || String(Math.max(hovered.seizureLevel, hovered.intensity))}</div>
            <div>关联因素：{hovered.events.flatMap((e) => e.factors).join('、') || '无'}</div>
            <div>标记：{[hovered.missedMed ? '💊 漏服药' : '', hovered.sleepDeprived ? '😴 睡眠不足' : ''].filter(Boolean).join('  ') || '无'}</div>
          </div>
          <div className="mt-1.5 text-text-muted">点击跳转至波形回溯</div>
        </div>
      )}
    </div>
  )
}
