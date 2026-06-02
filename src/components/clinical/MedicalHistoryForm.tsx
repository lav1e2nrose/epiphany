import type { BooleanWithDetail, ExamRecord, FrequencyPoint, MedicalHistory, MedicationRecord } from '../../types/clinical'
import { QuestionnaireRunner } from './QuestionnaireRunner'

interface Props {
  history: MedicalHistory
  readOnly?: boolean
  onChange: (next: MedicalHistory) => void
}

const booleanFields = [
  { key: 'cerebralInfection', label: '脑炎/脑膜炎史' },
  { key: 'headTrauma', label: '脑外伤史' },
  { key: 'birthInjury', label: '出生时缺氧/产伤' },
  { key: 'febrileSeizure', label: '热性惊厥史' },
  { key: 'familyHistory', label: '癫痫家族史' },
] as const

const medicationEffects: MedicationRecord['effect'][] = ['effective', 'partial', 'ineffective', 'sideeffect']
const examTypes: ExamRecord['type'][] = ['EEG', 'MRI', 'CT', 'PET-CT', 'fMRI', 'Video-EEG', 'Other']

const valueOptions: Array<{ value: BooleanWithDetail['value']; label: string }> = [
  { value: true, label: '是' },
  { value: false, label: '否' },
  { value: 'unknown', label: '不确定' },
]

