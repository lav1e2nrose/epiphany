import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Trash2 } from 'lucide-react'
import type { VideoClipMeta } from '../../types/clinical'

interface Props {
  clips: VideoClipMeta[]
  selectedClipId: string | null
  onSelect: (clipId: string) => void
  onDelete?: (clipId: string) => void
  faceBlur?: boolean
}

// 视频画面内部渲染分辨率（固定，CSS 等比缩放到容器宽度）
const SCENE_W = 640
const SCENE_H = 360
const EEG_W = 640
const EEG_H = 132

// 确定性伪随机：同一输入恒定输出，保证每次重绘的噪声/波形一致，避免画面抖动“随机化”
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// 将剪辑划分为三段（前驱 / 发作 / 恢复），用于视频抽搐强度与 EEG 棘波强度的时间对齐
function phaseWindows(durationSec: number): { seizureStart: number; seizureEnd: number } {
  return { seizureStart: durationSec * 0.32, seizureEnd: durationSec * 0.62 }
}

function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** 夜视卧室场景：随播放时间推进，发作窗内人物出现抽搐位移；含颗粒、扫描线、暗角 */
function drawScene(ctx: CanvasRenderingContext2D, t: number, durationSec: number, faceBlur: boolean): void {
  const { seizureStart, seizureEnd } = phaseWindows(durationSec)
  const inSeizure = t >= seizureStart && t <= seizureEnd
  const seizureIntensity = inSeizure ? 0.4 + 0.6 * Math.abs(Math.sin(t * 9)) : 0

  // 夜视底色（深绿）
  const bg = ctx.createLinearGradient(0, 0, 0, SCENE_H)
  bg.addColorStop(0, '#05130b')
  bg.addColorStop(1, '#020a06')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SCENE_W, SCENE_H)

  // 墙面与地面分界
  ctx.strokeStyle = 'rgba(57,211,83,0.10)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 250)
  ctx.lineTo(SCENE_W, 250)
  ctx.stroke()

  // 床
  ctx.fillStyle = 'rgba(46,160,67,0.10)'
  ctx.strokeStyle = 'rgba(57,211,83,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(120, 150, 400, 150, 8)
  ctx.fill()
  ctx.stroke()
  // 枕头
  ctx.fillStyle = 'rgba(57,211,83,0.18)'
  ctx.beginPath()
  ctx.roundRect(140, 165, 90, 55, 8)
  ctx.fill()

  // 被子下的人物（抽搐时整体抖动 + 呼吸起伏）
  const breathe = Math.sin(t * (inSeizure ? 8 : 1.4)) * (inSeizure ? 5 : 1.5)
  const jitterX = inSeizure ? (seeded(Math.floor(t * 30)) - 0.5) * 16 * seizureIntensity : 0
  const jitterY = inSeizure ? (seeded(Math.floor(t * 30) + 99) - 0.5) * 10 * seizureIntensity : 0
  ctx.save()
  ctx.translate(jitterX, jitterY)
  ctx.fillStyle = inSeizure ? 'rgba(120,230,140,0.45)' : 'rgba(70,180,100,0.35)'
  ctx.beginPath()
  ctx.roundRect(210, 175 + breathe * 0.4, 280, 110 - breathe * 0.2, 40)
  ctx.fill()
  // 头部
  ctx.beginPath()
  ctx.arc(245, 195, 26, 0, Math.PI * 2)
  ctx.fillStyle = faceBlur ? 'rgba(40,110,70,0.9)' : 'rgba(150,240,170,0.55)'
  ctx.fill()
  if (faceBlur) {
    // 打码：在头部叠加马赛克块
    for (let i = 0; i < 16; i++) {
      const bx = 222 + (i % 4) * 12
      const by = 173 + Math.floor(i / 4) * 12
      ctx.fillStyle = `rgba(${40 + seeded(i) * 60},${120 + seeded(i + 5) * 80},${70 + seeded(i + 9) * 50},0.85)`
      ctx.fillRect(bx, by, 12, 12)
    }
  }
  // 抽搐时一条手臂上抬
  if (inSeizure) {
    ctx.strokeStyle = 'rgba(150,240,170,0.6)'
    ctx.lineWidth = 10
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(330, 210)
    ctx.lineTo(360 + Math.sin(t * 14) * 18, 150 - Math.abs(Math.sin(t * 12)) * 24)
    ctx.stroke()
  }
  ctx.restore()

  // 颗粒噪声（夜视感）
  for (let i = 0; i < 220; i++) {
    const gx = seeded(i + Math.floor(t * 12)) * SCENE_W
    const gy = seeded(i * 3 + Math.floor(t * 12)) * SCENE_H
    ctx.fillStyle = `rgba(120,220,150,${seeded(i * 7) * 0.06})`
    ctx.fillRect(gx, gy, 1.5, 1.5)
  }
  // 扫描线
  ctx.fillStyle = 'rgba(0,0,0,0.10)'
  for (let y = 0; y < SCENE_H; y += 3) ctx.fillRect(0, y, SCENE_W, 1)

  // 暗角
  const vig = ctx.createRadialGradient(SCENE_W / 2, SCENE_H / 2, 120, SCENE_W / 2, SCENE_H / 2, 420)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, SCENE_W, SCENE_H)
}

