import { motion } from 'framer-motion'
import { Activity, Minus, MonitorUp, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import { PortalSwitcher } from './PortalSwitcher'

export function TitleBar(): JSX.Element {
  const connectionStatus = useAppStore((state) => state.connectionStatus)
  const latestFrame = useAppStore((state) => state.latestFrame)
  const [connFlashKey, setConnFlashKey] = useState(0)
  const prevStatusRef = useRef(connectionStatus)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = connectionStatus
    if (
      (connectionStatus === 'connected' || connectionStatus === 'mock') &&
      prev !== 'connected' &&
      prev !== 'mock'
    ) {
      setConnFlashKey((k) => k + 1)
    }
  }, [connectionStatus])

  const isConnected = connectionStatus === 'connected' || connectionStatus === 'mock'
  const isError = connectionStatus === 'error'
  const stableColor = isConnected ? '#2EA043' : isError ? '#F85149' : '#484F58'

  return (
    <header className="title-bar flex h-10 items-center justify-between border-b border-border-subtle bg-bg-1 px-3">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-accent" />
        <div className="font-display text-sm font-semibold tracking-wider">灵犀妙探</div>
      </div>

      <div className="flex items-center gap-3">
        <PortalSwitcher />
        <div className="flex items-center gap-2 rounded-md border border-border-default px-2 py-1 text-xs">
          <motion.span
            key={connFlashKey}
            className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse' : isError ? 'animate-fast-pulse' : ''}`}
            initial={{ backgroundColor: '#484F58' }}
            animate={{
              backgroundColor:
                connFlashKey > 0 && isConnected
                  ? ['#484F58', '#4ADE80', stableColor]
                  : [stableColor],
            }}
            transition={{ duration: 0.6 }}
          />
          <span className="font-mono">LIVE</span>
        </div>
        <div className="rounded-md border border-border-default px-2 py-1 text-xs text-text-secondary">
          {connectionStatus.toUpperCase()} · {Math.round(latestFrame?.batteryLevel ?? 0)}%
        </div>
      </div>

      <div className="no-drag flex items-center gap-1">
        <button className="window-btn" onClick={() => void window.epiphany?.windowAction('minimize')}>
          <Minus size={14} />
        </button>
        <button className="window-btn" onClick={() => void window.epiphany?.windowAction('maximize')}>
          <MonitorUp size={14} />
        </button>
        <button className="window-btn hover:bg-danger/20" onClick={() => void window.epiphany?.windowAction('close')}>
          <X size={14} />
        </button>
      </div>
    </header>
  )
}
