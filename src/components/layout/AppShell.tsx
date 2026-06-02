import { motion } from 'framer-motion'
import {
  ActivitySquare,
  BookOpen,
  ClipboardList,
  FileText,
  HeartPulse,
  History,
  LayoutGrid,
  MapPinned,
  MessageSquare,
  Settings,
  Siren,
  Users,
  Video,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import type { Portal } from '../../types/user'
import { Sidebar, type NavItem } from './Sidebar'
import { TitleBar } from './TitleBar'
import { EmergencyOverlay } from '../EmergencyOverlay'
import { SettingsPage } from '../../pages/SettingsPage'
import { LiveDashboard } from '../../portals/patient/LiveDashboard'
import { HealthClass } from '../../portals/patient/HealthClass'
import { MyProfile } from '../../portals/patient/MyProfile'
import { SmartLog } from '../../portals/patient/SmartLog'
import { SeizureReview } from '../../portals/patient/SeizureReview'
import { DoctorChat } from '../../portals/patient/DoctorChat'
import { RemoteMonitor } from '../../portals/guardian/RemoteMonitor'
import { AlertSystem } from '../../portals/guardian/AlertSystem'
import { HistoryTrack } from '../../portals/guardian/HistoryTrack'
import { VideoLink } from '../../portals/guardian/VideoLink'
import { PatientArchiveCenter } from '../../portals/doctor/PatientArchiveCenter'
import { SeizureHeatmapPage } from '../../portals/doctor/SeizureHeatmapPage'
import { WaveformReview } from '../../portals/doctor/WaveformReview'
import { ReportGenerator } from '../../portals/doctor/ReportGenerator'
import { AISummaryPage } from '../../portals/doctor/AISummaryPage'
import { DoctorChatCenter } from '../../portals/doctor/DoctorChatCenter'
import { makePageVariants, MOTION_TRANSITION_FAST } from '../../constants/motion'

function portalNav(portal: Portal): NavItem[] {
  if (portal === 'patient') {
    return [
      { key: 'live', label: '实时动态', icon: <ActivitySquare size={16} /> },
      { key: 'profile', label: '我的档案', icon: <Users size={16} /> },
      { key: 'smart-log', label: '智能日志', icon: <ClipboardList size={16} /> },
      { key: 'review', label: '发作回顾', icon: <History size={16} /> },
      { key: 'doctor-chat', label: '医生沟通', icon: <MessageSquare size={16} /> },
      { key: 'class', label: '健康课堂', icon: <BookOpen size={16} /> },
      { key: 'settings', label: '设置', icon: <Settings size={16} /> },
    ]
  }
  if (portal === 'guardian') {
    return [
      { key: 'monitor', label: '远程监控', icon: <HeartPulse size={16} /> },
      { key: 'video', label: '视频联动', icon: <Video size={16} /> },
      { key: 'alert', label: '报警设置', icon: <Siren size={16} /> },
      { key: 'history', label: '历史轨迹', icon: <History size={16} /> },
      { key: 'settings', label: '设置', icon: <Settings size={16} /> },
    ]
  }
  return [
    { key: 'patients', label: '患者档案中心', icon: <Users size={16} /> },
    { key: 'heatmap', label: '病情热力图', icon: <LayoutGrid size={16} /> },
    { key: 'review', label: '波形回溯', icon: <MapPinned size={16} /> },
    { key: 'ai-summary', label: 'AI 智能小结', icon: <ClipboardList size={16} /> },
    { key: 'doctor-chat', label: '医患沟通', icon: <MessageSquare size={16} /> },
    { key: 'report', label: '报告生成', icon: <FileText size={16} /> },
    { key: 'settings', label: '设置', icon: <Settings size={16} /> },
  ]
}

export function AppShell(): JSX.Element {
  const currentPortal = useAppStore((state) => state.currentPortal)
  const monitoringMode = useAppStore((state) => state.monitoringMode)
  const requestedPage = useAppStore((state) => state.requestedPage)
  const consumeRequestedPage = useAppStore((state) => state.consumeRequestedPage)
  const alerts = useAppStore((state) => state.alerts)
  const updateAlertHandling = useAppStore((state) => state.updateAlertHandling)
  const [activePage, setActivePage] = useState('live')
  const [pageDirection, setPageDirection] = useState<1 | -1>(1)
  const activePageRef = useRef(activePage)
  activePageRef.current = activePage
  const nav = useMemo(() => portalNav(currentPortal), [currentPortal])

  useEffect(() => {
    const fallback = nav[0]?.key
    if (fallback) {
      setPageDirection(1)
      setActivePage(fallback)
    }
  }, [nav])

  useEffect(() => {
    if (!requestedPage) return
    if (nav.some((item) => item.key === requestedPage)) {
      const newIndex = nav.findIndex((item) => item.key === requestedPage)
      const oldIndex = nav.findIndex((item) => item.key === activePageRef.current)
      setPageDirection(newIndex >= oldIndex ? 1 : -1)
      setActivePage(requestedPage)
    }
    consumeRequestedPage()
  }, [consumeRequestedPage, nav, requestedPage])

  const guardianEmergency = useMemo(
    () =>
      currentPortal === 'guardian'
        ? (alerts.find((alert) => alert.type === 'error' && alert.sticky === true && alert.handlingStatus === 'pending') ?? null)
        : null,
    [alerts, currentPortal],
  )

  const handleSelect = useCallback(
    (key: string) => {
      const newIndex = nav.findIndex((item) => item.key === key)
      const oldIndex = nav.findIndex((item) => item.key === activePageRef.current)
      setPageDirection(newIndex >= oldIndex ? 1 : -1)
      setActivePage(key)
    },
    [nav],
  )

  const handleGuardianEmergencyClose = useCallback(() => {
    if (guardianEmergency) {
      updateAlertHandling(guardianEmergency.id, 'acknowledged')
    }
  }, [guardianEmergency, updateAlertHandling])

  const page = useMemo(() => {
    const key = activePage || nav[0]?.key
    if (key === 'settings') return <SettingsPage />
    if (currentPortal === 'patient') {
      if (key === 'profile') return <MyProfile />
      if (key === 'smart-log') return <SmartLog />
      if (key === 'review') return <SeizureReview />
      if (key === 'doctor-chat') return <DoctorChat />
      if (key === 'class') return <HealthClass />
      return <LiveDashboard />
    }
    if (currentPortal === 'guardian') {
      if (key === 'video') return <VideoLink />
      if (key === 'alert') return <AlertSystem />
      if (key === 'history') return <HistoryTrack />
      return <RemoteMonitor />
    }
    if (key === 'heatmap') return <SeizureHeatmapPage />
    if (key === 'review') return <WaveformReview />
    if (key === 'ai-summary') return <AISummaryPage />
    if (key === 'doctor-chat') return <DoctorChatCenter />
    if (key === 'report') return <ReportGenerator />
    return <PatientArchiveCenter />
  }, [activePage, currentPortal, nav])

  return (
    <div className={`flex h-screen flex-col bg-bg-0 text-text-primary ${monitoringMode === 'sleep' ? 'text-[15px]' : ''}`}>
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar items={nav} activeKey={activePage} onSelect={handleSelect} />
        <main className={`min-h-0 flex-1 overflow-hidden p-4 ${monitoringMode === 'sleep' ? 'bg-[#090d16]' : ''}`}>
          {/* 页面切换采用「按 key 重挂载 + 方向感知进入动画」，不使用 AnimatePresence(mode="wait")：
              后者在频繁重渲染或进入某些页面（如视频联动）时会出现 exit 卡死、新页面永不挂载的问题。
              这里去掉 exit 依赖，切换即时生效，仍保留前进/后退方向的 slide+fade 进场动画。 */}
          <motion.div
            key={`${currentPortal}-${activePage}`}
            variants={makePageVariants(pageDirection)}
            initial="initial"
            animate="animate"
            transition={MOTION_TRANSITION_FAST}
            className="h-full"
          >
            {page}
          </motion.div>
        </main>
      </div>
      {currentPortal === 'guardian' && monitoringMode === 'inpatient' && (
        <EmergencyOverlay
          visible={guardianEmergency !== null}
          onClose={handleGuardianEmergencyClose}
          title="检测到发作事件 · 已联动录制"
          message="事件已记录，建议先查看视频联动片段并联系患者。"
        />
      )}
    </div>
  )
}
