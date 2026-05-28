import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'

export function AISummaryPage(): JSX.Element {
  const selectedDoctorPatientId = useAppStore((state) => state.selectedDoctorPatientId ?? 'p1')
  const generateAISummary = useAppStore((state) => state.generateAISummary)
  const approveAISummary = useAppStore((state) => state.approveAISummary)
  const aiSummaries = useAppStore((state) => state.aiSummaries[selectedDoctorPatientId] ?? [])
  const [busy, setBusy] = useState(false)

  const draft = useMemo(() => aiSummaries.find((summary) => summary.draftStatus === 'draft') ?? aiSummaries[0], [aiSummaries])

  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-3 overflow-auto">
      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>患者：{selectedDoctorPatientId} · 周期：近 7 天</div>
          <button
            className="rounded border border-accent/60 px-3 py-1 text-xs"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void generateAISummary(selectedDoctorPatientId, Date.now() - 7 * 24 * 3600 * 1000, Date.now()).finally(() => setBusy(false))
            }}
          >
            {busy ? '生成中...' : '生成小结'}
          </button>
        </div>
      </section>

      <section className="rounded-md border border-border-default bg-bg-2 p-3 text-sm">
        {draft ? (
          <div className={`rounded border p-3 ${draft.draftStatus === 'draft' ? 'border-warn/60 bg-warn/5' : 'border-safe/60 bg-safe/5'}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">AI 生成小结（{draft.modelVersion}）</div>
              <span className="text-xs">状态：{draft.draftStatus === 'draft' ? '草稿' : '医生已确认'}</span>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              {draft.highlights.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <div className="mt-2 text-xs">用药分析：{draft.medicationAnalysis}</div>
            <div className="mt-2 flex gap-2">
              <button className="rounded border border-border-default px-2 py-1 text-xs">✎ 编辑</button>
              <button className="rounded border border-safe/60 px-2 py-1 text-xs" onClick={() => approveAISummary(draft.id)}>✓ 确认采纳</button>
            </div>
          </div>
        ) : (
          <div className="text-text-secondary">暂无小结，请先生成。</div>
        )}
      </section>
    </div>
  )
}