export function MedicalHistoryForm({ history, readOnly = false, onChange }: Props): JSX.Element {
  const updateHistory = (patch: Partial<MedicalHistory>): void => {
    if (readOnly) return
    onChange({ ...history, ...patch, updatedAt: Date.now() })
  }

  const updateBoolean = (key: (typeof booleanFields)[number]['key'], patch: Partial<BooleanWithDetail>): void => {
    if (readOnly) return
    updateHistory({ [key]: { ...history[key], ...patch } } as Partial<MedicalHistory>)
  }

  const updateArrayItem = <T,>(items: T[], index: number, patch: Partial<T>): T[] =>
    items.map((item, idx) => (idx === index ? { ...item, ...patch } : item))

  const updateFrequency = (next: FrequencyPoint[]): void => updateHistory({ seizureFrequencyHistory: next })
  const updateMedications = (next: MedicationRecord[]): void => updateHistory({ medications: next })
  const updateExams = (next: ExamRecord[]): void => updateHistory({ examinations: next })

  return (
    <div className="space-y-4 text-sm">
      <section data-section="history" className="rounded-md border border-border-default bg-bg-2 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">既往疾病史</h3>
          <span className="text-xs text-text-secondary">最后更新：{new Date(history.updatedAt).toLocaleString('zh-CN')}</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {booleanFields.map(({ key, label }) => (
            <div key={key} className="rounded border border-border-default bg-bg-3 p-2 text-xs">
              <div className="mb-1 font-medium">{label}</div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="col-span-1 rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  value={String(history[key].value)}
                  onChange={(event) => {
                    const raw = event.target.value
                    const parsed = raw === 'true' ? true : raw === 'false' ? false : 'unknown'
                    updateBoolean(key, { value: parsed })
                  }}
                >
                  {valueOptions.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="col-span-2 rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  placeholder="补充说明"
                  value={history[key].detail ?? ''}
                  onChange={(event) => updateBoolean(key, { detail: event.target.value })}
                />
              </div>
              {key === 'febrileSeizure' && (
                <input
                  type="number"
                  className="mt-2 w-full rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  placeholder="发生年龄"
                  value={history[key].ageAtEvent ?? ''}
                  onChange={(event) => updateBoolean(key, { ageAtEvent: Number(event.target.value) })}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section data-section="medication" className="rounded-md border border-border-default bg-bg-2 p-3">
        <h3 className="font-semibold">用药记录</h3>
        <div className="mt-2 space-y-2 text-xs">
          {history.medications.map((medication, index) => (
            <div key={`${medication.drugName}-${index}`} className="rounded border border-border-default bg-bg-3 p-2">
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  placeholder="药物名称"
                  value={medication.drugName}
                  onChange={(event) =>
                    updateMedications(updateArrayItem(history.medications, index, { drugName: event.target.value }))
                  }
                />
                <input
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  placeholder="剂量/频次"
                  value={medication.dosage}
                  onChange={(event) =>
                    updateMedications(updateArrayItem(history.medications, index, { dosage: event.target.value }))
                  }
                />
                <input
                  type="date"
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  value={medication.startDate}
                  onChange={(event) =>
                    updateMedications(updateArrayItem(history.medications, index, { startDate: event.target.value }))
                  }
                />
                <input
                  type="date"
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  value={medication.endDate ?? ''}
                  onChange={(event) =>
                    updateMedications(updateArrayItem(history.medications, index, { endDate: event.target.value || undefined }))
                  }
                />
                <select
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  value={medication.effect}
                  onChange={(event) =>
                    updateMedications(updateArrayItem(history.medications, index, { effect: event.target.value as MedicationRecord['effect'] }))
                  }
                >
                  {medicationEffects.map((effect) => (
                    <option key={effect} value={effect}>
                      {effect}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  placeholder="备注"
                  value={medication.notes}
                  onChange={(event) =>
                    updateMedications(updateArrayItem(history.medications, index, { notes: event.target.value }))
                  }
                />
              </div>
              <button
                className="mt-2 rounded border border-border-default px-2 py-0.5 text-[11px]"
                disabled={readOnly}
                onClick={() => updateMedications(history.medications.filter((_, idx) => idx !== index))}
              >
                删除用药
              </button>
            </div>
          ))}
          <button
            className="rounded border border-border-default px-2 py-1 text-xs"
            disabled={readOnly}
            onClick={() =>
              updateMedications([
                ...history.medications,
                {
                  drugName: '新药物',
                  dosage: '剂量',
                  startDate: new Date().toISOString().slice(0, 10),
                  effect: 'partial',
                  notes: '',
                },
              ])
            }
          >
            + 添加用药
          </button>
          <label className="block text-xs">
            不良反应记录
            <textarea
              className="mt-1 w-full rounded border border-border-default bg-bg-2 px-2 py-1"
              disabled={readOnly}
              value={history.drugReactions}
              onChange={(event) => updateHistory({ drugReactions: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section data-section="evolution" className="rounded-md border border-border-default bg-bg-2 p-3">
        <h3 className="font-semibold">发作演变</h3>
        <div className="mt-2 grid gap-3 text-xs md:grid-cols-2">
          <label className="flex flex-col gap-1">
            首次发作年龄
            <input
              type="number"
              className="rounded border border-border-default bg-bg-2 px-2 py-1"
              disabled={readOnly}
              value={history.onsetAge}
              onChange={(event) => updateHistory({ onsetAge: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            发作演变描述
            <input
              className="rounded border border-border-default bg-bg-2 px-2 py-1"
              disabled={readOnly}
              value={history.seizureEvolutionNotes}
              onChange={(event) => updateHistory({ seizureEvolutionNotes: event.target.value })}
            />
          </label>
        </div>
        <div className="mt-3 space-y-2 text-xs">
          {history.seizureFrequencyHistory.map((point, index) => (
            <div key={`${point.year}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="number"
                className="rounded border border-border-default bg-bg-2 px-2 py-1"
                disabled={readOnly}
                value={point.year}
                onChange={(event) =>
                  updateFrequency(updateArrayItem(history.seizureFrequencyHistory, index, { year: Number(event.target.value) }))
                }
              />
              <input
                type="number"
                className="rounded border border-border-default bg-bg-2 px-2 py-1"
                disabled={readOnly}
                value={point.monthlyCount}
                onChange={(event) =>
                  updateFrequency(updateArrayItem(history.seizureFrequencyHistory, index, { monthlyCount: Number(event.target.value) }))
                }
              />
              <button
                className="rounded border border-border-default px-2 py-1 text-[11px]"
                disabled={readOnly}
                onClick={() => updateFrequency(history.seizureFrequencyHistory.filter((_, idx) => idx !== index))}
              >
                删除
              </button>
            </div>
          ))}
          <button
            className="rounded border border-border-default px-2 py-1 text-xs"
            disabled={readOnly}
            onClick={() => updateFrequency([...history.seizureFrequencyHistory, { year: new Date().getFullYear(), monthlyCount: 0 }])}
          >
            + 添加频率点
          </button>
        </div>
      </section>

      <section data-section="exam" className="rounded-md border border-border-default bg-bg-2 p-3">
        <h3 className="font-semibold">检查资料</h3>
        <div className="mt-2 space-y-2 text-xs">
          {history.examinations.map((exam, index) => (
            <div key={`${exam.type}-${index}`} className="rounded border border-border-default bg-bg-3 p-2">
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  value={exam.type}
                  onChange={(event) =>
                    updateExams(updateArrayItem(history.examinations, index, { type: event.target.value as ExamRecord['type'] }))
                  }
                >
                  {examTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  value={exam.date}
                  onChange={(event) => updateExams(updateArrayItem(history.examinations, index, { date: event.target.value }))}
                />
                <input
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  placeholder="医院"
                  value={exam.hospital}
                  onChange={(event) => updateExams(updateArrayItem(history.examinations, index, { hospital: event.target.value }))}
                />
                <input
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  placeholder="结论"
                  value={exam.conclusion}
                  onChange={(event) => updateExams(updateArrayItem(history.examinations, index, { conclusion: event.target.value }))}
                />
              </div>
              <label className="mt-2 block text-[11px]">
                附件（文件名逗号分隔）
                <input
                  className="mt-1 w-full rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={readOnly}
                  value={exam.attachments.map((item) => item.name).join(',')}
                  onChange={(event) =>
                    updateExams(
                      updateArrayItem(history.examinations, index, {
                        attachments: event.target.value
                          .split(',')
                          .map((name) => name.trim())
                          .filter(Boolean)
                          .map((name) => ({ name, url: '#', sizeLabel: '—' })),
                      }),
                    )
                  }
                />
              </label>
              <button
                className="mt-2 rounded border border-border-default px-2 py-0.5 text-[11px]"
                disabled={readOnly}
                onClick={() => updateExams(history.examinations.filter((_, idx) => idx !== index))}
              >
                删除检查
              </button>
            </div>
          ))}
          <button
            className="rounded border border-border-default px-2 py-1 text-xs"
            disabled={readOnly}
            onClick={() =>
              updateExams([
                ...history.examinations,
                {
                  type: 'EEG',
                  date: new Date().toISOString().slice(0, 10),
                  hospital: '',
                  conclusion: '',
                  attachments: [],
                },
              ])
            }
          >
            + 添加检查
          </button>
        </div>
      </section>

      <section data-section="questionnaire" className="rounded-md border border-border-default bg-bg-2 p-3">
        <QuestionnaireRunner questionnaires={history.questionnaires} disabled={readOnly} onChange={(next) => updateHistory({ questionnaires: next })} />
      </section>
    </div>
  )
}
