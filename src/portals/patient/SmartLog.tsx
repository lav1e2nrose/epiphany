import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { AIInterviewChat } from '../../components/clinical/AIInterviewChat'
import { ThreePhaseRecorder } from '../../components/clinical/ThreePhaseRecorder'
import { useAppStore } from '../../store'
import type { TriggerCategory, TriggerRecord } from '../../types/clinical'

const triggerCategoryLabel: Record<TriggerCategory, string> = {
  sleep_deprivation: '睡眠不足',
  emotional_stress: '情绪压力',
  missed_medication: '漏服药',
  alcohol: '饮酒',
  flashing_light: '闪光刺激',
  fever: '发热',
  menstruation: '经期相关',
  fatigue: '劳累',
  other: '其他',
}

export function SmartLog(): JSX.Element {
  const currentUser = useAppStore((state) => state.currentUser)
  const addSeizureEvent = useAppStore((state) => state.addSeizureEvent)
  const addEvent = useAppStore((state) => state.addEvent)
  const pushAlert = useAppStore((state) => state.pushAlert)
  const [trigger, setTrigger] = useState<TriggerRecord | undefined>()
  const [checkInDone, setCheckInDone] = useState(false)

  // AI 追问完成「确认结构化诱因并写入记录」：即时反馈 + 写入日志 + 带入三段式发作前
  const handleTriggerComplete = (record: TriggerRecord): void => {
    setTrigger(record)
    const label = triggerCategoryLabel[record.category]
    addEvent({
      id: `trigger-${Date.now()}`,
      type: 'manual',
      title: `诱因记录已保存：${label}`,
      timestamp: Date.now(),
      details: record.refinedAnswers.map((answer) => `${answer.question.replace(/[？?]$/, '')}：${answer.answer}`).join(' · '),
      handlingStatus: 'resolved',
    })
    pushAlert({
      id: `trigger-alert-${Date.now()}`,
      type: 'success',
      title: '诱因已结构化并写入记录',
      message: `「${label}」已带入右侧发作记录的「发作前」，可继续补充三段式。`,
      timestamp: Date.now(),
      handlingStatus: 'resolved',
    })
  }

  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-3 overflow-auto">
      <div className="space-y-3">
        <AIInterviewChat onComplete={handleTriggerComplete} />
        <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
          <h3 className="font-semibold">普通日常记录（快速打卡）</h3>
          <p className="mt-1 text-xs text-text-secondary">服药打卡 · 睡眠时长 · 情绪状态，一键记录到今日日志。</p>
          <button
            className="mt-2 flex items-center gap-1 rounded border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs transition-transform active:scale-95"
            onClick={() => {
              addEvent({
                id: `daily-${Date.now()}`,
                type: 'manual',
                title: '快速打卡已保存',
                timestamp: Date.now(),
                details: '服药打卡 + 睡眠 + 情绪已记录',
                handlingStatus: 'resolved',
              })
              pushAlert({
                id: `daily-alert-${Date.now()}`,
                type: 'success',
                title: '快速打卡已保存',
                message: '今日服药/睡眠/情绪已记录到日志。',
                timestamp: Date.now(),
                handlingStatus: 'resolved',
              })
              setCheckInDone(true)
              window.setTimeout(() => setCheckInDone(false), 2500)
            }}
          >
            保存快速打卡
          </button>
          {checkInDone && <span className="ml-2 inline-flex items-center gap-1 text-xs text-safe"><CheckCircle2 size={13} /> 已保存</span>}
        </section>
      </div>

      <div className="space-y-2">
        {trigger ? (
          <div className="flex items-center gap-2 rounded-md border border-safe/50 bg-safe/10 px-3 py-2 text-xs text-safe">
            <CheckCircle2 size={14} /> 已带入诱因「{triggerCategoryLabel[trigger.category]}」到发作前记录
          </div>
        ) : (
          <div className="rounded-md border border-border-default bg-bg-2 px-3 py-2 text-xs text-text-secondary">
            提示：先在左侧用 AI 助手记录诱因，确认后会自动带入下方的「发作前」。也可直接填写三段式记录。
          </div>
        )}
        <ThreePhaseRecorder
          patientId={currentUser?.id ?? 'p1'}
          triggerRecord={trigger}
          onSubmit={(event) => {
            addSeizureEvent(event)
            addEvent({
              id: `phase-${event.id}`,
              type: 'manual',
              title: '三段式发作记录已提交',
              timestamp: Date.now(),
              details: `类型：${event.ictal.seizureType} · 持续 ${event.durationSec}s`,
              handlingStatus: 'resolved',
            })
            pushAlert({
              id: `phase-alert-${Date.now()}`,
              type: 'success',
              title: '三段式发作记录已提交',
              message: '记录已加入「发作回顾」，等待医生复核。',
              timestamp: Date.now(),
              handlingStatus: 'resolved',
            })
            setTrigger(undefined)
          }}
        />
      </div>
    </div>
  )
}
