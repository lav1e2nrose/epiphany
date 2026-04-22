import * as d3 from 'd3'
import { useEffect, useMemo, useRef } from 'react'
import type { HeatmapCell } from '../../types/signal'

interface Props {
  cells: HeatmapCell[]
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

export function SeizureHeatmap({ cells }: Props): JSX.Element {
  const ref = useRef<SVGSVGElement | null>(null)
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
        svg
          .append('rect')
          .attr('x', dateLabelWidth + cell.hour * colWidth)
          .attr('y', rowIndex * rowHeight)
          .attr('width', colWidth - 1)
          .attr('height', rowHeight - 1)
          .attr('fill', colorByCell(cell))
      })
    })
  }, [grouped])

  return <svg ref={ref} className="h-[420px] w-full rounded-md border border-border-default bg-bg-2 p-2" />
}
