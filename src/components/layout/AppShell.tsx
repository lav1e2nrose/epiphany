import { AnimatePresence, motion } from 'framer-motion'
import { ActivitySquare, BookOpen, ClipboardList, FileText, HeartPulse, History, LayoutGrid, MapPinned, Settings, Siren, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'
import type { Portal } from '../../types/user'
import { Sidebar, type NavItem } from './Sidebar'
import { TitleBar } from './TitleBar'
import { SettingsPage } from '../../pages/SettingsPage'
import { LiveDashboard } from '../../portals/patient/LiveDashboard'
import { LifeLog } from '../../portals/patient/LifeLog'
import { HealthClass } from '../../portals/patient/HealthClass'
import { RemoteMonitor } from '../../portals/guardian/RemoteMonitor'
import { AlertSystem } from '../../portals/guardian/AlertSystem'
import { HistoryTrack } from '../../portals/guardian/HistoryTrack'
import { PatientManagement } from '../../portals/doctor/PatientManagement'
import { SeizureHeatmapPage } from '../../portals/doctor/SeizureHeatmapPage'
import { WaveformReview } from '../../portals/doctor/WaveformReview'
import { ReportGenerator } from '../../portals/doctor/ReportGenerator'

function portalNav(portal: Portal): NavItem[] {
  if (portal === 'patient') {
    return [
      { key: 'live', label: '实时动态', icon: <ActivitySquare size={16} /> },
      { key: 'log', label: '生活日志', icon: <ClipboardList size={16} /> },
      { key: 'class', label: '健康课堂', icon: <BookOpen size={16} /> },
      { key: 'settings', label: '设置', icon: <Settings size={16} /> },
    ]
  }
  if (portal === 'guardian') {
    return [
      { key: 'monitor', label: '远程监控', icon: <HeartPulse size={16} /> },
      { key: 'alert', label: '报警设置', icon: <Siren size={16} /> },
      { key: 'history', label: '历史轨迹', icon: <History size={16} /> },
      { key: 'settings', label: '设置', icon: <Settings size={16} /> },
    ]
  }
  return [
    { key: 'patients', label: '患者管理', icon: <Users size={16} /> },
    { key: 'heatmap', label: '病情热力图', icon: <LayoutGrid size={16} /> },
    { key: 'review', label: '波形回溯', icon: <MapPinned size={16} /> },
    { key: 'report', label: '报告生成', icon: <FileText size={16} /> },
    { key: 'settings', label: '设置', icon: <Settings size={16} /> },
  ]
}

export function AppShell(): JSX.Element {
  const currentPortal = useAppStore((state) => state.currentPortal)
  const [activePage, setActivePage] = useState('live')
  const nav = useMemo(() => portalNav(currentPortal), [currentPortal])

  const page = useMemo(() => {
    const key = activePage || nav[0]?.key
    if (key === 'settings') return <SettingsPage />
    if (currentPortal === 'patient') {
      if (key === 'log') return <LifeLog />
      if (key === 'class') return <HealthClass />
      return <LiveDashboard />
    }
    if (currentPortal === 'guardian') {
      if (key === 'alert') return <AlertSystem />
      if (key === 'history') return <HistoryTrack />
      return <RemoteMonitor />
    }
    if (key === 'heatmap') return <SeizureHeatmapPage />
    if (key === 'review') return <WaveformReview />
    if (key === 'report') return <ReportGenerator />
    return <PatientManagement />
  }, [activePage, currentPortal, nav])

  return (
    <div className="flex h-screen flex-col bg-bg-0 text-text-primary">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar items={nav} activeKey={activePage} onSelect={setActivePage} />
        <main className="min-h-0 flex-1 overflow-hidden p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentPortal}-${activePage}`}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {page}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
