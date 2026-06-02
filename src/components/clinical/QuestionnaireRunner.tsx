import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ClipboardList, Trash2, X } from 'lucide-react'
import type { QuestionnaireResult } from '../../types/clinical'
import { CLINICAL_SCALES, getScaleByName, type ClinicalScale, type ScaleSeverity } from '../../data/clinicalScales'

interface Props {
  questionnaires: QuestionnaireResult[]
  disabled?: boolean
  onChange: (next: QuestionnaireResult[]) => void
}

const severityClass: Record<ScaleSeverity, string> = {
  safe: 'bg-safe/20 text-safe',
  warn: 'bg-warn/20 text-warn',
  danger: 'bg-danger/20 text-danger',
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 量表作答弹窗：逐条 Likert 单选 + 实时计分 + 自杀条目警示 */
function ScaleModal({ scale, onClose, onSubmit }: { scale: ClinicalScale; onClose: () => void; onSubmit: (answers: Record<string, number>) => void }): JSX.Element {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const answeredCount = Object.keys(answers).length
  const complete = answeredCount === scale.items.length
  const runningTotal = scale.items.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0)
  const riskHit = scale.riskItemIndex !== undefined && (answers[scale.items[scale.riskItemIndex].id] ?? 0) > 0

  return (
    <motion.div
      className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-[10px] border border-border-emphasis bg-bg-1"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border-subtle p-4">
          <div>
            <div className="text-base font-semibold">{scale.name} · {scale.fullName}</div>
            <div className="mt-1 text-xs text-text-secondary">{scale.timeframe}</div>
          </div>
          <button className="text-text-secondary hover:text-text-primary" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-4">
          {scale.items.map((item, index) => {
            const isRisk = scale.riskItemIndex === index
            return (
              <div key={item.id} className={`rounded-md border p-3 ${isRisk ? 'border-danger/40' : 'border-border-default'} bg-bg-2`}>
                <div className="mb-2 flex gap-2 text-sm">
                  <span className="font-mono text-text-secondary">{index + 1}.</span>
                  <span>{item.text}{isRisk && <span className="ml-1 text-danger">（关键条目）</span>}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scale.options.map((option) => {
                    const selected = answers[item.id] === option.value
                    return (
                      <button
                        key={option.value}
                        className={`rounded-full border px-3 py-1 text-xs transition-all active:scale-95 ${selected ? 'border-accent bg-accent/20 text-text-primary' : 'border-border-default text-text-secondary hover:border-border-emphasis'}`}
                        onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: option.value }))}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border-subtle p-4">
          {riskHit && (
            <div className="mb-2 flex items-center gap-2 rounded border border-danger/50 bg-danger/10 px-2 py-1.5 text-xs text-danger">
              <AlertTriangle size={14} /> 关键条目阳性：如有自伤念头，请立即联系医生或拨打心理援助热线。
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              已作答 <span className="font-mono">{answeredCount}/{scale.items.length}</span> · 当前总分 <span className="font-mono text-accent">{runningTotal}</span>
            </div>
            <div className="flex gap-2">
              <button className="rounded border border-border-default px-3 py-1 text-sm" onClick={onClose}>取消</button>
              <button
                className="rounded border border-accent/70 bg-accent/10 px-3 py-1 text-sm transition-transform active:scale-95 disabled:opacity-40"
                disabled={!complete}
                onClick={() => onSubmit(answers)}
              >
                {complete ? '提交并计分' : `还有 ${scale.items.length - answeredCount} 题`}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function QuestionnaireRunner({ questionnaires, disabled = false, onChange }: Props): JSX.Element {
  const [activeScale, setActiveScale] = useState<ClinicalScale | null>(null)

  // 每个量表的最近一次结果 + 历史趋势
  const byScale = useMemo(() => {
    return CLINICAL_SCALES.map((scale) => {
      const results = questionnaires
        .filter((item) => item.name === scale.key)
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
      return { scale, results, latest: results.at(-1) ?? null }
    })
  }, [questionnaires])

  const submitScale = (scale: ClinicalScale, answers: Record<string, number>): void => {
    const totalScore = scale.items.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0)
    const interpretation = scale.interpret(totalScore)
    const next: QuestionnaireResult = {
      name: scale.key,
      date: today(),
      totalScore,
      itemScores: answers,
      interpretation: interpretation.level,
    }
    onChange([...questionnaires, next])
    setActiveScale(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList size={15} className="text-accent" /> 心理量表评估
      </div>
      <p className="text-xs text-text-secondary">选择量表逐题作答，系统自动计分并给出临床解释；结果纳入档案供医生复诊参考。</p>

      <div className="grid gap-2 md:grid-cols-3">
        {byScale.map(({ scale, results, latest }) => {
          const interp = latest ? scale.interpret(latest.totalScore) : null
          return (
            <div key={scale.key} className="flex flex-col rounded-md border border-border-default bg-bg-3 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{scale.name}</span>
                <span className="text-text-muted">{scale.items.length} 题</span>
              </div>
              <div className="mt-0.5 text-text-secondary">{scale.fullName}</div>
              <p className="mt-1 flex-1 text-text-muted">{scale.description}</p>
              {latest && interp ? (
                <div className="mt-2">
                  <span className="font-mono text-text-secondary">最近 {latest.date}：</span>
                  <span className="font-mono">{latest.totalScore}</span>
                  <span className={`ml-1 rounded px-1.5 py-0.5 ${severityClass[interp.severity]}`}>{interp.level}</span>
                </div>
              ) : (
                <div className="mt-2 text-text-muted">尚未评估</div>
              )}
              <button
                className="mt-2 rounded border border-accent/60 bg-accent/10 px-2 py-1 text-center transition-transform active:scale-95 disabled:opacity-40"
                disabled={disabled}
                onClick={() => setActiveScale(scale)}
              >
                {latest ? '再次评估' : '开始评估'}
              </button>
              {results.length >= 2 && (
                <div className="mt-2 h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.map((item) => ({ date: item.date.slice(5), score: item.totalScore }))} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                      <XAxis dataKey="date" tick={{ fill: '#8B949E', fontSize: 9 }} />
                      <YAxis domain={scale.range} tick={{ fill: '#8B949E', fontSize: 9 }} width={28} />
                      <Tooltip contentStyle={{ background: '#161B22', border: '1px solid #30363D', fontSize: 11 }} />
                      <Line dataKey="score" stroke="#0A84FF" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {questionnaires.length > 0 && (
        <div className="rounded-md border border-border-default bg-bg-3 p-2 text-xs">
          <div className="mb-1 font-medium text-text-secondary">评估历史</div>
          <div className="space-y-1">
            {questionnaires
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((item, index) => {
                const scale = getScaleByName(item.name)
                const interp = scale?.interpret(item.totalScore)
                return (
                  <div key={`${item.name}-${item.date}-${index}`} className="flex items-center justify-between rounded border border-border-subtle px-2 py-1">
                    <span><span className="font-mono">{item.date}</span> · {item.name} · 总分 <span className="font-mono">{item.totalScore}</span></span>
                    <span className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 ${interp ? severityClass[interp.severity] : 'bg-bg-2'}`}>{item.interpretation}</span>
                      {!disabled && (
                        <button className="text-text-muted hover:text-danger" onClick={() => onChange(questionnaires.filter((_, idx) => idx !== questionnaires.indexOf(item)))}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeScale && <ScaleModal scale={activeScale} onClose={() => setActiveScale(null)} onSubmit={(answers) => submitScale(activeScale, answers)} />}
      </AnimatePresence>
    </div>
  )
}
