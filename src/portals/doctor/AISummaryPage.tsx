import { useMemo, useState } from 'react'
import { Check, Edit3, RefreshCw, Sparkles, X } from 'lucide-react'
import { useAppStore } from '../../store'
import type { AISummary } from '../../types/clinical'

const EMPTY_SUMMARIES: AISummary[] = []

function toDateInput(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

export function AISummaryPage(): JSX.Element {
  const selectedDoctorPatientId = useAppStore((state) => state.selectedDoctorPatientId ?? 'p1')
  const patients = useAppStore((state) => state.patients)
  const generateAISummary = useAppStore((state) => state.generateAISummary)
  const approveAISummary = useAppStore((state) => state.approveAISummary)
  const updateAISummary = useAppStore((state) => state.updateAISummary)
  const discardAISummary = useAppStore((state) => state.discardAISummary)
  const aiSummaries = useAppStore((state) => state.aiSummaries[selectedDoctorPatientId] ?? EMPTY_SUMMARIES)

  const patientName = patients.find((patient) => patient.id === selectedDoctorPatientId)?.name ?? selectedDoctorPatientId
  const [busy, setBusy] = useState(false)
  const [startDate, setStartDate] = useState(() => toDateInput(Date.now() - 7 * 24 * 3600 * 1000))
  const [endDate, setEndDate] = useState(() => toDateInput(Date.now()))
  const [editId, setEditId] = useState<string | null>(null)
  const [editHighlights, setEditHighlights] = useState('')
  const [editMedication, setEditMedication] = useState('')
  const [editRecommendations, setEditRecommendations] = useState('')

  const draft = useMemo(() => aiSummaries.find((summary) => summary.draftStatus === 'draft') ?? aiSummaries[0], [aiSummaries])
  const history = useMemo(() => aiSummaries.filter((summary) => summary.id !== draft?.id), [aiSummaries, draft])

  const runGenerate = (): void => {
    setBusy(true)
    const start = new Date(`${startDate}T00:00:00`).getTime()
    const end = new Date(`${endDate}T23:59:59`).getTime()
    void generateAISummary(selectedDoctorPatientId, start, end).finally(() => setBusy(false))
  }

  const beginEdit = (summary: AISummary): void => {
    setEditId(summary.id)
    setEditHighlights(summary.highlights.join('\n'))
    setEditMedication(summary.medicationAnalysis)
    setEditRecommendations(summary.recommendations.join('\n'))
  }

  const saveEdit = (): void => {
    if (!editId) return
    updateAISummary(editId, {
      highlights: editHighlights.split('\n').map((line) => line.trim()).filter(Boolean),
      medicationAnalysis: editMedication.trim(),
      recommendations: editRecommendations.split('\n').map((line) => line.trim()).filter(Boolean),
    })
    setEditId(null)
  }

  const isDraft = draft?.draftStatus === 'draft'
  const editing = editId !== null && editId === draft?.id

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-3 overflow-hidden">
      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="font-semibold">AI 智能小结</span>
            <span className="text-text-secondary">患者：{patientName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-text-secondary">周期</span>
            <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="rounded border border-border-default bg-bg-3 px-2 py-1 font-mono" />
            <span>→</span>
            <input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="rounded border border-border-default bg-bg-3 px-2 py-1 font-mono" />
            <button className="flex items-center gap-1 rounded border border-accent/60 bg-accent/10 px-3 py-1 transition-transform active:scale-95 disabled:opacity-50" disabled={busy} onClick={runGenerate}>
              {busy ? '生成中...' : '生成小结'}
            </button>
          </div>
        </div>
      </section>

      <div className="grid min-h-0 grid-cols-[1fr_280px] gap-3">
        <section className="min-h-0 overflow-auto rounded-md border border-border-default bg-bg-2 p-3 text-sm">
          {draft ? (
            <div className={`rounded-md border p-4 ${isDraft ? 'border-warn/60 bg-warn/5' : 'border-safe/60 bg-safe/5'}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">AI 生成小结（草稿）· {draft.modelVersion}</div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${isDraft ? 'bg-warn/20 text-warn' : 'bg-safe/20 text-safe'}`}>
                  {isDraft ? '草稿 · 待医生确认' : '✓ 医生已采纳'}
                </span>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs text-text-secondary">要点（每行一条）</div>
                    <textarea value={editHighlights} onChange={(event) => setEditHighlights(event.target.value)} className="h-24 w-full rounded border border-border-default bg-bg-3 px-2 py-1 text-xs" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-text-secondary">用药分析</div>
                    <textarea value={editMedication} onChange={(event) => setEditMedication(event.target.value)} className="h-16 w-full rounded border border-border-default bg-bg-3 px-2 py-1 text-xs" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-text-secondary">建议（每行一条）</div>
                    <textarea value={editRecommendations} onChange={(event) => setEditRecommendations(event.target.value)} className="h-20 w-full rounded border border-border-default bg-bg-3 px-2 py-1 text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded border border-safe/60 px-3 py-1 text-xs transition-transform active:scale-95" onClick={saveEdit}>保存修改</button>
                    <button className="rounded border border-border-default px-3 py-1 text-xs" onClick={() => setEditId(null)}>取消</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 font-semibold text-text-secondary">要点</div>
                    <ul className="list-disc space-y-1 pl-5 text-xs">
                      {draft.highlights.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>

                  <div>
                    <div className="mb-2 font-semibold text-text-secondary">模式检测</div>
                    <div className="space-y-2">
                      {draft.detectedPatterns.map((pattern) => (
                        <div key={pattern.pattern} className="rounded border border-border-subtle bg-bg-3/60 p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span>▸ {pattern.pattern}</span>
                            <span className="font-mono text-accent">置信度 {pattern.confidence}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-bg-0">
                            <div className="h-full rounded bg-accent" style={{ width: `${pattern.confidence}%` }} />
                          </div>
                          <div className="mt-1 text-text-secondary">建议：{pattern.suggestion}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 font-semibold text-text-secondary">用药分析</div>
                    <div className="text-xs">{draft.medicationAnalysis}</div>
                  </div>

                  <div>
                    <div className="mb-1 font-semibold text-text-secondary">建议</div>
                    <ul className="list-disc space-y-1 pl-5 text-xs">
                      {draft.recommendations.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>

                  {isDraft && (
                    <div className="rounded border border-warn/40 bg-warn/10 px-2 py-1.5 text-xs text-warn">
                      ⚠ 这是 AI 生成的草稿，必须由您审核确认后方可进入正式报告。
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button className="flex items-center gap-1 rounded border border-border-default px-2 py-1 text-xs transition-transform active:scale-95" onClick={() => beginEdit(draft)}>
                      <Edit3 size={13} /> 编辑
                    </button>
                    {isDraft && (
                      <button className="flex items-center gap-1 rounded border border-safe/60 bg-safe/10 px-2 py-1 text-xs text-safe transition-transform active:scale-95" onClick={() => approveAISummary(draft.id)}>
                        <Check size={13} /> 确认采纳
                      </button>
                    )}
                    <button className="flex items-center gap-1 rounded border border-danger/50 px-2 py-1 text-xs text-danger transition-transform active:scale-95" onClick={() => discardAISummary(draft.id)}>
                      <X size={13} /> 弃用
                    </button>
                    <button className="flex items-center gap-1 rounded border border-border-default px-2 py-1 text-xs transition-transform active:scale-95 disabled:opacity-50" disabled={busy} onClick={() => { discardAISummary(draft.id); runGenerate() }}>
                      <RefreshCw size={13} /> 重新生成
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-text-secondary">
              暂无小结。选择周期后点击「生成小结」基于事件、既往档案、量表与依从性数据生成结构化草稿。
            </div>
          )}
        </section>

        <section className="min-h-0 overflow-auto rounded-md border border-border-default bg-bg-2 p-3 text-sm">
          <div className="mb-2 font-semibold">历史小结</div>
          {history.length === 0 ? (
            <div className="text-xs text-text-secondary">暂无历史记录</div>
          ) : (
            <div className="space-y-2 text-xs">
              {history.map((summary) => (
                <div key={summary.id} className="rounded border border-border-default bg-bg-3/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{new Date(summary.generatedAt).toLocaleDateString('zh-CN')}</span>
                    <span className={summary.draftStatus === 'doctor_approved' ? 'text-safe' : 'text-warn'}>
                      {summary.draftStatus === 'doctor_approved' ? '医生已采纳' : '草稿'}
                    </span>
                  </div>
                  <div className="mt-1 text-text-secondary">{summary.highlights[0] ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
