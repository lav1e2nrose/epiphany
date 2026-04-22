import * as d3 from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProcessedFrame } from '../../types/signal'

interface Props {
  title: string
  unit: string
  frames: ProcessedFrame[]
  selector: (frame: ProcessedFrame) => number
  color: string
  annotateSeizure?: boolean
  annotateArtifacts?: boolean
}

type Speed = 25 | 50

interface Segment {
  start: number
  end: number
  kind: 'seizure' | 'artifact'
  label: string
}

function clamp(value: number): number {
  return Math.max(-150, Math.min(150, value))
}

export function WaveformChart({
  title,
  unit,
  frames,
  selector,
  color,
  annotateSeizure = false,
  annotateArtifacts = false,
}: Props): JSX.Element {
  const [speed, setSpeed] = useState<Speed>(25)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const needsDrawRef = useRef(true)
  const prevDataRef = useRef<number[]>([])
  const prevWidthRef = useRef(0)
  const prevHeightRef = useRef(0)

  const pointsPerView = speed === 25 ? 512 : 256
  const data = useMemo(() => frames.slice(-pointsPerView).map(selector), [frames, pointsPerView, selector])
  const currentValue = data.at(-1) ?? 0

  const segments = useMemo(() => {
    const windowFrames = frames.slice(-pointsPerView)
    const out: Segment[] = []
    let current: Segment | null = null

    windowFrames.forEach((frame, index) => {
      const seizure = annotateSeizure && frame.riskState === 'seizure'
      const artifact = annotateArtifacts && frame.artifacts.length > 0
      const kind: Segment['kind'] | null = seizure ? 'seizure' : artifact ? 'artifact' : null
      const label = seizure ? '发作标注' : artifact ? frame.artifacts[0] : ''
      if (!kind) {
        if (current) {
          out.push(current)
          current = null
        }
        return
      }
      if (!current || current.kind !== kind || current.label !== label) {
        if (current) out.push(current)
        current = { start: index, end: index, kind, label }
      } else {
        current.end = index
      }
    })

    if (current) out.push(current)
    return out
  }, [annotateArtifacts, annotateSeizure, frames, pointsPerView])

  useEffect(() => {
    needsDrawRef.current = true
  }, [data, color])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (): void => {
      if (!needsDrawRef.current) {
        rafRef.current = window.requestAnimationFrame(draw)
        return
      }
      needsDrawRef.current = false

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      const x = d3.scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, width])
      const y = d3.scaleLinear().domain([-150, 150]).range([height - 8, 8])

      const prev = prevDataRef.current
      const sameCanvas = prevWidthRef.current === width && prevHeightRef.current === height
      const canDiffDraw = sameCanvas && data.length === prev.length && data.length > 1
      const shiftCount = canDiffDraw ? data.length - 1 - prev.findIndex((v, i) => v !== data[i]) : -1
      const shouldShift = canDiffDraw && shiftCount === 1

      if (shouldShift) {
        const stepPx = width / Math.max(1, data.length - 1)
        const image = ctx.getImageData(stepPx, 0, width - stepPx, height)
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = '#161B22'
        ctx.fillRect(0, 0, width, height)
        ctx.putImageData(image, 0, 0)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        const lastIndex = data.length - 1
        ctx.beginPath()
        ctx.moveTo(x(lastIndex - 1), y(clamp(data[lastIndex - 1] ?? 0)))
        ctx.lineTo(x(lastIndex), y(clamp(data[lastIndex] ?? 0)))
        ctx.stroke()
      } else {
        ctx.clearRect(0, 0, width, height)
        ctx.fillStyle = '#161B22'
        ctx.fillRect(0, 0, width, height)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        data.forEach((value, index) => {
          const px = x(index)
          const py = y(clamp(value))
          if (index === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
      }

      prevDataRef.current = data
      prevWidthRef.current = width
      prevHeightRef.current = height
      rafRef.current = window.requestAnimationFrame(draw)
    }

    rafRef.current = window.requestAnimationFrame(draw)
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    }
  }, [color, data])

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
        <span>{title} · {currentValue.toFixed(2)}</span>
        <span>{unit}</span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} className="h-[130px] w-full rounded bg-bg-3" />
        {(annotateSeizure || annotateArtifacts) && (
          <svg className="pointer-events-none absolute inset-0 h-[130px] w-full">
            {segments.map((segment, idx) => {
              const w = 100 / Math.max(1, data.length)
              const x = segment.start * w
              const width = Math.max(w, (segment.end - segment.start + 1) * w)
              const seizure = segment.kind === 'seizure'
              return (
                <g key={`${segment.kind}-${segment.start}-${idx}`}>
                  <rect
                    x={`${x}%`}
                    y="0%"
                    width={`${width}%`}
                    height="100%"
                    fill={seizure ? 'rgba(248, 81, 73, 0.18)' : 'rgba(210, 153, 34, 0.15)'}
                    stroke={seizure ? 'rgba(248, 81, 73, 0.55)' : 'rgba(210, 153, 34, 0.6)'}
                    strokeDasharray={seizure ? undefined : '4 3'}
                  />
                  <text
                    x={`${x + 0.4}%`}
                    y="12"
                    fontSize="10"
                    fill={seizure ? '#F85149' : '#D29922'}
                  >
                    {segment.label}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
        <span>融合监测中</span>
        <button
          className="rounded border border-border-default px-2 py-0.5"
          onClick={() => setSpeed((s) => (s === 25 ? 50 : 25))}
        >
          {speed}mm/s
        </button>
      </div>
    </div>
  )
}
