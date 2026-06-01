import type { QuestionnaireResult } from '../../types/clinical'

interface Props {
  questionnaires: QuestionnaireResult[]
  disabled?: boolean
  onChange: (next: QuestionnaireResult[]) => void
}

const DEFAULT_QUESTIONNAIRE: QuestionnaireResult = {
  name: 'QOLIE-31',
  date: new Date().toISOString().slice(0, 10),
  totalScore: 60,
  itemScores: {},
  interpretation: '生活质量轻度受影响',
}

export function QuestionnaireRunner({ questionnaires, disabled = false, onChange }: Props): JSX.Element {
  const updateQuestionnaire = (index: number, patch: Partial<QuestionnaireResult>): void => {
    const next = questionnaires.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>心理量表记录</span>
        <button
          className="rounded border border-border-default px-2 py-0.5"
          disabled={disabled}
          onClick={() => onChange([...questionnaires, { ...DEFAULT_QUESTIONNAIRE }])}
        >
          + 添加量表
        </button>
      </div>
      <div className="space-y-2 text-xs">
        {questionnaires.length === 0 && <div className="text-text-secondary">暂无量表记录</div>}
        {questionnaires.map((item, index) => (
          <div key={`${item.name}-${index}`} className="rounded border border-border-default bg-bg-3 p-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                名称
                <input
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={disabled}
                  value={item.name}
                  onChange={(event) => updateQuestionnaire(index, { name: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                日期
                <input
                  type="date"
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={disabled}
                  value={item.date}
                  onChange={(event) => updateQuestionnaire(index, { date: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                总分
                <input
                  type="number"
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={disabled}
                  value={item.totalScore}
                  onChange={(event) => updateQuestionnaire(index, { totalScore: Number(event.target.value) })}
                />
              </label>
              <label className="flex flex-col gap-1">
                解释
                <input
                  className="rounded border border-border-default bg-bg-2 px-2 py-1"
                  disabled={disabled}
                  value={item.interpretation}
                  onChange={(event) => updateQuestionnaire(index, { interpretation: event.target.value })}
                />
              </label>
            </div>
            <div className="mt-2 text-[11px] text-text-secondary">条目分数：{Object.keys(item.itemScores).length > 0 ? JSON.stringify(item.itemScores) : '—'}</div>
            <button
              className="mt-2 rounded border border-border-default px-2 py-0.5 text-[11px]"
              disabled={disabled}
              onClick={() => onChange(questionnaires.filter((_, idx) => idx !== index))}
            >
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
