import { useEffect, useRef, useState } from 'react'
import type { RiskState } from '../types/signal'

interface Props {
  score: number
  state: RiskState
  confidence: number
  elapsedSeconds?: number
}

const stateText: Record<RiskState, string> = {
  safe: '状态安全 ✓',
  warning: '检测到异常 ⚠',
  seizure: '发作期 ✕',
  recovery: '恢复中 ↩',
  emergency: '紧急状态 ‼',
}

function orbClass(state: RiskState): string {
  if (state === 'safe') return 'safe'
  if (state === 'warning') return 'warning'
  if (state === 'recovery') return 'recovery'
  if (state === 'emergency') return 'emergency'
  return 'seizure'
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** Brief opacity flash whenever a numeric value changes — 0.6 → 1 over 100 ms */
function useFlash(value: number): boolean {
  const [flashing, setFlashing] = useState(false)
  const prevRef = useRef(value)
  useEffect(() => {
    if (prevRef.current === value) return
    prevRef.current = value
    setFlashing(true)
    const t = window.setTimeout(() => setFlashing(false), 100)
    return () => window.clearTimeout(t)
  }, [value])
  return flashing
}

export function StatusOrb({ score, state, confidence, elapsedSeconds = 0 }: Props): JSX.Element {
  const scoreFlash = useFlash(Math.round(score))

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-default bg-bg-2 p-6">
      <div className={`status-orb ${orbClass(state)}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="font-mono text-4xl font-bold transition-opacity duration-100"
            style={{ opacity: scoreFlash ? 0.6 : 1 }}
          >
            {Math.round(score)}
          </div>
          <div className="text-sm text-text-secondary">{state.toUpperCase()}</div>
        </div>
      </div>
      <div className="text-sm">{stateText[state]}</div>
      <div className="font-mono text-xs text-text-secondary">
        持续监测中 · {formatElapsed(elapsedSeconds)}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-3">
        <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(confidence * 100)}%` }} />
      </div>
    </div>
  )
}
