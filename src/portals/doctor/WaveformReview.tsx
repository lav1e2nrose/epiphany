import { useEffect, useMemo, useState } from 'react'
import { WaveformChart } from '../../components/charts/WaveformChart'
import { useAppStore } from '../../store'

interface AnnotationItem {
  id: string
  timestamp: number
  text: string
  type: 'observation' | 'artifact' | 'clinical'
}

const WINDOW_OPTIONS = [30, 60, 120, 300]

export function WaveformReview(): JSX.Element {
  const frameBuffer = useAppStore((state) => state.frameBuffer)
  const reviewFocusTimestamp = useAppStore((state) => state.reviewFocusTimestamp)
  const setReviewFocusTimestamp = useAppStore((state) => state.setReviewFocusTimestamp)
  const [windowSec, setWindowSec] = useState(60)
  const [windowEndTs, setWindowEndTs] = useState<number>(Date.now())
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; timestamp: number } | null>(null)

  useEffect(() => {
    const latest = frameBuffer.at(-1)?.timestamp
    if (latest) setWindowEndTs(latest)
  }, [frameBuffer])

  useEffect(() => {
    if (!reviewFocusTimestamp) return
    setWindowEndTs(reviewFocusTimestamp + (windowSec * 1000) / 2)
    setReviewFocusTimestamp(null)
  }, [reviewFocusTimestamp, setReviewFocusTimestamp, windowSec])

  const windowStartTs = windowEndTs - windowSec * 1000
  const windowFrames = useMemo(
    () => frameBuffer.filter((frame) => frame.timestamp >= windowStartTs && frame.timestamp <= windowEndTs),
    [frameBuffer, windowEndTs, windowStartTs],
  )

  const timelineRange = useMemo(() => {
    const first = frameBuffer[0]?.timestamp ?? Date.now()
    const last = frameBuffer[frameBuffer.length - 1]?.timestamp ?? Date.now()
    return { min: first, max: last }
  }, [frameBuffer])

  const addAnnotation = (timestamp: number, type: AnnotationItem['type']): void => {
    const textMap: Record<AnnotationItem['type'], string> = {
      observation: '观察记录',
      artifact: '伪迹标记',
      clinical: '临床结论',
    }
    setAnnotations((prev) => [
      {
        id: `${timestamp}-${type}`,
        timestamp,
        type,
        text: `${textMap[type]} @ ${new Date(timestamp).toLocaleTimeString()}`,
      },
      ...prev,
    ])
  }

  const handleContextAnnotate = (type: AnnotationItem['type']): void => {
    if (!contextMenu) return
    addAnnotation(contextMenu.timestamp, type)
    setContextMenu(null)
  }

  return (
    <div className="grid h-full grid-rows-[96px_1fr] gap-3">
      <section className="rounded-md border border-border-default bg-bg-2 p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <button className="rounded border border-border-default px-2 py-1" onClick={() => setWindowEndTs((value) => value - windowSec * 1000)}>← 平移</button>
            <button className="rounded border border-border-default px-2 py-1" onClick={() => setWindowEndTs((value) => value + windowSec * 1000)}>平移 →</button>
            <select
              className="rounded border border-border-default bg-bg-3 px-2 py-1"
              value={windowSec}
              onChange={(event) => setWindowSec(Number(event.target.value))}
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}s 窗口
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-text-secondary">
            {new Date(windowStartTs).toLocaleTimeString()} - {new Date(windowEndTs).toLocaleTimeString()}
          </span>
        </div>
        <input
          className="mt-3 h-2 w-full"
          type="range"
          min={timelineRange.min}
          max={Math.max(timelineRange.min + 1, timelineRange.max)}
          value={Math.max(timelineRange.min, Math.min(windowEndTs, timelineRange.max))}
          onChange={(event) => setWindowEndTs(Number(event.target.value))}
        />
      </section>
      <section className="grid min-h-0 grid-cols-[1fr_240px] gap-3">
        <div
          className="relative space-y-3 overflow-auto rounded-md"
          onContextMenu={(event) => {
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)))
            const clickedTs = Math.round(windowStartTs + ratio * (windowEndTs - windowStartTs))
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              timestamp: clickedTs,
            })
          }}
          onClick={() => setContextMenu(null)}
        >
          <WaveformChart title="EEG 回溯" unit="μV" frames={windowFrames} selector={(f) => f.eeg[0] ?? 0} color="#39D0D8" annotateSeizure annotateArtifacts />
          <WaveformChart title="NIRS 回溯" unit="%" frames={windowFrames} selector={(f) => f.nirs.spo2} color="#A371F7" annotateSeizure />
          <WaveformChart title="EMG 回溯" unit="μV" frames={windowFrames} selector={(f) => f.emg[0] ?? 0} color="#F0883E" annotateArtifacts />
          {contextMenu && (
            <div className="fixed z-50 min-w-40 rounded border border-border-default bg-bg-1 p-1 text-xs" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => handleContextAnnotate('observation')}>
                添加观察注解
              </button>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => handleContextAnnotate('artifact')}>
                标记伪迹
              </button>
              <button className="block w-full rounded px-2 py-1 text-left hover:bg-bg-3" onClick={() => handleContextAnnotate('clinical')}>
                标记临床结论
              </button>
            </div>
          )}
        </div>
        <aside className="rounded-md border border-border-default bg-bg-2 p-3 text-sm text-text-secondary">
          <div>特征参数</div>
          <div className="mt-3 space-y-2 text-xs">
            <div>同步窗口: {windowFrames.length} 帧</div>
            <div>delta/theta/alpha/beta/gamma</div>
            <div>NIRS 变化率</div>
            <div>EMG RMS</div>
            <div>算法置信度历史曲线</div>
          </div>
          <div className="mt-4">注解层</div>
          <div className="mt-2 max-h-56 space-y-2 overflow-auto text-xs">
            {annotations.length === 0 && <div>暂无注解</div>}
            {annotations.map((item) => (
              <div key={item.id} className="rounded border border-border-subtle p-2">
                <div className="font-medium text-text-primary">{item.type}</div>
                <div>{item.text}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}
