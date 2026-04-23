import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store'
import { MOTION_TOAST_VARIANTS, MOTION_TRANSITION_FAST } from '../constants/motion'

const TOAST_LIFETIME = 4000

function toneClass(type: 'info' | 'warning' | 'error' | 'success' | 'sos'): string {
  if (type === 'error' || type === 'sos') return 'border-danger/60'
  if (type === 'warning') return 'border-warn/60'
  if (type === 'success') return 'border-safe/60'
  return 'border-border-default'
}

function progressClass(type: 'info' | 'warning' | 'error' | 'success' | 'sos'): string {
  if (type === 'error' || type === 'sos') return 'bg-danger'
  if (type === 'warning') return 'bg-warn'
  if (type === 'success') return 'bg-safe'
  return 'bg-accent'
}

export function AlertToast(): JSX.Element {
  const alerts = useAppStore((state) => state.alerts)
  const dismiss = useAppStore((state) => state.dismissAlert)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timers = alerts
      .filter((alert) => !alert.sticky)
      .map((alert) => window.setTimeout(() => dismiss(alert.id), TOAST_LIFETIME))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [alerts, dismiss])

  useEffect(() => {
    if (!alerts.some((alert) => !alert.sticky)) return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [alerts])

  const visibleAlerts = useMemo(() => alerts.slice(-3), [alerts])

  return (
    <div className="fixed right-4 top-14 z-[5000] space-y-2">
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            variants={MOTION_TOAST_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={MOTION_TRANSITION_FAST}
            className={`w-80 rounded-md border bg-bg-2 p-3 ${toneClass(alert.type)}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{alert.title}</div>
                <div className="mt-1 text-xs text-text-secondary">{alert.message}</div>
              </div>
              <button onClick={() => dismiss(alert.id)}>×</button>
            </div>
            {!alert.sticky && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-3">
                <div
                  className={`h-full transition-[width] duration-300 ${progressClass(alert.type)}`}
                  style={{ width: `${Math.max(0, 100 - ((now - alert.timestamp) / TOAST_LIFETIME) * 100)}%` }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
