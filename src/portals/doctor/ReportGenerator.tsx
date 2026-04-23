import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'

const REPORT_MODULE_OPTIONS = [
  { key: 'stats', label: '发作次数统计' },
  { key: 'heatmap', label: '发作时间分布（热力图截图）' },
  { key: 'summary', label: '多模态摘要' },
  { key: 'adherence', label: '服药依从性评估' },
  { key: 'note', label: '医生备注' },
  { key: 'appendix', label: '完整波形附录' },
] as const
type ReportModuleKey = (typeof REPORT_MODULE_OPTIONS)[number]['key']

export function ReportGenerator(): JSX.Element {
  const pushAlert = useAppStore((state) => state.pushAlert)
  const patients = useAppStore((state) => state.patients)
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
          <div className="mx-auto w-full max-w-[720px] rounded-md border border-border-default bg-bg-1 p-4">
            {reportSections.map((section) => (
              <motion.div key={section.key} animate={{ opacity: section.enabled ? 1 : 0.35 }} transition={{ duration: 0.2 }} className="mb-3 rounded border border-border-subtle bg-bg-2 p-3">
                <div className="font-medium text-text-primary">{section.title}</div>
                <div className="mt-1 whitespace-pre-wrap text-xs">{section.content}</div>
              </motion.div>
            ))}
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
