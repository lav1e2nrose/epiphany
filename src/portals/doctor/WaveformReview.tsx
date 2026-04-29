import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { WaveformChart } from '../../components/charts/WaveformChart'
import { useAppStore } from '../../store'

interface AnnotationItem {
  id: string
  startTs: number
  endTs: number
  type: 'artifact' | 'seizure' | 'note'
  confidence: number
  note: string
  source: 'manual' | 'algorithm'
}

type ContextAction = 'artifact' | 'seizure' | 'confidence' | 'note' | 'export'

const WINDOW_LEVELS = [
  { key: 0, label: 'Level 0 · 6小时', seconds: 6 * 3600 },
  { key: 1, label: 'Level 1 · 30分钟', seconds: 30 * 60 },
  { key: 2, label: 'Level 2 · 5分钟', seconds: 5 * 60 },
  { key: 3, label: 'Level 3 · 30秒', seconds: 30 },
] as const

export function WaveformReview(): JSX.Element {
  const frameBuffer = useAppStore((state) => state.frameBuffer)
  const reviewFocusTimestamp = useAppStore((state) => state.reviewFocusTimestamp)
  const setReviewFocusTimestamp = useAppStore((state) => state.setReviewFocusTimestamp)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const [zoomLevel, setZoomLevel] = useState(2)
  const [windowEndTs, setWindowEndTs] = useState<number>(() => Date.now())
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; timestamp: number; annotationId?: string } | null>(null)
  const [selectedEegChannels, setSelectedEegChannels] = useState<number[]>([0, 1])
  const dragState = useRef<{ x: number; start: number; end: number } | null>(null)
  const handleDragState = useRef<{ handle: 'left' | 'right'; x: number; originalEnd: number } | null>(null)

  const [dragging, setDragging] = useState(false)
  const [handleDragging, setHandleDragging] = useState(false)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const svgTimelineRef = useRef<SVGSVGElement | null>(null)
  const windowDurationMs = WINDOW_LEVELS[zoomLevel]?.seconds * 1000

  const timelineRange = useMemo(() => {
    const first = frameBuffer[0]?.timestamp ?? Date.now()
    const last = frameBuffer[frameBuffer.length - 1]?.timestamp ?? Date.now()
    return { min: first, max: Math.max(first + 1, last) }
  }, [frameBuffer])

  const clampWindow = (start: number, end: number): { start: number; end: number } => {
    const duration = Math.max(1000, end - start)
    if (timelineRange.max <= timelineRange.min) return { start: timelineRange.min, end: timelineRange.min + duration }
    if (duration >= timelineRange.max - timelineRange.min) return { start: timelineRange.min, end: timelineRange.max }
    let nextStart = start
    let nextEnd = end
    if (nextStart < timelineRange.min) {
      nextStart = timelineRange.min
      nextEnd = nextStart + duration
    }
    if (nextEnd > timelineRange.max) {
      nextEnd = timelineRange.max
      nextStart = nextEnd - duration
    }
    return { start: nextStart, end: nextEnd }
  }

  const applyWindowByEnd = (nextEnd: number): void => {
    const rawStart = nextEnd - windowDurationMs
    const next = clampWindow(rawStart, nextEnd)
    setWindowEndTs(next.end)
  }

  useEffect(() => {
    const latest = frameBuffer.at(-1)?.timestamp
    if (latest && !dragging) applyWindowByEnd(latest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameBuffer, zoomLevel, dragging])

  useEffect(() => {
    if (!reviewFocusTimestamp) return
    applyWindowByEnd(reviewFocusTimestamp + windowDurationMs / 2)
    setReviewFocusTimestamp(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewFocusTimestamp, setReviewFocusTimestamp, windowDurationMs])

  const rawWindowStartTs = windowEndTs - windowDurationMs
  const { start: windowStartTs, end: syncedWindowEndTs } = clampWindow(rawWindowStartTs, windowEndTs)
  const windowFrames = useMemo(
    () => frameBuffer.filter((frame) => frame.timestamp >= windowStartTs && frame.timestamp <= syncedWindowEndTs),
    [frameBuffer, syncedWindowEndTs, windowStartTs],
  )
  const eegChannels = useMemo(() => {
    const maxCount = frameBuffer.reduce((max, frame) => Math.max(max, frame.eeg.length), 0)
    return Array.from({ length: Math.max(1, maxCount) }, (_, index) => index)
  }, [frameBuffer])
  const selectedChannels = selectedEegChannels.length > 0 ? selectedEegChannels : [0]
  const selectedChannelLabel = selectedChannels.map((value) => `Ch${value + 1}`).join(', ')
  const eegSelector = (frame: (typeof windowFrames)[number]): number => {
    const values = selectedChannels.map((index) => frame.eeg[index] ?? 0)
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  const algorithmAnnotations = useMemo(() => {
    const out: AnnotationItem[] = []
    let currentSeizure: AnnotationItem | null = null
    let currentArtifact: AnnotationItem | null = null
    windowFrames.forEach((frame) => {
      if (frame.riskState === 'seizure') {
        const confidence = Math.round(frame.features.preIctalConfidence * 100)
        if (!currentSeizure) {
          currentSeizure = {
            id: `alg-seizure-${frame.timestamp}`,
            startTs: frame.timestamp,
            endTs: frame.timestamp,
            type: 'seizure',
            confidence,
            note: `棘慢波发放 · 置信度 ${confidence}%`,
            source: 'algorithm',
          }
        } else {
          currentSeizure.endTs = frame.timestamp
          currentSeizure.confidence = Math.max(currentSeizure.confidence, confidence)
          currentSeizure.note = `棘慢波发放 · 置信度 ${currentSeizure.confidence}%`
        }
      } else if (currentSeizure) {
        out.push(currentSeizure)
        currentSeizure = null
      }
      if (frame.artifacts.length > 0) {
        const artifactText = frame.artifacts[0] === 'chewing' ? '咀嚼伪迹' : frame.artifacts[0] === 'movement' ? '翻身干扰' : frame.artifacts[0] === 'electrode_pop' ? '电极脱落' : '工频干扰'
        if (!currentArtifact) {
          currentArtifact = {
            id: `alg-artifact-${frame.timestamp}`,
            startTs: frame.timestamp,
            endTs: frame.timestamp,
            type: 'artifact',
            confidence: 0,
            note: `[${artifactText}]`,
            source: 'algorithm',
          }
        } else {
          currentArtifact.endTs = frame.timestamp
          currentArtifact.note = `[${artifactText}]`
        }
      } else if (currentArtifact) {
        out.push(currentArtifact)
        currentArtifact = null
      }
    })
    if (currentSeizure) out.push(currentSeizure)
    if (currentArtifact) out.push(currentArtifact)
    return out
  }, [windowFrames])
  const visibleAnnotations = useMemo(
    () =>
      [...algorithmAnnotations, ...annotations].filter(
        (item) => item.endTs >= windowStartTs && item.startTs <= syncedWindowEndTs,
      ),
    [algorithmAnnotations, annotations, syncedWindowEndTs, windowStartTs],
  )
  const addAnnotation = (timestamp: number, type: 'artifact' | 'seizure' | 'note', note?: string, confidence = 75): AnnotationItem => {
    const range = Math.max(3000, Math.round(windowDurationMs * 0.03))
    return {
      id: `${type}-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
      startTs: timestamp - range / 2,
      endTs: timestamp + range / 2,
      type,
      confidence,
      note: note ?? (type === 'artifact' ? '[人工标记伪迹]' : type === 'seizure' ? `人工确认发作 · 置信度 ${confidence}%` : '人工备注'),
      source: 'manual',
    }
  }
  const resolveContextAction = (action: ContextAction): void => {
    if (!contextMenu) return
    if (action === 'artifact') {
      const item = addAnnotation(contextMenu.timestamp, 'artifact')
      setAnnotations((prev) => [item, ...prev])
    }
    if (action === 'seizure') {
      const item = addAnnotation(contextMenu.timestamp, 'seizure', undefined, 92)
      setAnnotations((prev) => [item, ...prev])
    }
    if (action === 'confidence') {
      const next = window.prompt('请输入置信度（0-100）', '90')
      const value = Number(next)
      if (Number.isFinite(value) && value >= 0 && value <= 100) {
        if (contextMenu.annotationId) {
          setAnnotations((prev) => prev.map((item) => (item.id === contextMenu.annotationId ? { ...item, confidence: value, note: item.type === 'seizure' ? `人工确认发作 · 置信度 ${value}%` : item.note } : item)))
        } else {
          const item = addAnnotation(contextMenu.timestamp, 'seizure', undefined, value)
          setAnnotations((prev) => [item, ...prev])
        }
      }
    }
    if (action === 'note') {
      const note = window.prompt('添加文字备注', '该时段建议复核')
      if (note && note.trim()) {
        if (contextMenu.annotationId) {
          setAnnotations((prev) => prev.map((item) => (item.id === contextMenu.annotationId ? { ...item, note: note.trim() } : item)))
        } else {
          const item = addAnnotation(contextMenu.timestamp, 'note', note.trim())
          setAnnotations((prev) => [item, ...prev])
        }
      }
    }
    if (action === 'export') {
      pushAlert({
        id: `export-segment-${Date.now()}`,
        type: 'success',
        title: '片段导出已触发',
        message: `已导出 ${new Date(contextMenu.timestamp).toLocaleTimeString()} 附近波形片段（演示）`,
        timestamp: Date.now(),
      })
    }
    setContextMenu(null)
  }
  const handleZoom = (nextLevel: number, anchorRatio = 0.5): void => {
    const boundedLevel = Math.max(0, Math.min(WINDOW_LEVELS.length - 1, nextLevel))
    const currentDuration = syncedWindowEndTs - windowStartTs
    const anchorTs = windowStartTs + currentDuration * anchorRatio
    const nextDuration = WINDOW_LEVELS[boundedLevel].seconds * 1000
    const nextStart = anchorTs - nextDuration * anchorRatio
    const nextEnd = nextStart + nextDuration
    const clamped = clampWindow(nextStart, nextEnd)
    setZoomLevel(boundedLevel)
    setWindowEndTs(clamped.end)
  }

  // Attach passive:false wheel listener to the waveform area so preventDefault works
  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)))
      if (event.deltaY < 0) handleZoom(zoomLevel + 1, ratio)
      else handleZoom(zoomLevel - 1, ratio)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel, windowStartTs, syncedWindowEndTs, timelineRange])

  // SVG timeline: compute ratio helpers
  const timelineToTs = useCallback(
    (ratio: number): number => {
      const { min, max } = timelineRange
      return Math.round(min + ratio * (max - min))
    },
    [timelineRange],
  )
  const tsToRatio = useCallback(
    (ts: number): number => {
      const { min, max } = timelineRange
      const span = Math.max(1, max - min)
      return Math.max(0, Math.min(1, (ts - min) / span))
    },
    [timelineRange],
  )

  // SVG timeline click to position window
  const handleTimelineClick = (event: React.MouseEvent<SVGSVGElement>): void => {
    if (handleDragging) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)))
    const clickedTs = timelineToTs(ratio)
    applyWindowByEnd(clickedTs + windowDurationMs / 2)
  }

  // SVG handle drag: pointer events on SVG
  const handlePointerDownOnHandle = (event: React.PointerEvent<SVGCircleElement>, handle: 'left' | 'right'): void => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    handleDragState.current = { handle, x: event.clientX, originalEnd: syncedWindowEndTs }
    setHandleDragging(true)
  }
  const handlePointerMoveOnTimeline = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!handleDragState.current || !svgTimelineRef.current) return
    const rect = svgTimelineRef.current.getBoundingClientRect()
    const svgWidth = Math.max(1, rect.width)
    const dx = event.clientX - handleDragState.current.x
    const dtRatio = dx / svgWidth
    const totalSpan = Math.max(1, timelineRange.max - timelineRange.min)
    const dtMs = dtRatio * totalSpan
    const { handle, originalEnd } = handleDragState.current
    if (handle === 'right') {
      const nextEnd = originalEnd + dtMs
      applyWindowByEnd(nextEnd)
    } else {
      // left handle: shift the whole window start, keeping duration
      const nextEnd = originalEnd + dtMs
      applyWindowByEnd(nextEnd)
    }
  }
  const handlePointerUpOnTimeline = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (handleDragState.current) {
      handleDragState.current = null
      setHandleDragging(false)
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }
  const featureSnapshot = windowFrames.at(-1)?.features
  const bandpowerData = useMemo(
    () =>
      featureSnapshot
        ? [
            { band: 'delta', value: featureSnapshot.bandpower.delta },
            { band: 'theta', value: featureSnapshot.bandpower.theta },
            { band: 'alpha', value: featureSnapshot.bandpower.alpha },
            { band: 'beta', value: featureSnapshot.bandpower.beta },
            { band: 'gamma', value: featureSnapshot.bandpower.gamma },
          ]
        : [],
    [featureSnapshot],
  )
  const confidenceHistory = useMemo(
    () =>
      windowFrames.slice(-120).map((frame, index) => ({
        idx: index + 1,
        value: Math.round(frame.features.preIctalConfidence * 100),
      })),
    [windowFrames],
  )
  const emgRms = useMemo(() => {
    const emg = windowFrames.at(-1)?.emg ?? []
    if (emg.length === 0) return 0
    const power = emg.reduce((sum, value) => sum + value * value, 0) / emg.length
    return Math.sqrt(power)
  }, [windowFrames])
  const handleToggleEegChannel = (channel: number): void => {
    setSelectedEegChannels((prev) => {
      if (prev.includes(channel)) {
        const next = prev.filter((item) => item !== channel)
        return next.length === 0 ? [channel] : next
      }
      return [...prev, channel].sort((a, b) => a - b)
    })
  }
  const renderAnnotationLabel = (item: AnnotationItem): string => {
    if (item.type === 'seizure') return `${item.note}`
    return item.note
  }

  // Compute seizure/warning segments across all frameBuffer for SVG timeline overlay
  const timelineSegments = useMemo(() => {
    type Segment = { start: number; end: number; kind: 'seizure' | 'warning' }
    const segs: Segment[] = []
    let cur: Segment | null = null
    for (const frame of frameBuffer) {
      const kind = frame.riskState === 'seizure' ? 'seizure' : frame.riskState === 'warning' ? 'warning' : null
      if (kind) {
        if (cur && cur.kind === kind) {
          cur.end = frame.timestamp
        } else {
          if (cur) segs.push(cur)
          cur = { start: frame.timestamp, end: frame.timestamp, kind }
        }
      } else if (cur) {
        segs.push(cur)
        cur = null
      }
    }
    if (cur) segs.push(cur)
    return segs
  }, [frameBuffer])

  return (
    <div className="grid h-full grid-rows-[140px_1fr] gap-3">
      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded border border-border-default px-2 py-1 transition-transform active:scale-95" onClick={() => applyWindowByEnd(syncedWindowEndTs - windowDurationMs)}>
              ← 平移
            </button>
            <button className="rounded border border-border-default px-2 py-1 transition-transform active:scale-95" onClick={() => applyWindowByEnd(syncedWindowEndTs + windowDurationMs)}>
              平移 →
            </button>
            <div className="flex items-center gap-1 rounded border border-border-default bg-bg-3 p-1 text-xs">
              {WINDOW_LEVELS.map((item) => (
                <button
                  key={item.key}
                  className={`rounded px-2 py-1 transition-colors ${zoomLevel === item.key ? 'bg-accent text-bg-0' : 'hover:bg-bg-2'}`}
                  onClick={() => handleZoom(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-text-secondary">
            {new Date(windowStartTs).toLocaleTimeString()} - {new Date(syncedWindowEndTs).toLocaleTimeString()}
          </span>
        </div>
        {/* SVG timeline navigation */}
        <svg
          ref={svgTimelineRef}
          className="mt-3 w-full rounded-sm bg-bg-3"
          style={{ height: 36, display: 'block', cursor: handleDragging ? 'ew-resize' : 'pointer' }}
          onClick={handleTimelineClick}
          onPointerMove={handlePointerMoveOnTimeline}
          onPointerUp={handlePointerUpOnTimeline}
          onPointerCancel={handlePointerUpOnTimeline}
        >
          {/* Seizure / warning segments */}
          {timelineSegments.map((seg) => {
            const x1 = tsToRatio(seg.start) * 100
            const x2 = tsToRatio(seg.end) * 100
            const w = Math.max(0.3, x2 - x1)
            return (
              <rect
                key={`${seg.kind}-${seg.start}`}
                x={`${x1}%`}
                y={4}
                width={`${w}%`}
                height={28}
                fill={seg.kind === 'seizure' ? 'rgba(248,81,73,0.5)' : 'rgba(210,153,34,0.4)'}
                rx={2}
              />
            )
          })}
          {/* Current viewport accent rect + draggable handles */}
          {(() => {
            const viewX1 = tsToRatio(windowStartTs) * 100
            const viewX2 = tsToRatio(syncedWindowEndTs) * 100
            const viewW = Math.max(1, viewX2 - viewX1)
            return (
              <>
                <rect x={`${viewX1}%`} y={4} width={`${viewW}%`} height={28} fill="rgba(10,132,255,0.18)" rx={2} />
                <circle
                  cx={`${viewX1}%`}
                  cy={18}
                  r={6}
                  fill="#0A84FF"
                  style={{ cursor: 'ew-resize' }}
                  onPointerDown={(e) => handlePointerDownOnHandle(e, 'left')}
                />
                <circle
                  cx={`${viewX2}%`}
                  cy={18}
                  r={6}
                  fill="#0A84FF"
                  style={{ cursor: 'ew-resize' }}
                  onPointerDown={(e) => handlePointerDownOnHandle(e, 'right')}
                />
              </>
            )
          })()}
        </svg>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded border border-border-default bg-bg-3 p-2 text-xs">
            <div className="text-text-secondary">EEG 通道选择器（多选）</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {eegChannels.map((channel) => (
                <label key={channel} className="flex items-center gap-1">
                  <input type="checkbox" checked={selectedChannels.includes(channel)} onChange={() => handleToggleEegChannel(channel)} />
                  Ch{channel + 1}
                </label>
              ))}
            </div>
          </div>
          <div className="rounded border border-border-default bg-bg-3 p-2 text-xs text-text-secondary">
            联动说明：任意图区域滚轮缩放（以鼠标位置为中心），拖拽平移；三图共享同一 timeWindow 严格同步。
          </div>
        </div>
      </section>
      <section className="grid min-h-0 grid-cols-[1fr_240px] gap-3">
        <div
          ref={timelineRef}
          className="relative space-y-3 overflow-auto rounded-md"
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.currentTarget.setPointerCapture(event.pointerId)
            dragState.current = { x: event.clientX, start: windowStartTs, end: syncedWindowEndTs }
            setDragging(true)
          }}
          onPointerMove={(event) => {
            if (!dragState.current || !timelineRef.current) return
            const width = Math.max(1, timelineRef.current.getBoundingClientRect().width)
            const movedRatio = (event.clientX - dragState.current.x) / width
            const duration = dragState.current.end - dragState.current.start
            const shift = movedRatio * duration
            const next = clampWindow(dragState.current.start - shift, dragState.current.end - shift)
            setWindowEndTs(next.end)
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId)
            dragState.current = null
            setDragging(false)
          }}
          onPointerCancel={() => {
            dragState.current = null
            setDragging(false)
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)))
            const clickedTs = Math.round(windowStartTs + ratio * (syncedWindowEndTs - windowStartTs))
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              timestamp: clickedTs,
            })
          }}
          onClick={() => setContextMenu(null)}
        >
          <WaveformChart title={`EEG 回溯（${selectedChannelLabel}）`} unit="μV" frames={windowFrames} selector={eegSelector} color="#39D0D8" annotateSeizure annotateArtifacts />
          <WaveformChart title="NIRS 回溯" unit="%" frames={windowFrames} selector={(f) => f.nirs.spo2} color="#A371F7" annotateSeizure />
          <WaveformChart title="EMG 回溯" unit="μV" frames={windowFrames} selector={(f) => f.emg[0] ?? 0} color="#F0883E" annotateArtifacts />
          <div className="pointer-events-none absolute inset-0">
            {visibleAnnotations.slice(0, 16).map((item) => {
              const ratioStart = Math.max(0, Math.min(1, (item.startTs - windowStartTs) / Math.max(1, syncedWindowEndTs - windowStartTs)))
              const ratioEnd = Math.max(0, Math.min(1, (item.endTs - windowStartTs) / Math.max(1, syncedWindowEndTs - windowStartTs)))
              const widthPct = Math.max(0.5, (ratioEnd - ratioStart) * 100)
              return (
                <div
                  key={item.id}
                  className={`pointer-events-auto absolute top-0 bottom-0 ${
                    item.type === 'seizure'
                      ? 'border-x border-danger/50 bg-danger/10'
                      : item.type === 'artifact'
                        ? 'border-x border-dashed border-warn/50 bg-warn/10'
                        : 'border-x border-accent/40 bg-accent/10'
                  }`}
                  style={{ left: `${ratioStart * 100}%`, width: `${widthPct}%` }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setContextMenu({ x: event.clientX, y: event.clientY, timestamp: item.startTs, annotationId: item.id })
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    applyWindowByEnd(item.endTs + windowDurationMs / 2)
                  }}
                >
                  <span
                    className={`absolute left-0 top-1 max-w-[120px] truncate rounded-sm px-1 py-0.5 text-[9px] leading-none ${
                      item.type === 'seizure'
                        ? 'bg-danger/80 text-white'
                        : item.type === 'artifact'
                          ? 'bg-warn/80 text-black'
                          : 'bg-accent/80 text-white'
                    }`}
                  >
                    {renderAnnotationLabel(item)}
                  </span>
                </div>
              )
            })}
          </div>
          {contextMenu && (
            <div className="fixed z-50 min-w-48 rounded border border-border-default bg-bg-1 p-1 text-xs" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => resolveContextAction('artifact')}>
                标记为伪迹（排除此段）
              </button>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => resolveContextAction('seizure')}>
                确认为有效发作
              </button>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => resolveContextAction('confidence')}>
                修改置信度
              </button>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => resolveContextAction('note')}>
                添加文字备注
              </button>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => resolveContextAction('export')}>
                导出此段波形
              </button>
            </div>
          )}
        </div>
        <aside className="rounded-md border border-border-default bg-bg-2 p-3 text-sm text-text-secondary">
          <div>特征参数</div>
          <div className="mt-3 space-y-3 text-xs">
            <div className="rounded border border-border-default bg-bg-3 p-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">同步窗口</span>
                  <span className="font-mono text-text-primary">{windowFrames.length} 帧</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">NIRS 变化率</span>
                  <span className={`font-mono ${(featureSnapshot?.nirsDropRate ?? 0) > 0.3 ? 'text-danger' : (featureSnapshot?.nirsDropRate ?? 0) > 0.1 ? 'text-warn' : 'text-safe'}`}>
                    {(featureSnapshot?.nirsDropRate ?? 0).toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">EMG RMS</span>
                  <span className={`font-mono ${emgRms > 150 ? 'text-danger' : emgRms > 80 ? 'text-warn' : 'text-safe'}`}>
                    {emgRms.toFixed(1)} μV
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Pre-ictal 置信度</span>
                  <span className={`font-mono ${(featureSnapshot?.preIctalConfidence ?? 0) > 0.7 ? 'text-danger' : (featureSnapshot?.preIctalConfidence ?? 0) > 0.4 ? 'text-warn' : 'text-safe'}`}>
                    {Math.round((featureSnapshot?.preIctalConfidence ?? 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="h-28 rounded border border-border-default bg-bg-3 p-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandpowerData} margin={{ top: 8, right: 4, left: -12, bottom: 2 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="band" type="category" tick={{ fill: '#8B949E', fontSize: 10 }} width={34} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#39D0D8" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-28 rounded border border-border-default bg-bg-3 p-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={confidenceHistory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                  <XAxis dataKey="idx" hide />
                  <YAxis tick={{ fill: '#8B949E', fontSize: 10 }} width={26} domain={[0, 100]} />
                  <Tooltip />
                  <Line dataKey="value" stroke="#A371F7" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-4">注解层</div>
          <div className="mt-2 max-h-56 space-y-2 overflow-auto text-xs">
            {visibleAnnotations.length === 0 && <div>暂无注解</div>}
            {visibleAnnotations.map((item) => (
              <div
                key={item.id}
                className={`cursor-pointer rounded border p-2 ${item.type === 'seizure' ? 'border-danger/50' : item.type === 'artifact' ? 'border-warn/60 border-dashed' : 'border-border-subtle'}`}
                onClick={() => applyWindowByEnd(item.endTs + windowDurationMs / 2)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setContextMenu({ x: event.clientX, y: event.clientY, timestamp: item.startTs, annotationId: item.id })
                }}
              >
                <div className="font-medium text-text-primary">{item.type === 'seizure' ? '发作段' : item.type === 'artifact' ? '伪迹段' : '文字备注'}</div>
                <div>{renderAnnotationLabel(item)}</div>
                <div className="text-text-secondary">
                  {new Date(item.startTs).toLocaleTimeString()} - {new Date(item.endTs).toLocaleTimeString()}
                </div>
                <div className="text-text-secondary">
                  来源：{item.source === 'algorithm' ? '算法' : '人工'}
                  {item.type === 'seizure' ? ` · 置信度 ${item.confidence}%` : ''}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}
