import { useState } from 'react'
import type { AuraType, ClinicalSeizureEvent, SeizureType, TriggerRecord } from '../../types/clinical'

interface Props {
  patientId: string
  triggerRecord?: TriggerRecord
  onSubmit: (event: ClinicalSeizureEvent) => void
}

const auraOptions: Array<{ value: AuraType; label: string }> = [
  { value: 'epigastric_rising', label: '上腹部上升感' },
  { value: 'deja_vu', label: '似曾相识' },
  { value: 'visual', label: '视觉异常' },
  { value: 'auditory', label: '听觉异常' },
  { value: 'fear_anxiety', label: '恐惧焦虑' },
]

const seizureTypeOptions: Array<{ value: SeizureType; label: string }> = [
  { value: 'focal_aware', label: '局灶性意识清醒' },
  { value: 'focal_impaired', label: '局灶性意识障碍' },
  { value: 'focal_to_bilateral', label: '局灶继发双侧' },
  { value: 'generalized_tonic_clonic', label: '全面性强直阵挛' },
  { value: 'unknown', label: '不确定' },
]

export function ThreePhaseRecorder({ patientId, triggerRecord, onSubmit }: Props): JSX.Element {
  const [step, setStep] = useState(0)
  const [selectedAura, setSelectedAura] = useState<AuraType>('epigastric_rising')
  const [seizureType, setSeizureType] = useState<SeizureType>('focal_impaired')
  const [symptomText, setSymptomText] = useState('右上肢强直、意识模糊')
  const [postState, setPostState] = useState<'fully_recovered' | 'confused' | 'sleepy' | 'sore' | 'amnesia' | 'todds_paresis'>('confused')
  const [durationSec, setDurationSec] = useState(120)

  const labels = ['第1步·发作前', '第2步·发作中', '第3步·发作后']

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-3">
      <div className="mb-3 flex gap-2 text-xs">
        {labels.map((label, index) => (
          <div key={label} className={`rounded-full border px-2 py-1 ${index === step ? 'border-accent bg-accent/20' : 'border-border-default text-text-secondary'}`}>
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-2 text-sm">
          <div>先兆选择</div>
          <div className="flex flex-wrap gap-1">
            {auraOptions.map((option) => (
              <button
                key={option.value}
                className={`rounded-full border px-2 py-0.5 ${selectedAura === option.value ? 'border-accent bg-accent/20' : 'border-border-default'}`}
                onClick={() => setSelectedAura(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="block">先兆到发作间隔（秒）
            <input type="number" value={durationSec} onChange={(event) => setDurationSec(Number(event.target.value))} className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2 text-sm">
          <label className="block">发作类型
            <select value={seizureType} onChange={(event) => setSeizureType(event.target.value as SeizureType)} className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1">
              {seizureTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block">症状标签（逗号分隔）
            <input value={symptomText} onChange={(event) => setSymptomText(event.target.value)} className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1" />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2 text-sm">
          <label className="block">发作后状态
            <select value={postState} onChange={(event) => setPostState(event.target.value as typeof postState)} className="mt-1 w-full rounded border border-border-default bg-bg-3 px-2 py-1">
              <option value="fully_recovered">完全恢复</option>
              <option value="confused">意识模糊</option>
              <option value="sleepy">嗜睡</option>
              <option value="sore">肌肉酸痛</option>
              <option value="amnesia">记忆缺失</option>
              <option value="todds_paresis">Todd 麻痹</option>
            </select>
          </label>
          <div className="text-xs text-text-secondary">提交后将保存为 source=patient, confirmed=unconfirmed。</div>
        </div>
      )}

      <div className="mt-3 flex justify-between">
        <button className="rounded border border-border-default px-2 py-1 text-xs" onClick={() => setStep((value) => Math.max(0, value - 1))}>上一步</button>
        {step < 2 ? (
          <button className="rounded border border-accent/60 px-2 py-1 text-xs" onClick={() => setStep((value) => Math.min(2, value + 1))}>下一步</button>
        ) : (
          <button
            className="rounded border border-accent/60 bg-accent/10 px-2 py-1 text-xs"
            onClick={() =>
              onSubmit({
                id: `cse-${Date.now()}`,
                patientId,
                timestamp: Date.now(),
                durationSec,
                source: 'patient',
                confirmed: 'unconfirmed',
                pre: {
                  triggers: triggerRecord ? [triggerRecord] : [],
                  aura: [{ type: selectedAura, description: '患者填写先兆' }],
                  timeBeforeOnset: 45,
                },
                ictal: {
                  seizureType,
                  symptoms: symptomText.split('、').filter(Boolean),
                  patientDescription: '患者自行补充描述。',
                  witnessDescription: '',
                },
                post: {
                  state: postState,
                  recoveryDurationMin: 8,
                  notes: '无。',
                },
                medicationCompliance: {
                  missedDoseLast24h: false,
                },
              })
            }
          >
            提交三段式记录
          </button>
        )}
      </div>
    </div>
  )
}
