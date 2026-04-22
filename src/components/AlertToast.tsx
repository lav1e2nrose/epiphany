import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useAppStore } from '../store'

export function AlertToast(): JSX.Element {
  const alerts = useAppStore((state) => state.alerts)
  const dismiss = useAppStore((state) => state.dismissAlert)

  useEffect(() => {
    const timers = alerts
      .filter((alert) => !alert.sticky)
      .map((alert) => window.setTimeout(() => dismiss(alert.id), 4000))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [alerts, dismiss])

  return (
    <div className="fixed right-4 top-14 z-[5000] space-y-2">
      <AnimatePresence>
        {alerts.slice(-3).map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 140, opacity: 0 }}
            className="w-80 rounded-md border border-border-default bg-bg-2 p-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{alert.title}</div>
                <div className="mt-1 text-xs text-text-secondary">{alert.message}</div>
              </div>
              <button onClick={() => dismiss(alert.id)}>×</button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
