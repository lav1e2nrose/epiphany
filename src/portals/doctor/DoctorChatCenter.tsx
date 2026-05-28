import { useMemo, useState } from 'react'
import { ChatWindow } from '../../components/chat/ChatWindow'
import { useAppStore } from '../../store'

export function DoctorChatCenter(): JSX.Element {
  const patients = useAppStore((state) => state.patients)
  const chatChannels = useAppStore((state) => state.chatChannels)
  const chatMessages = useAppStore((state) => state.chatMessages)
  const toggleChatChannel = useAppStore((state) => state.toggleChatChannel)
  const sendChatMessage = useAppStore((state) => state.sendChatMessage)
  const [activePatientId, setActivePatientId] = useState<string>(patients[0]?.id ?? 'p1')

  const channel = chatChannels[activePatientId]
  const messages = useMemo(() => chatMessages[activePatientId] ?? [], [activePatientId, chatMessages])

  return (
    <div className="grid h-full grid-cols-[280px_1fr] gap-3 overflow-auto">
      <aside className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">患者会话</span>
          <button className="rounded border border-border-default px-2 py-1 text-[11px]" onClick={() => patients.filter((patient) => (chatMessages[patient.id] ?? []).length === 0).forEach((patient) => toggleChatChannel(patient.id, 'closed', '30 天无消息自动关闭'))}>批量关闭非活跃</button>
        </div>
        <div className="space-y-1">
          {patients.map((patient) => (
            <button key={patient.id} className={`w-full rounded border px-2 py-2 text-left ${activePatientId === patient.id ? 'border-accent bg-accent/10' : 'border-border-default bg-bg-3/50'}`} onClick={() => setActivePatientId(patient.id)}>
              <div className="flex items-center justify-between">
                <span>{patient.name}</span>
                <span className="text-xs">{chatChannels[patient.id]?.status ?? 'closed'}</span>
              </div>
              <div className="text-xs text-text-secondary">{(chatMessages[patient.id] ?? []).at(-1)?.content ?? '暂无消息'}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="grid h-full grid-rows-[auto_1fr] gap-2">
        <div className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>{patients.find((patient) => patient.id === activePatientId)?.name ?? activePatientId} · 通道 {channel?.status ?? 'closed'}</div>
            <div className="flex gap-2 text-xs">
              <button className="rounded border border-safe/60 px-2 py-1" onClick={() => toggleChatChannel(activePatientId, 'open')}>开启</button>
              <button className="rounded border border-warn/60 px-2 py-1" onClick={() => toggleChatChannel(activePatientId, 'readonly', '阶段性只读')}>只读</button>
              <button className="rounded border border-danger/60 px-2 py-1" onClick={() => toggleChatChannel(activePatientId, 'closed', '已制定治疗方案')}>关闭</button>
            </div>
          </div>
        </div>
        <ChatWindow
          currentUserRole="doctor"
          messages={messages}
          disabled={(channel?.status ?? 'closed') !== 'open'}
          onSend={(content) =>
            sendChatMessage({
              id: `msg-${Date.now()}`,
              patientId: activePatientId,
              doctorId: channel?.doctorId ?? 'doc-1',
              sender: 'doctor',
              type: 'text',
              content,
              timestamp: Date.now(),
              read: false,
            })
          }
        />
      </section>
    </div>
  )
}