/** 整段 EEG 缩略波形（时间轴 = 视频时长），红色游标随视频时间同步移动 */
function drawEEG(ctx: CanvasRenderingContext2D, t: number, durationSec: number): void {
  const { seizureStart, seizureEnd } = phaseWindows(durationSec)
  ctx.clearRect(0, 0, EEG_W, EEG_H)
  ctx.fillStyle = '#0D1117'
  ctx.fillRect(0, 0, EEG_W, EEG_H)

  // 发作窗背景高亮
  const sx = (seizureStart / durationSec) * EEG_W
  const ex = (seizureEnd / durationSec) * EEG_W
  ctx.fillStyle = 'rgba(248,81,73,0.10)'
  ctx.fillRect(sx, 0, ex - sx, EEG_H)

  // 中线
  ctx.strokeStyle = 'rgba(48,54,61,0.8)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, EEG_H / 2)
  ctx.lineTo(EEG_W, EEG_H / 2)
  ctx.stroke()

  // 波形：发作窗内出现高幅棘波，前驱期轻度，恢复期回落
  ctx.strokeStyle = '#39D0D8'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  for (let x = 0; x <= EEG_W; x++) {
    const tt = (x / EEG_W) * durationSec
    let amp = 6
    let spike = 0
    if (tt >= seizureStart && tt <= seizureEnd) {
      amp = 9
      spike = (seeded(x * 7) - 0.5) * 36 * (0.55 + 0.45 * Math.sin(x * 0.9))
    } else if (tt > seizureStart - durationSec * 0.12 && tt < seizureStart) {
      spike = (seeded(x * 5) - 0.5) * 12
    } else if (tt > seizureEnd) {
      amp = 7
    }
    const base = Math.sin(x * 0.18) * amp + Math.sin(x * 0.07) * amp * 0.6 + (seeded(x) - 0.5) * 4
    const y = EEG_H / 2 - (base + spike)
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 同步游标
  const px = (t / durationSec) * EEG_W
  ctx.strokeStyle = '#F85149'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(px, 0)
  ctx.lineTo(px, EEG_H)
  ctx.stroke()
}

export function VideoEEGSyncView({ clips, selectedClipId, onSelect, onDelete, faceBlur = false }: Props): JSX.Element {
  const selected = useMemo(() => clips.find((clip) => clip.id === selectedClipId) ?? clips[0] ?? null, [clips, selectedClipId])
  const duration = selected?.durationSec ?? 0
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const sceneRef = useRef<HTMLCanvasElement | null>(null)
  const eegRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const timeRef = useRef(0)
  timeRef.current = time

  // 切换剪辑时归零并暂停
  useEffect(() => {
    setTime(0)
    setPlaying(false)
  }, [selectedClipId])

  const redraw = useCallback(
    (t: number) => {
      const sceneCtx = sceneRef.current?.getContext('2d')
      const eegCtx = eegRef.current?.getContext('2d')
      if (sceneCtx) drawScene(sceneCtx, t, Math.max(1, duration), faceBlur)
      if (eegCtx) drawEEG(eegCtx, t, Math.max(1, duration))
    },
    [duration, faceBlur],
  )

  // 播放循环：按真实时间推进 time，到末尾自动暂停；暂停/拖拽时也实时重绘
  useEffect(() => {
    if (!selected) return
    if (!playing) {
      redraw(timeRef.current)
      return
    }
    const tick = (ts: number): void => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const delta = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      let next = timeRef.current + delta
      if (next >= duration) {
        next = duration
        setPlaying(false)
      }
      timeRef.current = next
      setTime(next)
      redraw(next)
      if (next < duration) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      lastTsRef.current = null
    }
  }, [playing, duration, selected, redraw])

  const recOn = playing

  return (
    <div className="grid h-full min-h-0 grid-cols-[1fr_240px] gap-3">
      <section className="flex min-h-0 flex-col rounded-md border border-border-default bg-bg-2 p-3">
        {selected ? (
          <>
            <div className="relative overflow-hidden rounded border border-border-subtle bg-black">
              <canvas ref={sceneRef} width={SCENE_W} height={SCENE_H} className="block w-full" style={{ aspectRatio: '16 / 9' }} />
              {/* 叠加层：REC / 时间戳 / 夜视标记 */}
              <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 font-mono text-xs">
                <span className={`h-2.5 w-2.5 rounded-full ${recOn ? 'animate-pulse bg-danger' : 'bg-text-muted'}`} />
                <span className={recOn ? 'text-danger' : 'text-text-muted'}>{recOn ? 'REC' : 'PAUSE'}</span>
              </div>
              <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-[#9be8b4]">
                {new Date((selected.startAt ?? 0) + time * 1000).toLocaleTimeString('zh-CN', { hour12: false })}
              </div>
              <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-[#9be8b4]">
                NIGHT VISION · CAM-01 · 卧室{faceBlur ? ' · 打码' : ''}
              </div>
            </div>

            {/* 播放控制 */}
            <div className="mt-2 flex items-center gap-2">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-3 transition-transform active:scale-95"
                onClick={() => {
                  if (time >= duration) {
                    setTime(0)
                    timeRef.current = 0
                  }
                  lastTsRef.current = null
                  setPlaying((value) => !value)
                }}
                title={playing ? '暂停' : '播放'}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-3 transition-transform active:scale-95"
                onClick={() => {
                  setPlaying(false)
                  setTime(0)
                  timeRef.current = 0
                  redraw(0)
                }}
                title="回到开头"
              >
                <RotateCcw size={15} />
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                step={0.1}
                value={time}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  setPlaying(false)
                  setTime(next)
                  timeRef.current = next
                  redraw(next)
                }}
                className="h-1 flex-1 accent-[color:var(--accent)]"
              />
              <span className="w-20 text-right font-mono text-xs text-text-secondary">
                {formatClock(time)} / {formatClock(duration)}
              </span>
            </div>

            {/* 同步 EEG 缩略波形 */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span>同步 EEG 缩略波形（视频 + 脑电同步回放）</span>
                <span className="text-danger">▮ 红线＝当前帧</span>
              </div>
              <canvas ref={eegRef} width={EEG_W} height={EEG_H} className="block w-full rounded border border-border-subtle" />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-secondary">暂无可用片段</div>
        )}
      </section>

      <section className="flex min-h-0 flex-col rounded-md border border-border-default bg-bg-2 p-3">
        <div className="mb-2 text-sm font-semibold">已保存的事件视频片段（最近 7 天）</div>
        <div className="flex-1 space-y-2 overflow-auto text-xs">
          {clips.length === 0 ? (
            <div className="text-text-secondary">暂无录制片段</div>
          ) : (
            clips.map((clip) => {
              const active = selected?.id === clip.id
              return (
                <div key={clip.id} className={`rounded border px-2 py-2 ${active ? 'border-accent bg-accent/10' : 'border-border-default bg-bg-3/50'}`}>
                  <button className="w-full text-left" onClick={() => onSelect(clip.id)}>
                    <div className="flex items-center justify-between">
                      <span>{clip.thumbnail} {new Date(clip.startAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-mono">{formatClock(clip.durationSec)}</span>
                    </div>
                    <div className="mt-1 text-text-secondary">{clip.eventId ? '关联发作事件' : '可疑事件'} · {clip.source === 'mock' ? '演示录制' : '摄像头'}</div>
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded border border-border-default px-2 py-0.5 transition-transform active:scale-95" onClick={() => onSelect(clip.id)}>
                      ▶ 回放
                    </button>
                    {onDelete && (
                      <button className="flex items-center gap-1 rounded border border-danger/50 px-2 py-0.5 text-danger transition-transform active:scale-95" onClick={() => onDelete(clip.id)}>
                        <Trash2 size={12} /> 删除
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
