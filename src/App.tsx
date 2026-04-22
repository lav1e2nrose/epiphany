import { useMemo } from 'react'
import { AlertToast } from './components/AlertToast'
import { MockModeBanner } from './components/MockModeBanner'
import { AppShell } from './components/layout/AppShell'
import { LoginScreen } from './pages/LoginScreen'
import { useAppStore } from './store'

export default function App(): JSX.Element {
  const currentUser = useAppStore((state) => state.currentUser)

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
    </div>
  )
}
