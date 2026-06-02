import { ChannelStatusBadge } from '../../components/ChannelStatusBadge'
import { ChatWindow } from '../../components/chat/ChatWindow'
import { useAppStore } from '../../store'
import type { ChatMessage } from '../../types/clinical'

const EMPTY_MESSAGES: ChatMessage[] = []

export function DoctorChat(): JSX.Element {
  const patientId = useAppStore((state) => state.currentUser?.id ?? 'p1')
  const channel = useAppStore((state) => state.chatChannels[patientId])
  const messages = useAppStore((state) => state.chatMessages[patientId] ?? EMPTY_MESSAGES)
  const sendChatMessage = useAppStore((state) => state.sendChatMessage)

  if (!channel || channel.status === 'closed') {
    return (
      <div className="rounded-md border border-border-default bg-bg-2 p-4 text-sm">
        <div className="mb-2"><ChannelStatusBadge channel={channel} /></div>
        <div className="rounded border border-border-default bg-bg-3 p-4">
          ✉ 医生沟通通道当前关闭。
          <div className="mt-2 text-text-secondary">您可以将内容记录在【智能日志】，复诊时由医生回顾。紧急情况请前往急诊。</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">医生沟通 <ChannelStatusBadge channel={channel} /></div>
        <div className="text-xs text-text-secondary">医生 · 在线/离线（演示）</div>
      </div>
      <ChatWindow
        currentUserRole="patient"
        messages={messages}
        disabled={channel.status !== 'open'}
        onSend={(content) =>
          sendChatMessage({
            id: `msg-${Date.now()}`,
            patientId,
            doctorId: channel.doctorId,
            sender: 'patient',
            type: 'text',
            content,
            timestamp: Date.now(),
            read: false,
          })
        }
      />
    </div>
  )
}
