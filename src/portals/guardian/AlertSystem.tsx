export function AlertSystem(): JSX.Element {
  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">报警策略</h2>
        <div className="mt-3 space-y-3 text-sm">
          <label className="flex items-center justify-between">黄色预警 Toast <input type="checkbox" defaultChecked /></label>
          <label className="flex items-center justify-between">红色覆盖报警 <input type="checkbox" defaultChecked /></label>
          <label className="flex items-center justify-between">短信通知 <input type="checkbox" defaultChecked /></label>
          <label className="flex items-center justify-between">电话通知 <input type="checkbox" /></label>
        </div>
      </section>
      <section className="rounded-md border border-border-default bg-bg-2 p-4">
        <h2 className="font-semibold">报警队列</h2>
        <div className="mt-3 space-y-2 text-sm text-text-secondary">
          <div>10:23 Warning · 自动关闭 4s</div>
          <div>11:02 Seizure · 需人工确认</div>
        </div>
      </section>
    </div>
  )
}
