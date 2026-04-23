import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertToast } from './components/AlertToast'
import { EmergencyOverlay } from './components/EmergencyOverlay'
import { MockModeBanner } from './components/MockModeBanner'
import { AppShell } from './components/layout/AppShell'
import { MOTION_TRANSITION_FAST } from './constants/motion'
import { LoginScreen } from './pages/LoginScreen'
import { useAppStore } from './store'

const DEFAULT_EMERGENCY_COORDS = { lat: 31.197, lng: 121.436 }
const DEFAULT_EMERGENCY_LOCATION = '上海市徐汇区'

export default function App(): JSX.Element {
  const currentUser = useAppStore((state) => state.currentUser)
  const currentPortal = useAppStore((state) => state.currentPortal)
  const alerts = useAppStore((state) => state.alerts)
  const dismissAlert = useAppStore((state) => state.dismissAlert)
  const updateEventHandling = useAppStore((state) => state.updateEventHandling)
  const hydratePersistedState = useAppStore((state) => state.hydratePersistedState)
  const riskScore = useAppStore((state) => state.riskScore)
  const emergencyAlert = useMemo(
    () => [...alerts].reverse().find((alert) => alert.sticky && (alert.type === 'error' || alert.type === 'sos')) ?? null,
    [alerts],
  )

  useEffect(() => {
    if (!window.epiphany?.getPersistedState) return
    void window.epiphany
      .getPersistedState()
      .then((persisted) => hydratePersistedState(persisted))
      .catch(() => undefined)
  }, [hydratePersistedState])

  return (
    <div>
      <AnimatePresence mode="wait">
        {!currentUser ? (
          <motion.div
            key="login-screen"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={MOTION_TRANSITION_FAST}
          >
            <LoginScreen />
          </motion.div>
        ) : (
          <motion.div
            key="main-shell"
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <MockModeBanner />
            <AppShell />
          </motion.div>
        )}
      </AnimatePresence>
      <AlertToast />
      <EmergencyOverlay
        visible={Boolean(currentUser && currentPortal === 'guardian' && emergencyAlert)}
        title={emergencyAlert?.type === 'sos' ? 'SOS 紧急求助' : '高危报警'}
        message={emergencyAlert?.message}
        locationText={DEFAULT_EMERGENCY_LOCATION}
        riskScore={riskScore}
        onNavigate={() => window.open(`https://maps.google.com/?q=${DEFAULT_EMERGENCY_COORDS.lat},${DEFAULT_EMERGENCY_COORDS.lng}`, '_blank')}
        onClose={() => {
          if (!emergencyAlert) return
          dismissAlert(emergencyAlert.id)
          if (emergencyAlert.linkedEventId) {
            updateEventHandling(emergencyAlert.linkedEventId, 'resolved')
          }
        }}
      />
    </div>
  )
}
