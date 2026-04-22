import { useMemo } from 'react'
import { AlertToast } from './components/AlertToast'
import { EmergencyOverlay } from './components/EmergencyOverlay'
import { MockModeBanner } from './components/MockModeBanner'
import { AppShell } from './components/layout/AppShell'
import { LoginScreen } from './pages/LoginScreen'
import { useAppStore } from './store'

const DEFAULT_EMERGENCY_COORDS = { lat: 31.197, lng: 121.436 }
const DEFAULT_EMERGENCY_LOCATION = '上海市徐汇区'

export default function App(): JSX.Element {
  const currentUser = useAppStore((state) => state.currentUser)
  const currentPortal = useAppStore((state) => state.currentPortal)
  const alerts = useAppStore((state) => state.alerts)
  const dismissAlert = useAppStore((state) => state.dismissAlert)
  const riskScore = useAppStore((state) => state.riskScore)
  const emergencyAlert = useMemo(
    () => [...alerts].reverse().find((alert) => alert.sticky && (alert.type === 'error' || alert.type === 'sos')) ?? null,
    [alerts],
  )

  const content = useMemo(() => {
    if (!currentUser) return <LoginScreen />
    return (
      <>
        <MockModeBanner />
        <AppShell />
      </>
    )
  }, [currentUser])

  return (
    <div>
      {content}
      <AlertToast />
      <EmergencyOverlay
        visible={Boolean(currentUser && currentPortal === 'guardian' && emergencyAlert)}
        title={emergencyAlert?.type === 'sos' ? 'SOS 紧急求助' : '高危报警'}
        message={emergencyAlert?.message}
        locationText={DEFAULT_EMERGENCY_LOCATION}
        riskScore={riskScore}
        onNavigate={() => window.open(`https://maps.google.com/?q=${DEFAULT_EMERGENCY_COORDS.lat},${DEFAULT_EMERGENCY_COORDS.lng}`, '_blank')}
        onClose={() => emergencyAlert && dismissAlert(emergencyAlert.id)}
      />
    </div>
  )
}
