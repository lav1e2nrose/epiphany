import * as d3 from 'd3'
import { useEffect, useMemo, useRef } from 'react'
import type { ProcessedFrame } from '../../types/signal'

interface Props {
  title: string
  unit: string
  frames: ProcessedFrame[]
  selector: (frame: ProcessedFrame) => number
  color: string
}

export function WaveformChart({ title, unit, frames, selector, color }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const data = useMemo(() => frames.slice(-512).map(selector), [frames, selector])
  const currentValue = data.at(-1) ?? 0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width
    canvas.height = height

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#161B22'
    ctx.fillRect(0, 0, width, height)

    const x = d3.scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, width])
    const y = d3.scaleLinear().domain([-150, 150]).range([height - 8, 8])

    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    data.forEach((value, index) => {
      const px = x(index)
      const py = y(value)
      if (index === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
  }, [color, data])

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
        <span>{title} · {currentValue.toFixed(2)}</span>
        <span>{unit}</span>
      </div>
      <canvas ref={canvasRef} className="h-[130px] w-full rounded bg-bg-3" />
      <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
        <span>融合监测中</span>
        <button className="rounded border border-border-default px-2 py-0.5">25mm/s</button>
      </div>
    </div>
  )
}
