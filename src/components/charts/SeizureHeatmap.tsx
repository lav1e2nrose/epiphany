import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { HeatmapCell } from '../../types/signal'

interface Props {
  cells: HeatmapCell[]
  onCellClick?: (cell: HeatmapCell) => void
}

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

export function SeizureHeatmap({ cells, onCellClick }: Props): JSX.Element {
  const ref = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<HeatmapCell | null>(null)
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
    const dateLabelWidth = 90
    const rowHeight = 28
    const colWidth = (width - dateLabelWidth) / 24

    svg.attr('viewBox', `0 0 ${width} ${grouped.length * rowHeight + 30}`)

    grouped.forEach(([date, row], rowIndex) => {
      svg
        .append('text')
        .attr('x', 0)
        .attr('y', rowIndex * rowHeight + 18)
        .attr('fill', '#8B949E')
        .attr('font-size', 10)
        .text(date.slice(5))

      row.forEach((cell) => {
        const key = `${cell.date}-${cell.hour}`
        const isSelected = selected && `${selected.date}-${selected.hour}` === key
        const group = svg
          .append('g')
          .attr('role', 'button')
          .style('cursor', 'pointer')
          .on('mouseenter', () => setHovered(cell))
          .on('mouseleave', () => setHovered(null))
          .on('click', () => {
            setSelected(cell)
            onCellClick?.(cell)
          })

        group
          .append('rect')
          .attr('x', dateLabelWidth + cell.hour * colWidth)
          .attr('y', rowIndex * rowHeight)
          .attr('width', colWidth - 1)
          .attr('height', rowHeight - 1)
          .attr('fill', colorByCell(cell))
          .attr('stroke', isSelected ? 'var(--accent)' : 'transparent')
          .attr('stroke-width', isSelected ? 1.8 : 0)

        if (cell.events.length > 0 && (cell.missedMed || cell.sleepDeprived)) {
          if (cell.sleepDeprived) {
            group
              .append('text')
              .attr('x', dateLabelWidth + cell.hour * colWidth + 3)
              .attr('y', rowIndex * rowHeight + 10)
              .attr('font-size', 8)
              .attr('fill', '#E6EDF3')
              .text('😴')
          }
          if (cell.missedMed) {
            group
              .append('text')
              .attr('x', dateLabelWidth + cell.hour * colWidth + colWidth - 12)
              .attr('y', rowIndex * rowHeight + 10)
              .attr('font-size', 8)
              .attr('fill', '#E6EDF3')
              .text('💊')
          }
          group
            .append('circle')
            .attr('cx', dateLabelWidth + cell.hour * colWidth + colWidth - 7)
            .attr('cy', rowIndex * rowHeight + 7)
            .attr('r', 4)
            .attr('fill', cell.missedMed ? 'var(--warn)' : 'var(--recovery)')
            .attr('stroke', 'var(--bg-1)')
            .attr('stroke-width', 1)
        }
      })
    })
  }, [canvasWidth, grouped, onCellClick, selected])

  return (
    <div ref={containerRef} className="relative min-h-0 overflow-auto">
      <svg ref={ref} className="h-[420px] min-w-[640px] w-full rounded-md border border-border-default bg-bg-2 p-2" />
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border-default bg-bg-1/95 p-2 text-xs">
          <div className="font-semibold">
            {hovered.date} {hovered.hour.toString().padStart(2, '0')}:00-{(hovered.hour + 1).toString().padStart(2, '0')}:00
          </div>
          <div className="mt-1 text-text-secondary">
            事件类型: {hovered.events.map((event) => (event.type === 'seizure' ? '发作' : '亚临床')).join(' / ') || '无'}
          </div>
          <div className="text-text-secondary">
            持续时长: {hovered.events.map((event) => `${event.durationSec}s`).join(' / ') || '—'}
          </div>
          <div className="text-text-secondary">
            峰值强度: {hovered.events.map((event) => event.peakIntensity).join(' / ') || Math.max(hovered.seizureLevel, hovered.intensity)}
          </div>
          <div className="text-text-secondary">
            标记: {[hovered.missedMed ? '漏服药' : '', hovered.sleepDeprived ? '睡眠不足' : '']
              .filter(Boolean)
              .join(' / ') || '无'}
          </div>
          <div className="text-text-secondary">关联因素: {hovered.events.flatMap((event) => event.factors).join(' / ') || '无'}</div>
          <div className="mt-1 text-text-secondary">点击后已联动波形回溯到该时段</div>
        </div>
      )}
    </div>
  )
}
