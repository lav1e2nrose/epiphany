import type { RiskState } from '../types/signal'

interface Props {
  score: number
  state: RiskState
  confidence: number
}

const stateText: Record<RiskState, string> = {
  safe: '状态安全 ✓',
  warning: '检测到异常 ⚠',
  seizure: '发作期 ✕',
  recovery: '恢复中',
  emergency: '紧急状态',
}

export function StatusOrb({ score, state, confidence }: Props): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border-default bg-bg-2 p-6">
      <div className={`status-orb ${state === 'safe' ? 'safe' : state === 'warning' ? 'warning' : 'seizure'}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-4xl font-bold">{Math.round(score)}</div>
          <div className="text-sm text-text-secondary">{state.toUpperCase()}</div>
        </div>
      </div>
      <div className="text-sm">{stateText[state]}</div>
      <div className="font-mono text-xs text-text-secondary">持续监测中 · 02:14:37</div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-3">
        <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(confidence * 100)}%` }} />
      </div>
    </div>
  )
}
