import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { SeizureHeatmap } from '../../components/charts/SeizureHeatmap'
import { useAppStore } from '../../store'
import type { HeatmapCell } from '../../types/signal'

const REPORT_MODULE_OPTIONS = [
  { key: 'stats', label: '发作次数统计' },
  { key: 'heatmap', label: '发作时间分布（热力图截图）' },
  { key: 'summary', label: '多模态摘要' },
  { key: 'adherence', label: '服药依从性评估' },
  { key: 'note', label: '医生备注' },
  { key: 'appendix', label: '完整波形附录' },
] as const
type ReportModuleKey = (typeof REPORT_MODULE_OPTIONS)[number]['key']

function buildPreviewCells(patientSeed: string): HeatmapCell[] {
  let seed = patientSeed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 13
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const cells: HeatmapCell[] = []
  const now = new Date()
  for (let day = 0; day < 7; day++) {
    const d = new Date(now)
    d.setDate(now.getDate() - day)
    const key = d.toISOString().slice(0, 10)
    for (let hour = 0; hour < 24; hour++) {
      const seizureLevel = rand() > 0.94 ? Math.ceil(rand() * 4) : 0
      const intensity = seizureLevel > 0 ? 0 : rand() > 0.84 ? Math.ceil(rand() * 4) : 0
      cells.push({
        date: key,
        hour,
        intensity,
        seizureLevel,
        events:
          seizureLevel || intensity
            ? [
                {
                  type: seizureLevel > 0 ? 'seizure' : 'subclinical',
                  durationSec: 30 + Math.round(rand() * 200),
                  peakIntensity: Math.max(seizureLevel, intensity),
                  factors: [rand() > 0.5 ? '漏服药' : '睡眠不足'],
                },
              ]
            : [],
        missedMed: rand() > 0.85,
        sleepDeprived: rand() > 0.8,
      })
    }
  }
  return cells
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function ReportGenerator(): JSX.Element {
  const pushAlert = useAppStore((state) => state.pushAlert)
  const patients = useAppStore((state) => state.patients)
  const events = useAppStore((state) => state.events)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('all')
  const [reportCycle, setReportCycle] = useState<'week' | 'month'>('week')
  const [rangeDays, setRangeDays] = useState(7)
  const [includeSignature, setIncludeSignature] = useState(true)
  const [selectedModules, setSelectedModules] = useState<Record<ReportModuleKey, boolean>>({
    stats: true,
    heatmap: true,
    summary: true,
    adherence: true,
    note: true,
    appendix: false,
  })
  const initialEnd = new Date()
  const initialStart = new Date(initialEnd)
  initialStart.setDate(initialEnd.getDate() - 6)
  const [startDate, setStartDate] = useState(initialStart.toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(initialEnd.toISOString().slice(0, 10))
  const [doctorNote, setDoctorNote] = useState('')
  const [lastExportPath, setLastExportPath] = useState('')

  const exporting = progress > 0 && progress < 100

  // Real stats computed from store events within the selected date range
  const reportStats = useMemo(() => {
    const startMs = new Date(startDate).getTime()
    const endMs = new Date(endDate).getTime() + 86400000
    const periodMs = endMs - startMs
    const prevStartMs = startMs - periodMs

    const current = events.filter(
      (e) => e.riskState === 'seizure' && e.timestamp >= startMs && e.timestamp < endMs,
    )
    const previous = events.filter(
      (e) => e.riskState === 'seizure' && e.timestamp >= prevStartMs && e.timestamp < startMs,
    )

    const totalCount = current.length
    const countDiff = totalCount - previous.length

    const withDuration = current.filter((e) => e.durationSec !== undefined && (e.durationSec ?? 0) > 0)
    const avgDurationSec =
      withDuration.length > 0
        ? Math.round(withDuration.reduce((sum, e) => sum + (e.durationSec ?? 0), 0) / withDuration.length)
        : null

    const sorted = current.map((e) => e.timestamp).sort((a, b) => a - b)
    let maxGapDays = 0
    for (let i = 1; i < sorted.length; i++) {
      const gap = ((sorted[i] ?? 0) - (sorted[i - 1] ?? 0)) / (24 * 3600 * 1000)
      if (gap > maxGapDays) maxGapDays = gap
    }

    return {
      totalCount,
      countDiff,
      avgDurationSec,
      maxGapDays: Number(maxGapDays.toFixed(1)),
    }
  }, [events, startDate, endDate])

  // Adherence computed from medication-type events in the date range
  const adherenceStats = useMemo(() => {
    const startMs = new Date(startDate).getTime()
    const endMs = new Date(endDate).getTime() + 86400000
    const days = Math.max(1, Math.round((endMs - startMs) / 86400000))
    const expected = days * 3
    const taken = events.filter((e) => e.type === 'medication' && e.timestamp >= startMs && e.timestamp < endMs).length
    const percent = taken > 0 ? Math.round((taken / expected) * 100) : null
    return { taken, expected, percent }
  }, [events, startDate, endDate])

  // 7-day heatmap cells for the inline preview
  const previewCells = useMemo<HeatmapCell[]>(
    () => buildPreviewCells(selectedPatientId),
    [selectedPatientId],
  )

  const exportPdf = async (): Promise<void> => {
    if (exporting) return
    let unsubscribeProgress: (() => void) | undefined
    try {
      if (!window.epiphany?.exportPdf || !window.epiphany?.onExportProgress) {
        throw new Error('导出接口不可用')
      }
      const modules = REPORT_MODULE_OPTIONS.filter((option) => selectedModules[option.key]).map((option) => option.label)
      unsubscribeProgress = window.epiphany.onExportProgress((payload) => {
        setStage(payload.stage)
        setProgress(payload.progress)
      })
      const selectedStart = new Date(startDate)
      const selectedEnd = new Date(endDate)
      const diffDays = Math.max(1, Math.round((selectedEnd.getTime() - selectedStart.getTime()) / (24 * 3600 * 1000)) + 1)
      const result = await window.epiphany.exportPdf({
        fileName: `report-${Date.now()}.pdf`,
        modules,
        note: doctorNote || '无',
        patientId: selectedPatientId,
        rangeDays: diffDays || rangeDays,
        includeSignature,
        reportCycle,
        startDate,
        endDate,
      })
      unsubscribeProgress()
      unsubscribeProgress = undefined
      setLastExportPath(result.filePath)
      pushAlert({
        id: `report-success-${Date.now()}`,
        type: 'success',
        title: '导出成功',
        message: `报告已生成：${result.filePath}`,
        timestamp: Date.now(),
      })
      window.setTimeout(() => {
        setProgress(0)
        setStage('')
      }, 900)
    } catch (error) {
      unsubscribeProgress?.()
      const message = error instanceof Error ? error.message : '导出失败'
      setProgress(0)
      setStage('')
      pushAlert({
        id: `report-error-${Date.now()}`,
        type: 'error',
        title: '导出失败',
        message,
        timestamp: Date.now(),
      })
    }
  }

  const previewItems = REPORT_MODULE_OPTIONS.filter((option) => selectedModules[option.key]).map((option) => option.label)
  const selectedPatientName = useMemo(() => {
    if (selectedPatientId === 'all') return '全部患者（汇总）'
    return patients.find((patient) => patient.id === selectedPatientId)?.name ?? '未知患者'
  }, [patients, selectedPatientId])
  const enabledModules = REPORT_MODULE_OPTIONS.filter((option) => selectedModules[option.key])
  const stageStatus = useMemo(
    () => [
      { name: '数据收集', done: progress >= 20 },
      { name: '图表渲染', done: progress >= 40 },
      { name: 'PDF 组装', done: progress >= 80 },
      { name: '完成', done: progress >= 100 },
    ],
    [progress],
  )
  const reportSections = [
    { key: 'header', title: '灵犀妙探 · 医疗报告', enabled: true, content: `${selectedPatientName} ｜ ${startDate} 至 ${endDate}` },
    { key: 'stats', title: '发作次数统计', enabled: selectedModules.stats, content: `周期：${reportCycle === 'week' ? '周报' : '月报'} · 近 ${rangeDays} 天` },
    { key: 'heatmap', title: '发作时间分布（热力图）', enabled: selectedModules.heatmap, content: '包含热点时段缩略图与因素提示' },
    { key: 'summary', title: '多模态特征摘要', enabled: selectedModules.summary, content: 'EEG / NIRS / EMG 核心指标与风险趋势' },
    { key: 'adherence', title: '服药依从性评估', enabled: selectedModules.adherence, content: '漏服趋势、风险相关性与改进建议' },
    { key: 'note', title: '医生备注', enabled: selectedModules.note, content: doctorNote.trim() || '无备注' },
    { key: 'appendix', title: '完整波形附录', enabled: selectedModules.appendix, content: '附录包含关键时段波形与注解摘要' },
  ]

  return (
    <div className="grid h-full grid-cols-[40%_1fr] gap-3">
      {exporting && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-[420px] rounded-md border border-border-default bg-bg-2 p-4">
            <div className="text-sm">正在生成报告... {stage} · {progress}%</div>
            <div className="mt-2 h-2 rounded-full bg-bg-3">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">报告生成器</h2>
        <div className="mt-3 space-y-3 text-sm">
          <label className="block">
            患者范围
            <select className="mt-1 w-full rounded border border-border-default bg-bg-3 p-2" value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
              <option value="all">全部患者（汇总）</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            报告周期
            <div className="mt-1 flex gap-2 text-xs">
              <label className="flex items-center gap-1 rounded border border-border-default bg-bg-3 px-2 py-1">
                <input
                  checked={reportCycle === 'week'}
                  onChange={() => {
                    setReportCycle('week')
                    setRangeDays(7)
                  }}
                  type="radio"
                />
                周报
              </label>
              <label className="flex items-center gap-1 rounded border border-border-default bg-bg-3 px-2 py-1">
                <input
                  checked={reportCycle === 'month'}
                  onChange={() => {
                    setReportCycle('month')
                    setRangeDays(30)
                  }}
                  type="radio"
                />
                月报
              </label>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              开始日期
              <input className="mt-1 w-full rounded border border-border-default bg-bg-3 p-2" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="block">
              结束日期
              <input className="mt-1 w-full rounded border border-border-default bg-bg-3 p-2" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
          </div>
          <label className="block">
            统计区间（天）
            <input className="mt-1 w-full rounded border border-border-default bg-bg-3 p-2" type="number" min={1} max={90} value={rangeDays} onChange={(event) => setRangeDays(Number(event.target.value))} />
          </label>
          {REPORT_MODULE_OPTIONS.map((option) => (
            <label key={option.key} className="flex items-center justify-between">
              {option.label}
              <input
                checked={selectedModules[option.key]}
                onChange={(event) =>
                  setSelectedModules((prev) => ({
                    ...prev,
                    [option.key]: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </label>
          ))}
          <label className="flex items-center justify-between">
            医师签名
            <input checked={includeSignature} onChange={(event) => setIncludeSignature(event.target.checked)} type="checkbox" />
          </label>
          <textarea
            className="h-24 w-full rounded border border-border-default bg-bg-3 p-2"
            placeholder="医生备注"
            value={doctorNote}
            onChange={(event) => setDoctorNote(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded border border-border-default bg-bg-3 px-3 py-2 transition-transform active:scale-95"
              onClick={() =>
                pushAlert({
                  id: `preview-refresh-${Date.now()}`,
                  type: 'info',
                  title: '预览已刷新',
                  message: `当前预览：${selectedPatientName} · ${enabledModules.length} 个章节`,
                  timestamp: Date.now(),
                })
              }
            >
              预览报告
            </button>
            <button className="rounded bg-accent px-3 py-2 disabled:opacity-60" onClick={() => void exportPdf()} disabled={exporting || enabledModules.length === 0}>
              {exporting ? '导出中...' : '导出 PDF'}
            </button>
          </div>
          <div className="rounded border border-border-default bg-bg-3 p-2 text-xs text-text-secondary">
            进度分段：
            <div className="mt-1 flex flex-wrap gap-1">
              {stageStatus.map((item) => (
                <span key={item.name} className={`rounded px-2 py-0.5 ${item.done ? 'bg-safe/20 text-safe' : 'bg-bg-2'}`}>
                  {item.name}
                </span>
              ))}
            </div>
            {stage && <div className="mt-1">当前阶段：{stage}</div>}
          </div>
        </div>
      </section>
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h3 className="font-semibold">预览区</h3>
        <div className="mt-3 h-[80%] overflow-auto rounded border border-border-subtle bg-bg-3 p-4 text-sm text-text-secondary">
          <div className="mx-auto w-full max-w-[720px] space-y-0 rounded border border-border-default bg-white/5 font-sans">
            {/* Document Header */}
            <div className="border-b border-border-default bg-bg-2 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-lg font-bold text-text-primary">灵犀妙探 · 医疗报告</div>
                  <div className="mt-0.5 text-xs text-text-secondary">智能癫痫全周期监测平台</div>
                </div>
                <div className="text-right text-xs text-text-secondary">
                  <div>患者：{selectedPatientName}</div>
                  <div>报告期：{startDate} 至 {endDate}</div>
                  <div>生成时间：{new Date().toLocaleString()}</div>
                </div>
              </div>
            </div>
            {/* Sections */}
            {reportSections.filter((s) => s.key !== 'header').map((section) => (
              <motion.div
                key={section.key}
                animate={{ opacity: section.enabled ? 1 : 0.2 }}
                transition={{ duration: 0.25 }}
                className="border-b border-border-subtle px-6 py-4 last:border-0"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-0.5 w-4 rounded bg-accent" />
                  <span className="text-sm font-semibold text-text-primary">{section.title}</span>
                </div>
                {section.key === 'stats' && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: '总发作次数',
                        value: `${reportStats.totalCount} 次`,
                        sub: reportStats.totalCount === 0 ? '期间无记录' : `较上期 ${reportStats.countDiff >= 0 ? `↑${reportStats.countDiff}` : `↓${Math.abs(reportStats.countDiff)}`}`,
                      },
                      {
                        label: '平均发作时长',
                        value: reportStats.avgDurationSec !== null ? formatDuration(reportStats.avgDurationSec) : '--',
                        sub: reportStats.avgDurationSec !== null ? '发作时长统计' : '暂无时长记录',
                      },
                      {
                        label: '最长无发作间隔',
                        value: reportStats.maxGapDays > 0 ? `${reportStats.maxGapDays} 天` : '--',
                        sub: reportStats.maxGapDays > 0 ? '本期最长间隔' : '暂无间隔数据',
                      },
                    ].map((card) => (
                      <div key={card.label} className="rounded border border-border-default bg-bg-3 p-2 text-center">
                        <div className="font-mono text-lg text-text-primary">{card.value}</div>
                        <div className="text-xs text-text-secondary">{card.label}</div>
                        <div className="text-[10px] text-text-muted">{card.sub}</div>
                      </div>
                    ))}
                  </div>
                )}
                {section.key === 'heatmap' && (
                  <div className="pointer-events-none overflow-hidden rounded border border-border-subtle">
                    <SeizureHeatmap cells={previewCells} />
                  </div>
                )}
                {section.key === 'adherence' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">本期依从性</span>
                      <span className={`font-mono ${adherenceStats.percent !== null ? 'text-safe' : 'text-text-muted'}`}>
                        {adherenceStats.percent !== null ? `${adherenceStats.percent}%` : '暂无服药记录'}
                      </span>
                    </div>
                    {adherenceStats.percent !== null && (
                      <>
                        <div className="h-2 rounded-full bg-bg-3">
                          <div className="h-full rounded-full bg-safe transition-all" style={{ width: `${adherenceStats.percent}%` }} />
                        </div>
                        <div className="text-[10px] text-text-muted">{adherenceStats.taken}/{adherenceStats.expected} 次（每日 3 次）</div>
                      </>
                    )}
                    {adherenceStats.percent === null && (
                      <div className="text-[10px] text-text-muted">{section.content}</div>
                    )}
                  </div>
                )}
                {(section.key === 'summary' || section.key === 'note' || section.key === 'appendix') && (
                  <div className="text-xs text-text-secondary">{section.content}</div>
                )}
              </motion.div>
            ))}
            {includeSignature && (
              <div className="px-6 py-4 text-right text-xs text-text-muted">
                <div>主治医师签名：_______________</div>
                <div className="mt-1">日期：{new Date().toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 rounded border border-border-default bg-bg-3 p-2 text-xs text-text-secondary">
          <div>本次导出章节：</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {previewItems.length === 0 ? <li>未勾选导出模块</li> : previewItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        {progress > 0 && !exporting && (
          <div className="mt-3">
            <div className="text-sm">报告进度：{stage} · {progress}%</div>
            <div className="mt-1 h-2 rounded-full bg-bg-3">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {lastExportPath && (
          <div className="mt-3 rounded border border-safe/40 bg-safe/10 p-2 text-xs text-safe">
            <div>已导出到：{lastExportPath}</div>
            <button
              className="mt-2 rounded border border-safe/60 px-2 py-1"
              onClick={() => void window.epiphany?.showItemInFolder?.(lastExportPath)}
            >
              在资源管理器中显示
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
