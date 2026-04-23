import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { HeatmapCell } from '../../types/signal'

interface Props {
  cells: HeatmapCell[]
  onCellClick?: (cell: HeatmapCell) => void
}

function colorByCell(cell: HeatmapCell): string {
  if (cell.seizureLevel > 0) {
    const shades = ['#3D1A1A', '#7A2020', '#C0392B', '#F85149']
    return shades[Math.max(0, Math.min(3, cell.seizureLevel - 1))]
  }
  if (cell.intensity > 0) {
    const shades = ['#0E4429', '#006D32', '#26A641', '#39D353']
    return shades[Math.max(0, Math.min(3, cell.intensity - 1))]
  }
  return '#161B22'
}

export function SeizureHeatmap({ cells, onCellClick }: Props): JSX.Element {
  const ref = useRef<SVGSVGElement | null>(null)
  const [hovered, setHovered] = useState<HeatmapCell | null>(null)
  const grouped = useMemo(() => d3.groups(cells, (cell) => cell.date), [cells])

  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const width = 960
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
        const group = svg
          .append('g')
          .attr('role', 'button')
          .style('cursor', 'pointer')
          .on('mouseenter', () => setHovered(cell))
          .on('mouseleave', () => setHovered(null))
          .on('click', () => onCellClick?.(cell))

        group
          .append('rect')
          .attr('x', dateLabelWidth + cell.hour * colWidth)
          .attr('y', rowIndex * rowHeight)
          .attr('width', colWidth - 1)
          .attr('height', rowHeight - 1)
          .attr('fill', colorByCell(cell))

        if (cell.missedMed || cell.sleepDeprived) {
          group
            .append('circle')
            .attr('cx', dateLabelWidth + cell.hour * colWidth + colWidth - 7)
            .attr('cy', rowIndex * rowHeight + 7)
            .attr('r', 4)
            .attr('fill', cell.missedMed ? '#D29922' : '#388BFD')
            .attr('stroke', '#0D1117')
            .attr('stroke-width', 1)
        }
      })
    })
  }, [grouped, onCellClick])

  return (
    <div className="relative">
      <svg ref={ref} className="h-[420px] w-full rounded-md border border-border-default bg-bg-2 p-2" />
      {hovered && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border-default bg-bg-1/95 p-2 text-xs">
          <div className="font-semibold">{hovered.date} {hovered.hour.toString().padStart(2, '0')}:00</div>
          <div className="mt-1 text-text-secondary">发作等级: {hovered.seizureLevel}</div>
          <div className="text-text-secondary">异常强度: {hovered.intensity}</div>
          <div className="text-text-secondary">事件数: {hovered.events.length}</div>
          <div className="text-text-secondary">
            标记: {hovered.missedMed ? '漏服药 ' : ''}{hovered.sleepDeprived ? '睡眠不足' : '无'}
          </div>
        </div>
      )}
    </div>
  )
}
