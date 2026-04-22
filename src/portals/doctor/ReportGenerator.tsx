import { useState } from 'react'

export function ReportGenerator(): JSX.Element {
  const [progress, setProgress] = useState(0)

  const exportPdf = async (): Promise<void> => {
    setProgress(20)
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    setProgress(40)
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    setProgress(80)
    await new Promise((resolve) => window.setTimeout(resolve, 400))
    setProgress(100)
    await window.epiphany?.exportPdf(`report-${Date.now()}.pdf`)
    window.setTimeout(() => setProgress(0), 900)
  }

  return (
    <div className="grid h-full grid-cols-[40%_1fr] gap-3">
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">报告生成器</h2>
        <div className="mt-3 space-y-3 text-sm">
          <label className="flex items-center justify-between">发作次数统计 <input defaultChecked type="checkbox" /></label>
          <label className="flex items-center justify-between">热力图截图 <input defaultChecked type="checkbox" /></label>
          <label className="flex items-center justify-between">多模态摘要 <input defaultChecked type="checkbox" /></label>
          <textarea className="h-24 w-full rounded border border-border-default bg-bg-3 p-2" placeholder="医生备注" />
          <button className="w-full rounded bg-accent px-3 py-2" onClick={() => void exportPdf()}>导出 PDF</button>
        </div>
      </section>
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h3 className="font-semibold">预览区</h3>
        <div className="mt-3 h-[80%] rounded border border-border-subtle bg-bg-3 p-4 text-sm text-text-secondary">报告内容预览（深色文档样式）</div>
        {progress > 0 && (
          <div className="mt-3">
            <div className="text-sm">正在生成报告... {progress}%</div>
            <div className="mt-1 h-2 rounded-full bg-bg-3">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
