import { useMemo } from 'react'
import { useAppStore } from '../../store'
import type { MonitoringMode } from '../../types/user'

const modeConfig: Record<MonitoringMode, { icon: string; label: string; className: string }> = {
  daytime: { icon: '☀', label: '日间监测', className: 'border-accent/40 bg-accent/10 text-accent' },
  sleep: { icon: '🌙', label: '睡眠监测', className: 'border-[#4C6FFF]/40 bg-[#4C6FFF]/15 text-[#8EA8FF]' },
  inpatient: { icon: '🏥', label: '院内监测', className: 'border-danger/40 bg-danger/10 text-danger' },
}

export function MonitoringModeBadge(): JSX.Element {
  const monitoringMode = useAppStore((state) => state.monitoringMode)
  const setMonitoringMode = useAppStore((state) => state.setMonitoringMode)
  const current = modeConfig[monitoringMode]
  const hint = useMemo(
    () =>
      monitoringMode === 'inpatient'
        ? '院内模式启用实时覆盖提醒。'
        : monitoringMode === 'sleep'
          ? '睡眠模式偏向夜间回顾记录。'
          : '日间模式用于日常监测。',
    [monitoringMode],
  )

  return (
    <div className="no-drag group relative">
      <button
        className={`rounded-full border px-2 py-1 text-xs ${current.className}`}
        onClick={() => setMonitoringMode(monitoringMode === 'daytime' ? 'sleep' : monitoringMode === 'sleep' ? 'inpatient' : 'daytime')}
        title="点击切换监测模式"
      >
        {current.icon} {current.label}
      </button>
      <div className="pointer-events-none absolute left-1/2 top-8 hidden -translate-x-1/2 rounded border border-border-default bg-bg-2 px-2 py-1 text-[11px] text-text-secondary group-hover:block">
        {hint}
      </div>
    </div>
  )
}
