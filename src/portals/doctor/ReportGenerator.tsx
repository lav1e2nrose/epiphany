import { useMemo, useState } from 'react'
import { useAppStore } from '../../store'

const REPORT_MODULE_OPTIONS = [
  { key: 'stats', label: '发作次数统计' },
  { key: 'heatmap', label: '热力图截图' },
  { key: 'summary', label: '多模态摘要' },
] as const
type ReportModuleKey = (typeof REPORT_MODULE_OPTIONS)[number]['key']

export function ReportGenerator(): JSX.Element {
  const pushAlert = useAppStore((state) => state.pushAlert)
  const patients = useAppStore((state) => state.patients)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('all')
  const [rangeDays, setRangeDays] = useState(7)
  const [includeSignature, setIncludeSignature] = useState(true)
  const [selectedModules, setSelectedModules] = useState<Record<ReportModuleKey, boolean>>({
    stats: true,
    heatmap: true,
    summary: true,
  })
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
      const result = await window.epiphany.exportPdf({
        fileName: `report-${Date.now()}.pdf`,
        modules,
        note: doctorNote,
        patientId: selectedPatientId,
        rangeDays,
        includeSignature,
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

  return (
    <div className="grid h-full grid-cols-[40%_1fr] gap-3">
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
          <button className="w-full rounded bg-accent px-3 py-2 disabled:opacity-60" onClick={() => void exportPdf()} disabled={exporting}>
            {exporting ? '导出中...' : '导出 PDF'}
          </button>
        </div>
      </section>
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h3 className="font-semibold">预览区</h3>
        <div className="mt-3 h-[80%] rounded border border-border-subtle bg-bg-3 p-4 text-sm text-text-secondary">
          <div className="font-medium text-text-primary">本次导出内容</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {previewItems.length === 0 ? <li>未勾选导出模块</li> : previewItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div className="mt-4 font-medium text-text-primary">筛选条件</div>
          <div className="mt-1 rounded border border-border-default bg-bg-2 p-2">
            <div>患者：{selectedPatientName}</div>
            <div>区间：最近 {rangeDays} 天</div>
            <div>签名：{includeSignature ? '包含' : '不包含'}</div>
          </div>
          <div className="mt-4 font-medium text-text-primary">医生备注</div>
          <div className="mt-1 whitespace-pre-wrap rounded border border-border-default bg-bg-2 p-2">
            {doctorNote.trim() || '无'}
          </div>
        </div>
        {progress > 0 && (
          <div className="mt-3">
            <div className="text-sm">正在生成报告... {stage} · {progress}%</div>
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
