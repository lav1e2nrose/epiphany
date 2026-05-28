import { useMemo, useState } from 'react'
import { getInterviewScript, inferTriggerCategory } from '../../ai/TriggerInterview'
import type { TriggerRecord } from '../../types/clinical'

interface Props {
  onComplete: (record: TriggerRecord) => void
}

export function AIInterviewChat({ onComplete }: Props): JSX.Element {
  const [rawInput, setRawInput] = useState('')
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const category = useMemo(() => inferTriggerCategory(rawInput), [rawInput])
  const script = getInterviewScript(category)

  return (
    <div className="rounded-md border border-border-default bg-bg-2 p-3">
      <div className="mb-2 text-sm font-semibold">🧠 灵犀助手（AI 引导式追问）</div>
      <textarea
        value={rawInput}
        onChange={(event) => setRawInput(event.target.value)}
        placeholder="先描述一下今天想记录的诱因，例如：昨晚没睡好、压力很大..."
        className="h-16 w-full rounded border border-border-default bg-bg-3 px-2 py-1 text-sm"
      />
      <div className="mt-2 text-xs text-text-secondary">识别类别：{category}</div>
      <div className="mt-3 space-y-2 text-sm">
        {script.questions.map((question, index) => (
          <div key={question.prompt} className="rounded border border-border-subtle bg-bg-3/60 p-2">
            <div className="text-xs text-text-secondary">Q{index + 1}</div>
            <div>{question.prompt}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {question.choices.map((choice) => (
                <button
                  key={choice}
                  className={`rounded-full border px-2 py-0.5 text-xs ${answers[index] === choice ? 'border-accent bg-accent/20' : 'border-border-default'}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [index]: choice }))}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        className="mt-3 rounded border border-accent/70 bg-accent/10 px-3 py-1 text-sm"
        onClick={() =>
          onComplete({
            category,
            rawInput,
            refinedAnswers: script.questions.map((question, index) => ({
              question: question.prompt,
              answer: answers[index] ?? '未填写',
              answerType: 'choice',
            })),
            severity: Math.max(1, Math.min(5, Object.values(answers).filter(Boolean).length)) as 1 | 2 | 3 | 4 | 5,
          })
        }
      >
        确认结构化诱因
      </button>
    </div>
  )
}
