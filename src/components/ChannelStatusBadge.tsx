import type { ChatChannel } from '../types/clinical'

interface Props {
  channel?: ChatChannel
}

export function ChannelStatusBadge({ channel }: Props): JSX.Element {
  const status = channel?.status ?? 'closed'
  const config =
    status === 'open'
      ? { dot: '●', text: '通道开启', className: 'text-safe border-safe/40 bg-safe/10' }
      : status === 'readonly'
        ? { dot: '⊙', text: '只读模式', className: 'text-warn border-warn/40 bg-warn/10' }
        : { dot: '○', text: '通道关闭', className: 'text-text-secondary border-border-default bg-bg-3/70' }

  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${config.className}`}>{config.dot} {config.text}</span>
}
