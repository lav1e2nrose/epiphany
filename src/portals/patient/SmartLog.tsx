import { useState } from 'react'
import { AIInterviewChat } from '../../components/clinical/AIInterviewChat'
import { ThreePhaseRecorder } from '../../components/clinical/ThreePhaseRecorder'
import { useAppStore } from '../../store'
import type { TriggerRecord } from '../../types/clinical'

export function SmartLog(): JSX.Element {
  const currentUser = useAppStore((state) => state.currentUser)
  const addSeizureEvent = useAppStore((state) => state.addSeizureEvent)
  const addEvent = useAppStore((state) => state.addEvent)
  const [trigger, setTrigger] = useState<TriggerRecord | undefined>()

  return (
    <div className="grid h-full grid-cols-[1fr_1fr] gap-3 overflow-auto">
      <div className="space-y-3">
        <AIInterviewChat onComplete={setTrigger} />
        <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
          <h3 className="font-semibold">普通日常记录（快速打卡）</h3>
          <button
            className="mt-2 rounded border border-accent/60 px-2 py-1 text-xs"
            onClick={() =>
              addEvent({
                id: `daily-${Date.now()}`,
                type: 'manual',
                title: '快速打卡已保存',
                timestamp: Date.now(),
                details: '服药打卡+睡眠+情绪已记录',
                handlingStatus: 'resolved',
              })
            }
          >
            保存快速打卡
          </button>
        </section>
      </div>
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
        }}
      />
    </div>
  )
}
