interface Props {
  visible: boolean
  onRecord: () => void
  onLater: () => void
}

export function RecordPromptBanner({ visible, onRecord, onLater }: Props): JSX.Element | null {
  if (!visible) return null

  return (
    <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div>📝 检测到一次事件待补充记录</div>
          <div className="text-xs text-text-secondary">花 2 分钟描述发作前后情况，有助于医生准确诊断。</div>
        </div>
        <div className="flex gap-2 text-xs">
          <button className="rounded border border-accent/60 px-2 py-1" onClick={onRecord}>立即记录</button>
          <button className="rounded border border-border-default px-2 py-1" onClick={onLater}>稍后</button>
        </div>
      </div>
    </div>
  )
}
