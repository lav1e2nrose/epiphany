import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../store'
import type { AuraType, ClinicalSeizureEvent, SeizureType, TriggerCategory } from '../../types/clinical'

const seizureTypeLabel: Record<SeizureType, string> = {
  focal_aware: '局灶性意识清醒',
  focal_impaired: '局灶性意识障碍',
  focal_to_bilateral: '局灶性继发双侧强直阵挛',
  generalized_tonic_clonic: '全面性强直阵挛',
  absence: '失神',
  myoclonic: '肌阵挛',
  atonic: '失张力',
  unknown: '待医生判断',
}

const auraLabel: Record<AuraType, string> = {
  epigastric_rising: '上腹部上升感',
  deja_vu: '似曾相识',
  jamais_vu: '似不相识',
  visual: '视觉异常',
  auditory: '听觉异常',
  olfactory: '嗅觉异常',
  gustatory: '味觉异常',
  somatosensory: '躯体感觉异常',
  autonomic: '自主神经症状',
  fear_anxiety: '恐惧/焦虑',
  unspecified: '未特指',
}

const triggerLabel: Record<TriggerCategory, string> = {
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

const postStateLabel: Record<ClinicalSeizureEvent['post']['state'], string> = {
  fully_recovered: '完全恢复',
  confused: '意识模糊',
  sleepy: '嗜睡',
  sore: '肌肉酸痛',
  amnesia: '记忆缺失',
  todds_paresis: 'Todd 麻痹',
}

function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** 事件关联的静态 EEG 缩略波形：基于事件 id 的确定性波形，中段呈现发作棘波 */
function MiniWaveform({ seed }: { seed: number }): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const w = 320
    const h = 84
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#0D1117'
    ctx.fillRect(0, 0, w, h)
    // 发作窗高亮（中段）
    ctx.fillStyle = 'rgba(248,81,73,0.12)'
    ctx.fillRect(w * 0.36, 0, w * 0.28, h)
    ctx.strokeStyle = '#39D0D8'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let x = 0; x <= w; x++) {
      const f = x / w
      const inSeizure = f > 0.36 && f < 0.64
      const amp = inSeizure ? 9 : 5
      const spike = inSeizure ? (seeded(x * 7 + seed) - 0.5) * 30 : 0
      const base = Math.sin(x * 0.2) * amp + (seeded(x + seed) - 0.5) * 3
      const y = h / 2 - (base + spike)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }, [seed])
  return <canvas ref={ref} width={320} height={84} className="w-full rounded border border-border-subtle" />
}

export function SeizureReview(): JSX.Element {
  const patientId = useAppStore((state) => state.currentUser?.id ?? 'p1')
  const clinicalEvents = useAppStore((state) => state.clinicalEvents)
  const events = useMemo(() => clinicalEvents.filter((event) => event.patientId === patientId), [clinicalEvents, patientId])
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null)
  const active = useMemo(() => events.find((event) => event.id === activeId) ?? events[0] ?? null, [activeId, events])
  const seedFromId = (id: string): number => id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

  return (
    <div className="grid h-full grid-cols-[1fr_380px] gap-3 overflow-hidden">
      <section className="flex min-h-0 flex-col rounded-md border border-border-default bg-bg-2 p-3">
        <h2 className="font-semibold">发作回顾</h2>
        <div className="mt-1 text-xs text-text-secondary">所有事件均为回顾性记录，完整波形请在下次复诊时与医生一同查看。</div>
        <div className="mt-3 flex-1 space-y-2 overflow-auto text-sm">
          {events.length === 0 ? (
            <div className="text-text-secondary">暂无事件记录</div>
          ) : (
            events.map((event) => {
              const isActive = active?.id === event.id
              const confirmed = event.confirmed === 'confirmed'
              return (
                <button
                  key={event.id}
                  className={`flex w-full items-center gap-3 rounded border px-3 py-2 text-left transition-all ${isActive ? 'border-accent bg-accent/10' : 'border-border-default bg-bg-3/50 hover:border-border-emphasis'}`}
                  onClick={() => setActiveId(event.id)}
                >
                  <span className="font-mono text-xs text-text-secondary">{new Date(event.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="rounded bg-bg-0 px-2 py-0.5 text-xs">{seizureTypeLabel[event.ictal.seizureType]}</span>
                  <span className="font-mono text-xs">{Math.floor(event.durationSec / 60)}m{event.durationSec % 60}s</span>
                  <span className={`ml-auto text-xs ${confirmed ? 'text-safe' : 'text-warn'}`}>{confirmed ? '✓ 已复核' : '⏱ 待医生复核'}</span>
                </button>
              )
            })
          )}
        </div>
      </section>

      <section className="min-h-0 overflow-auto rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <h3 className="font-semibold">事件详情</h3>
        {active ? (
          <div className="mt-2 space-y-3 text-xs">
            <div className="rounded border border-border-default bg-bg-3 p-2">
              <div className="mb-1 font-semibold text-recovery">【发作前】诱因与先兆</div>
              {active.pre.triggers.length === 0 ? (
                <div className="text-text-secondary">未记录诱因</div>
              ) : (
                active.pre.triggers.map((trigger) => (
                  <div key={trigger.category} className="mb-1">
                    <div className="flex items-center justify-between">
                      <span>{triggerLabel[trigger.category]}</span>
                      <span className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <span key={level} className={`h-2 w-2 rounded-full ${level <= trigger.severity ? 'bg-warn' : 'bg-border-default'}`} />
                        ))}
                      </span>
                    </div>
                    {trigger.refinedAnswers.slice(0, 3).map((answer) => (
                      <div key={answer.question} className="text-text-secondary">· {answer.question.replace(/[？?]$/, '')}：{answer.answer}</div>
                    ))}
                  </div>
                ))
              )}
              <div className="mt-1 text-text-secondary">
                先兆：{active.pre.aura.map((aura) => auraLabel[aura.type]).join('、') || '无'} · 间隔 {active.pre.timeBeforeOnset}s
              </div>
            </div>

            <div className="rounded border border-border-default bg-bg-3 p-2">
              <div className="mb-1 font-semibold text-danger">【发作中】表现</div>
              <div>类型：{seizureTypeLabel[active.ictal.seizureType]}</div>
              <div>症状：{active.ictal.symptoms.join(' / ') || '无'}</div>
              {active.ictal.patientDescription && <div className="mt-1 text-text-secondary">患者：「{active.ictal.patientDescription}」</div>}
              {active.ictal.witnessDescription && <div className="text-text-secondary">旁观：「{active.ictal.witnessDescription}」</div>}
            </div>

            <div className="rounded border border-border-default bg-bg-3 p-2">
              <div className="mb-1 font-semibold text-recovery">【发作后】</div>
              <div>状态：{postStateLabel[active.post.state]} · 恢复 {active.post.recoveryDurationMin} 分钟</div>
              {active.post.notes && <div className="text-text-secondary">{active.post.notes}</div>}
            </div>

            <div className="rounded border border-border-default bg-bg-3 p-2">
              <div className="mb-1 font-semibold">关联 EEG 缩略波形</div>
              <MiniWaveform seed={seedFromId(active.id)} />
              <div className="mt-1 text-text-muted">完整波形请在下次复诊时与医生一同查看。</div>
            </div>

            <div className="rounded border border-border-default bg-bg-3 p-2">
              <div className="mb-1 font-semibold">医生备注</div>
              <div className="text-text-secondary">{active.doctorReview?.annotation ?? '尚未复核'}</div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-text-secondary">暂无事件</div>
        )}
      </section>
    </div>
  )
}
