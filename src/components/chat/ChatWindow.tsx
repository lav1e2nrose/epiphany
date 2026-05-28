import { useMemo, useState } from 'react'
import type { ChatMessage } from '../../types/clinical'

interface Props {
  currentUserRole: 'patient' | 'doctor'
  messages: ChatMessage[]
  disabled?: boolean
  onSend: (content: string) => void
}

export function ChatWindow({ currentUserRole, messages, disabled = false, onSend }: Props): JSX.Element {
  const [draft, setDraft] = useState('')
  const sorted = useMemo(() => [...messages].sort((a, b) => a.timestamp - b.timestamp), [messages])

  return (
    <div className="flex h-full flex-col rounded-md border border-border-default bg-bg-2">
      <div className="border-b border-border-subtle px-3 py-2 text-xs text-text-secondary">本通道非紧急通道，紧急情况请拨打 120</div>
      <div className="flex-1 space-y-2 overflow-auto p-3 text-sm">
        {sorted.length === 0 ? (
          <div className="text-text-secondary">暂无消息</div>
        ) : (
          sorted.map((message) => (
            <div key={message.id} className={`max-w-[80%] rounded px-2 py-1 ${message.sender === currentUserRole ? 'ml-auto bg-[var(--chat-bubble-patient)]' : 'bg-[var(--chat-bubble-doctor)]'}`}>
              <div>{message.content}</div>
              <div className="mt-1 text-[10px] text-text-secondary">{new Date(message.timestamp).toLocaleString('zh-CN')}</div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2 border-t border-border-subtle p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={disabled}
          placeholder={disabled ? '当前通道不可发送消息' : '输入消息...'}
          className="flex-1 rounded border border-border-default bg-bg-3 px-2 py-1"
        />
        <button
          className="rounded border border-accent/60 px-3 py-1 text-xs disabled:opacity-50"
          disabled={disabled || !draft.trim()}
          onClick={() => {
            onSend(draft.trim())
            setDraft('')
          }}
        >
          发送
        </button>
      </div>
    </div>
  )
}
